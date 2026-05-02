import { supabaseServer } from '@/lib/supabaseServer';
import {
  isMissingPlanColumnError,
  normalizeAccountPlan,
  type AccountPlan,
} from '@/lib/plans';

interface WorkspaceMembershipRecord {
  account_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

interface WorkspaceAccountRecord {
  id: string;
  name: string;
  slug: string | null;
  plan?: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserWorkspaceSummary {
  id: string;
  name: string;
  slug: string | null;
  role: 'owner' | 'member';
  plan: AccountPlan;
  songCount: number;
  isActive: boolean;
  joinedAt: string;
  createdAt: string;
}

async function listAccounts(accountIds: string[]): Promise<WorkspaceAccountRecord[]> {
  const withPlan = await supabaseServer
    .from('accounts')
    .select('id, name, slug, plan, created_by_user_id, created_at, updated_at')
    .in('id', accountIds)
    .returns<WorkspaceAccountRecord[]>();

  if (!withPlan.error) {
    return withPlan.data ?? [];
  }

  if (!isMissingPlanColumnError(withPlan.error)) {
    throw withPlan.error;
  }

  const withoutPlan = await supabaseServer
    .from('accounts')
    .select('id, name, slug, created_by_user_id, created_at, updated_at')
    .in('id', accountIds)
    .returns<Omit<WorkspaceAccountRecord, 'plan'>[]>();

  if (withoutPlan.error) throw withoutPlan.error;

  return (withoutPlan.data ?? []).map(account => ({
    ...account,
    plan: 'free',
  }));
}

async function countSongsByWorkspace(accountIds: string[]) {
  const { data, error } = await supabaseServer
    .from('songs')
    .select('account_id')
    .in('account_id', accountIds)
    .returns<Array<{ account_id: string }>>();

  if (error) throw error;

  const counts = new Map<string, number>();

  for (const song of data ?? []) {
    counts.set(song.account_id, (counts.get(song.account_id) ?? 0) + 1);
  }

  return counts;
}

export async function listUserWorkspaces(userId: string, activeWorkspaceId: string): Promise<UserWorkspaceSummary[]> {
  const { data: memberships, error: membershipError } = await supabaseServer
    .from('account_members')
    .select('account_id, user_id, role, joined_at')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
    .returns<WorkspaceMembershipRecord[]>();

  if (membershipError) throw membershipError;

  const accountIds = Array.from(new Set((memberships ?? []).map(membership => membership.account_id)));

  if (accountIds.length === 0) {
    return [];
  }

  const [accounts, songCounts] = await Promise.all([
    listAccounts(accountIds),
    countSongsByWorkspace(accountIds),
  ]);

  const accountById = new Map(accounts.map(account => [account.id, account]));

  return (memberships ?? [])
    .map(membership => {
      const account = accountById.get(membership.account_id);
      if (!account) return null;

      return {
        id: account.id,
        name: account.name,
        slug: account.slug,
        role: membership.role,
        plan: normalizeAccountPlan(account.plan),
        songCount: songCounts.get(account.id) ?? 0,
        isActive: account.id === activeWorkspaceId,
        joinedAt: membership.joined_at,
        createdAt: account.created_at,
      } satisfies UserWorkspaceSummary;
    })
    .filter((workspace): workspace is UserWorkspaceSummary => Boolean(workspace))
    .sort((left, right) => {
      if (left.isActive !== right.isActive) return left.isActive ? -1 : 1;
      if (left.role !== right.role) {
        if (left.role === 'member') return -1;
        if (right.role === 'member') return 1;
      }
      return left.name.localeCompare(right.name);
    });
}
