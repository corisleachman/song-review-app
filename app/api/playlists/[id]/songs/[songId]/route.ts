import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolvePlaylistAccess } from '@/lib/playlistAccess';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; songId: string }> }) {
  const { id, songId } = await props.params;
  const access = await resolvePlaylistAccess(id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error === 'unauthorized' ? 'Sign in required.' : 'Not found.' },
      { status: access.error === 'unauthorized' ? 401 : 404 });
  }
  try {
    const { error } = await supabaseServer
      .from('playlist_songs').delete()
      .eq('playlist_id', access.playlist.id).eq('song_id', songId);
    if (error) throw error;
    await supabaseServer.from('playlists').update({ updated_at: new Date().toISOString() }).eq('id', access.playlist.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[playlists/:id/songs/:songId] remove error:', err);
    return NextResponse.json({ error: 'Could not remove song.' }, { status: 500 });
  }
}
