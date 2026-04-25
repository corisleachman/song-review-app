import { supabaseServer } from '@/lib/supabaseServer';

export interface WorkspaceMember {
  userId: string;
  email: string | null;
  displayName: string;
  role: 'owner' | 'admin' | 'member';
}

function getFallbackDisplayName(email: string | null | undefined) {
  const trimmed = email?.trim() ?? '';
  if (!trimmed) return 'Collaborator';
  return trimmed.split('@')[0]?.trim() || 'Collaborator';
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data: memberships, error: membershipsError } = await supabaseServer
    .from('account_members')
    .select('user_id, role')
    .eq('account_id', workspaceId);

  if (membershipsError) throw membershipsError;

  const userIds = Array.from(new Set((memberships ?? []).map(member => member.user_id).filter(Boolean)));

  if (userIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabaseServer
    .from('profiles')
    .select('id, email, display_name')
    .in('id', userIds);

  if (profilesError) throw profilesError;

  const profileById = new Map((profiles ?? []).map(profile => [profile.id, profile]));

  return userIds
    .map(userId => {
      const membership = (memberships ?? []).find(member => member.user_id === userId);
      const profile = profileById.get(userId);

      return {
        userId,
        email: profile?.email ?? null,
        displayName: profile?.display_name?.trim() || getFallbackDisplayName(profile?.email),
        role: (membership?.role ?? 'member') as WorkspaceMember['role'],
      } satisfies WorkspaceMember;
    })
    .sort((left, right) => {
      if (left.role !== right.role) {
        if (left.role === 'owner') return -1;
        if (right.role === 'owner') return 1;
      }

      return left.displayName.localeCompare(right.displayName);
    });
}

export async function findWorkspaceMembershipByUserId(workspaceId: string, userId: string) {
  const { data, error } = await supabaseServer
    .from('account_members')
    .select('account_id, user_id, role, joined_at')
    .eq('account_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function deleteWorkspaceMembershipByUserId(workspaceId: string, userId: string) {
  const { error } = await supabaseServer
    .from('account_members')
    .delete()
    .eq('account_id', workspaceId)
    .eq('user_id', userId);

  if (error) throw error;
}
