import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

async function assertSongAccess(songId: string) {
  const resolved = await resolveCanonicalIdentity();
  if (!resolved) return { error: 'Unauthorised', status: 401 as const };

  const { data: song } = await supabaseServer
    .from('songs')
    .select('id, account_id')
    .eq('id', songId)
    .maybeSingle();

  if (!song) return { error: 'Not found', status: 404 as const };
  if (song.account_id !== resolved.identity.workspaceId) {
    return { error: 'Forbidden', status: 403 as const };
  }
  return { resolved };
}

// ── GET — band sees ALL comments (including hidden) ─────────────────────────
export async function GET(_req: NextRequest, props: { params: Promise<{ songId: string }> }) {
  const params = await props.params;
  try {
    const access = await assertSongAccess(params.songId);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data: comments, error } = await supabaseServer
      .from('public_comments')
      .select('id, author_name, body, is_hidden, created_at')
      .eq('song_id', params.songId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    return NextResponse.json(
      { comments: comments ?? [] },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[songs/public-comments GET] error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
