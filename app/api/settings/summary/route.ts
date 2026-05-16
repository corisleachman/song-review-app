import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { listWorkspaceInvites } from '@/lib/accountInvites';
import { loadThemeSettings } from '@/lib/profileThemeSettings';
import { supabaseServer } from '@/lib/supabaseServer';
import { listWorkspaceMembers } from '@/lib/workspaceMembers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not load settings summary.';
}

async function countWorkspaceSongs(workspaceId: string) {
  const { count, error } = await supabaseServer
    .from('songs')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', workspaceId);

  if (error) throw error;

  return count ?? 0;
}

export async function GET() {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const ownerAccess = resolved.identity.membershipRole === 'owner';
    const [theme, members, songCount, invites] = await Promise.all([
      loadThemeSettings(resolved.identity),
      listWorkspaceMembers(resolved.identity.workspaceId),
      countWorkspaceSongs(resolved.identity.workspaceId),
      ownerAccess ? listWorkspaceInvites(resolved.identity.workspaceId) : Promise.resolve([]),
    ]);

    return NextResponse.json(
      {
        identity: resolved.identity,
        workspace: {
          plan: resolved.bootstrap.workspace.plan,
          notification_mode: resolved.bootstrap.workspace.notification_mode ?? 'all_members',
          storage_bytes_used: (resolved.bootstrap.workspace as Record<string, unknown>).storage_bytes_used as number ?? 0,
        },
        theme,
        members,
        invites,
        songCount,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error loading settings summary:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
