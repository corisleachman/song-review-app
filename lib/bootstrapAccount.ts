import { supabaseServer } from '@/lib/supabaseServer';
import { attributeReferralOnSignup, REFERRAL_COOKIE_NAME } from '@/lib/referrals';
import type { AuthenticatedUser } from '@/lib/currentUser';
import { normalizeAccountPlan, isMissingPlanColumnError, type AccountPlan } from '@/lib/plans';
import { findValidActiveWorkspaceMembership, readActiveWorkspaceCookie } from '@/lib/activeWorkspace';

interface ProfileRecord {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

type NotificationMode = 'all_members' | 'owner_only';

function normalizeNotificationMode(value: unknown): NotificationMode {
  if (value === 'owner_only') return 'owner_only';
  return 'all_members';
}

interface WorkspaceRecord {
  id: string;
  name: string;
  image_url: string | null;
  slug: string | null;
  plan: AccountPlan;
  notification_mode: NotificationMode;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

interface MembershipRecord {
  account_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface BootstrapResult {
  user: AuthenticatedUser;
  profile: ProfileRecord;
  workspace: WorkspaceRecord;
  membership: MembershipRecord;
}

function getWorkspaceName(user: AuthenticatedUser) {
  const base = user.displayName?.trim() || user.email?.split('@')[0]?.trim() || 'My';
  return `${base}'s Workspace`;
}

function chooseDefaultMembership(memberships: MembershipRecord[]) {
  const memberWorkspace = memberships.find(membership => membership.role === 'member');
  if (memberWorkspace) return memberWorkspace;

  return memberships.find(membership => membership.role === 'owner') ?? null;
}

function isMissingImageColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const message = 'message' in error && typeof error.message === 'string'
    ? error.message.toLowerCase()
    : '';

  const details = 'details' in error && typeof error.details === 'string'
    ? error.details.toLowerCase()
    : '';

  return (
    message.includes('image_url')
    && (
      message.includes('column')
      || details.includes('column')
      || message.includes('schema cache')
    )
  );
}

async function loadWorkspace(accountId: string): Promise<WorkspaceRecord> {
  const workspaceWithPlan = await supabaseServer
    .from('accounts')
    .select('id, name, image_url, slug, plan, notification_mode, created_by_user_id, created_at, updated_at')
    .eq('id', accountId)
    .single();

  if (!workspaceWithPlan.error) {
    return {
      ...(workspaceWithPlan.data as Omit<WorkspaceRecord, 'plan'> & { plan?: string | null }),
      plan: normalizeAccountPlan(workspaceWithPlan.data?.plan),
      notification_mode: normalizeNotificationMode((workspaceWithPlan.data as Record<string, unknown>)?.notification_mode),
    };
  }

  if (isMissingImageColumnError(workspaceWithPlan.error)) {
    const workspaceWithoutImage = await supabaseServer
      .from('accounts')
      .select('id, name, slug, plan, created_by_user_id, created_at, updated_at')
      .eq('id', accountId)
      .single();

    if (!workspaceWithoutImage.error) {
      return {
        ...(workspaceWithoutImage.data as Omit<WorkspaceRecord, 'image_url' | 'plan'> & { plan?: string | null }),
        image_url: null,
        plan: normalizeAccountPlan(workspaceWithoutImage.data?.plan),
        notification_mode: normalizeNotificationMode((workspaceWithoutImage.data as Record<string, unknown>)?.notification_mode),
      };
    }

    if (!isMissingPlanColumnError(workspaceWithoutImage.error)) {
      throw workspaceWithoutImage.error;
    }
  } else if (!isMissingPlanColumnError(workspaceWithPlan.error)) {
    throw workspaceWithPlan.error;
  }

  const workspaceWithoutPlan = await supabaseServer
    .from('accounts')
    .select('id, name, slug, created_by_user_id, created_at, updated_at')
    .eq('id', accountId)
    .single();

  if (workspaceWithoutPlan.error) throw workspaceWithoutPlan.error;

  return {
    ...(workspaceWithoutPlan.data as Omit<WorkspaceRecord, 'plan'>),
    image_url: null,
    plan: 'free',
    notification_mode: 'all_members',
  };
}

export async function bootstrapAccountForUser(user: AuthenticatedUser): Promise<BootstrapResult> {
  const profilePayload: Record<string, unknown> = {
    id: user.id,
    email: user.email,
    display_name: user.displayName,
    updated_at: new Date().toISOString(),
  };
  // Persist the Google profile photo when we have one (never overwrite with null).
  if (user.avatarUrl) {
    profilePayload.avatar_url = user.avatarUrl;
  }

  const { data: profile, error: profileError } = await supabaseServer
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' })
    .select('id, email, display_name, created_at, updated_at')
    .single();

  if (profileError) throw profileError;

  const activeWorkspaceId = await readActiveWorkspaceCookie();
  const activeWorkspaceMembership = activeWorkspaceId
    ? await findValidActiveWorkspaceMembership(user.id, activeWorkspaceId)
    : null;

  const { data: existingMemberships, error: membershipLookupError } = await supabaseServer
    .from('account_members')
    .select('account_id, user_id, role, joined_at')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .returns<MembershipRecord[]>();

  if (membershipLookupError) throw membershipLookupError;

  let newAccountId: string | null = null;
  let membership = (activeWorkspaceMembership as MembershipRecord | null)
    ?? chooseDefaultMembership(existingMemberships ?? []);

  if (!membership) {
    const { data: account, error: accountError } = await supabaseServer
      .from('accounts')
      .insert([
        {
          created_by_user_id: user.id,
          name: getWorkspaceName(user),
        },
      ])
      .select('id')
      .single();

    if (accountError) throw accountError;

    const { data: createdMembership, error: createMembershipError } = await supabaseServer
      .from('account_members')
      .insert([
        {
          account_id: account.id,
          user_id: user.id,
          role: 'owner',
        },
      ])
      .select('account_id, user_id, role, joined_at')
      .single();

    if (createMembershipError) throw createMembershipError;
    membership = createdMembership as MembershipRecord;
    newAccountId = account.id;
  }

  if (!membership) {
    throw new Error('No workspace membership found for authenticated user.');
  }

  const workspace = await loadWorkspace(membership.account_id);

  // ── Referral attribution (best-effort, non-blocking) ───────────────────────
  // Only runs when a brand-new account was just created (first-ever sign-in).
  // Reads the tsr_ref cookie set by /r/[code] and writes a referrals row.
  if (newAccountId) {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const refCode = cookieStore.get(REFERRAL_COOKIE_NAME)?.value ?? null;
      if (refCode) {
        void attributeReferralOnSignup({
          referralCode:      refCode,
          referredUserId:    profile.id,
          referredAccountId: newAccountId,
        });
        cookieStore.delete(REFERRAL_COOKIE_NAME);
      }
    } catch (refErr) {
      console.error('[bootstrap] Referral attribution error (non-fatal):', refErr);
    }
  }

  return {
    user,
    profile: profile as ProfileRecord,
    workspace,
    membership,
  };
}
