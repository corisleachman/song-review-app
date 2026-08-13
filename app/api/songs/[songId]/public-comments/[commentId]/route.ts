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

// ── DELETE — permanently remove a public comment ────────────────────────────
export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ songId: string; commentId: string }> }
) {
  const params = await props.params;
  try {
    const access = await assertSongAccess(params.songId);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { error } = await supabaseServer
      .from('public_comments')
      .delete()
      .eq('id', params.commentId)
      .eq('song_id', params.songId);

    if (error) throw error;

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[songs/public-comments DELETE] error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
