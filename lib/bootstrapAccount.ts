import { supabaseServer } from '@/lib/supabaseServer';
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

interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string | null;
  plan: AccountPlan;
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

async function loadWorkspace(accountId: string): Promise<WorkspaceRecord> {
  const workspaceWithPlan = await supabaseServer
    .from('accounts')
    .select('id, name, slug, plan, created_by_user_id, created_at, updated_at')
    .eq('id', accountId)
    .single();

  if (!workspaceWithPlan.error) {
    return {
      ...(workspaceWithPlan.data as Omit<WorkspaceRecord, 'plan'> & { plan?: string | null }),
      plan: normalizeAccountPlan(workspaceWithPlan.data?.plan),
    };
  }

  if (!isMissingPlanColumnError(workspaceWithPlan.error)) {
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
    plan: 'free',
  };
}

export async function bootstrapAccountForUser(user: AuthenticatedUser): Promise<BootstrapResult> {
  const { data: profile, error: profileError } = await supabaseServer
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email,
        display_name: user.displayName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('id, email, display_name, created_at, updated_at')
    .single();

  if (profileError) throw profileError;

  const activeWorkspaceId = await readActiveWorkspaceCookie();
  const activeWorkspaceMembership = activeWorkspaceId
    ? await findValidActiveWorkspaceMembership(user.id, activeWorkspaceId)
    : null;

  const { data: existingOwnerMembership, error: membershipLookupError } = await supabaseServer
    .from('account_members')
    .select('account_id, user_id, role, joined_at')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipLookupError) throw membershipLookupError;

  let membership = (activeWorkspaceMembership ?? existingOwnerMembership) as MembershipRecord | null;

  if (!membership && !existingOwnerMembership) {
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
  }

  if (!membership) {
    throw new Error('No workspace membership found for authenticated user.');
  }

  const workspace = await loadWorkspace(membership.account_id);

  return {
    user,
    profile: profile as ProfileRecord,
    workspace,
    membership,
  };
}
