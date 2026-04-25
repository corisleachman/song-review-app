import { supabaseServer } from '@/lib/supabaseServer';
import { listWorkspaceMembers } from '@/lib/workspaceMembers';

export interface AccountInvite {
  id: string;
  account_id: string;
  email: string;
  normalized_email: string;
  role: 'member';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  invite_token: string;
  invited_by_user_id: string;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export type PublicInviteState = 'pending' | 'accepted' | 'revoked' | 'expired' | 'invalid';

export interface PublicInviteView {
  email: string;
  role: 'member';
  workspace: {
    name: string;
  };
  invitedBy: {
    displayName: string;
  };
  expiresAt: string;
  createdAt: string;
}

export interface AcceptedInviteWorkspace {
  id: string;
  name: string;
}

const ACCOUNT_INVITE_SELECT = `
  id,
  account_id,
  email,
  normalized_email,
  role,
  status,
  invite_token,
  invited_by_user_id,
  accepted_by_user_id,
  accepted_at,
  revoked_at,
  expires_at,
  created_at,
  updated_at
`;

export function normalizeInviteEmail(input: string) {
  const email = input.trim();
  const normalizedEmail = email.toLowerCase();

  return {
    email,
    normalizedEmail,
  };
}

function getFallbackDisplayName(email: string | null | undefined) {
  const trimmed = email?.trim() ?? '';
  if (!trimmed) return 'Workspace owner';
  return trimmed.split('@')[0]?.trim() || 'Workspace owner';
}

export function getInviteState(invite: Pick<AccountInvite, 'status' | 'expires_at'>): PublicInviteState {
  if (invite.status === 'accepted') return 'accepted';
  if (invite.status === 'revoked') return 'revoked';
  if (invite.status === 'expired') return 'expired';

  const expiresAt = new Date(invite.expires_at).getTime();
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
    return 'expired';
  }

  return 'pending';
}

export function isValidInviteEmail(input: string) {
  const { email } = normalizeInviteEmail(input);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function listWorkspaceInvites(workspaceId: string): Promise<AccountInvite[]> {
  const { data, error } = await supabaseServer
    .from('account_invites')
    .select(ACCOUNT_INVITE_SELECT)
    .eq('account_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []) as AccountInvite[];
}

export async function findPendingInviteByEmail(workspaceId: string, normalizedEmail: string): Promise<AccountInvite | null> {
  const { data, error } = await supabaseServer
    .from('account_invites')
    .select(ACCOUNT_INVITE_SELECT)
    .eq('account_id', workspaceId)
    .eq('normalized_email', normalizedEmail)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw error;

  return (data ?? null) as AccountInvite | null;
}

export async function findWorkspaceInviteById(workspaceId: string, inviteId: string): Promise<AccountInvite | null> {
  const { data, error } = await supabaseServer
    .from('account_invites')
    .select(ACCOUNT_INVITE_SELECT)
    .eq('id', inviteId)
    .eq('account_id', workspaceId)
    .maybeSingle();

  if (error) throw error;

  return (data ?? null) as AccountInvite | null;
}

export async function findInviteByToken(inviteToken: string): Promise<AccountInvite | null> {
  const { data, error } = await supabaseServer
    .from('account_invites')
    .select(ACCOUNT_INVITE_SELECT)
    .eq('invite_token', inviteToken)
    .maybeSingle();

  if (error) throw error;

  return (data ?? null) as AccountInvite | null;
}

export async function isExistingWorkspaceMemberEmail(workspaceId: string, normalizedEmail: string): Promise<boolean> {
  const members = await listWorkspaceMembers(workspaceId);

  return members.some(member => {
    const memberEmail = member.email?.trim().toLowerCase() ?? '';
    return memberEmail === normalizedEmail;
  });
}

export async function createWorkspaceInvite(params: {
  workspaceId: string;
  invitedByUserId: string;
  email: string;
}): Promise<AccountInvite> {
  const { email, normalizedEmail } = normalizeInviteEmail(params.email);

  const { data, error } = await supabaseServer
    .from('account_invites')
    .insert([
      {
        account_id: params.workspaceId,
        email,
        normalized_email: normalizedEmail,
        role: 'member',
        status: 'pending',
        invited_by_user_id: params.invitedByUserId,
      },
    ])
    .select(ACCOUNT_INVITE_SELECT)
    .single();

  if (error) throw error;

  return data as AccountInvite;
}

export async function revokeWorkspaceInvite(inviteId: string): Promise<AccountInvite> {
  const { data, error } = await supabaseServer
    .from('account_invites')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
    })
    .eq('id', inviteId)
    .select(ACCOUNT_INVITE_SELECT)
    .single();

  if (error) throw error;

  return data as AccountInvite;
}

export async function findWorkspaceMembership(accountId: string, userId: string) {
  const { data, error } = await supabaseServer
    .from('account_members')
    .select('account_id, user_id, role, joined_at')
    .eq('account_id', accountId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function createWorkspaceMembership(accountId: string, userId: string) {
  const { data, error } = await supabaseServer
    .from('account_members')
    .insert([
      {
        account_id: accountId,
        user_id: userId,
        role: 'member',
      },
    ])
    .select('account_id, user_id, role, joined_at')
    .single();

  if (error) throw error;

  return data;
}

export async function markInviteAccepted(inviteId: string, userId: string): Promise<AccountInvite> {
  const { data, error } = await supabaseServer
    .from('account_invites')
    .update({
      status: 'accepted',
      accepted_by_user_id: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', inviteId)
    .select(ACCOUNT_INVITE_SELECT)
    .single();

  if (error) throw error;

  return data as AccountInvite;
}

export async function getInviteWorkspace(accountId: string): Promise<AcceptedInviteWorkspace> {
  const { data, error } = await supabaseServer
    .from('accounts')
    .select('id, name')
    .eq('id', accountId)
    .single();

  if (error) throw error;

  return data as AcceptedInviteWorkspace;
}

export async function getPublicInviteByToken(inviteToken: string): Promise<{
  state: PublicInviteState;
  invite: PublicInviteView | null;
}> {
  const invite = await findInviteByToken(inviteToken);

  if (!invite) {
    return {
      state: 'invalid',
      invite: null,
    };
  }

  const [{ data: workspace, error: workspaceError }, { data: inviter, error: inviterError }] = await Promise.all([
    supabaseServer
      .from('accounts')
      .select('name')
      .eq('id', invite.account_id)
      .single(),
    supabaseServer
      .from('profiles')
      .select('display_name, email')
      .eq('id', invite.invited_by_user_id)
      .maybeSingle(),
  ]);

  if (workspaceError) throw workspaceError;
  if (inviterError) throw inviterError;

  const state = getInviteState(invite);

  return {
    state,
    invite: {
      email: invite.email,
      role: invite.role,
      workspace: {
        name: workspace.name,
      },
      invitedBy: {
        displayName: inviter?.display_name?.trim() || getFallbackDisplayName(inviter?.email),
      },
      expiresAt: invite.expires_at,
      createdAt: invite.created_at,
    },
  };
}
