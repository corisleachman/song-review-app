import { supabaseServer } from '@/lib/supabaseServer';
import type { AuthenticatedUser } from '@/lib/currentUser';

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

  const { data: existingMembership, error: membershipLookupError } = await supabaseServer
    .from('account_members')
    .select('account_id, user_id, role, joined_at')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipLookupError) throw membershipLookupError;

  let membership = existingMembership as MembershipRecord | null;

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
  }

  const { data: workspace, error: workspaceError } = await supabaseServer
    .from('accounts')
    .select('id, name, slug, created_by_user_id, created_at, updated_at')
    .eq('id', membership.account_id)
    .single();

  if (workspaceError) throw workspaceError;

  return {
    user,
    profile: profile as ProfileRecord,
    workspace: workspace as WorkspaceRecord,
    membership,
  };
}
