import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const ACTIVE_WORKSPACE_COOKIE = 'song_review_active_workspace';

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function writeActiveWorkspaceCookie(response: NextResponse, workspaceId: string) {
  response.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, getCookieOptions());
}

export async function readActiveWorkspaceCookie() {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value?.trim() ?? '';

  return rawValue || null;
}

export async function findValidActiveWorkspaceMembership(userId: string, workspaceId: string) {
  const normalizedWorkspaceId = workspaceId.trim();

  if (!normalizedWorkspaceId) return null;

  const { data, error } = await supabaseServer
    .from('account_members')
    .select('account_id, user_id, role, joined_at')
    .eq('account_id', normalizedWorkspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}
