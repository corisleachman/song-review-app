import { readCollaborationInput } from '@/lib/collaborationInput';
import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolvePlaylistAccess } from '@/lib/playlistAccess';

export const dynamic = 'force-dynamic';

// Add a song to the playlist (appended at the end).
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const access = await resolvePlaylistAccess(id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error === 'unauthorized' ? 'Sign in required.' : 'Not found.' },
      { status: access.error === 'unauthorized' ? 401 : 404 });
  }
  try {
    const body = await readCollaborationInput(req);
    if (!body) return NextResponse.json({ error: 'Invalid playlist song details.' }, { status: 400 });
    const songId = typeof body?.songId === 'string' ? body.songId : null;
    if (!songId) return NextResponse.json({ error: 'songId is required.' }, { status: 400 });

    // The song must belong to the same account.
    const { data: song } = await supabaseServer.from('songs').select('id, account_id').eq('id', songId).maybeSingle();
    if (!song || song.account_id !== access.accountId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const { data: maxRow } = await supabaseServer
      .from('playlist_songs').select('position')
      .eq('playlist_id', access.playlist.id).order('position', { ascending: false }).limit(1).maybeSingle();
    const nextPos = (maxRow?.position ?? -1) + 1;

    const { error } = await supabaseServer
      .from('playlist_songs')
      .insert({ playlist_id: access.playlist.id, song_id: songId, position: nextPos });
    if (error && !String(error.message || '').toLowerCase().includes('duplicate')) throw error;

    await supabaseServer.from('playlists').update({ updated_at: new Date().toISOString() }).eq('id', access.playlist.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[playlists/:id/songs] add error:', safeErrorDetails(err));
    return NextResponse.json({ error: 'Could not add song.' }, { status: 500 });
  }
}

// Reorder: body { orderedSongIds: string[] }.
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const access = await resolvePlaylistAccess(id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error === 'unauthorized' ? 'Sign in required.' : 'Not found.' },
      { status: access.error === 'unauthorized' ? 401 : 404 });
  }
  try {
    const body = await readCollaborationInput(req);
    const ids = body?.orderedSongIds;
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !id.trim())
      || new Set(ids).size !== ids.length) {
      return NextResponse.json({ error: 'orderedSongIds must contain unique song IDs.' }, { status: 400 });
    }
    const { data: entries, error: entriesError } = await supabaseServer.from('playlist_songs')
      .select('song_id').eq('playlist_id', access.playlist.id);
    if (entriesError) throw entriesError;
    const existingIds = new Set((entries ?? []).map(entry => entry.song_id));
    if (ids.some(id => !existingIds.has(id))) {
      return NextResponse.json({ error: 'One or more songs are not in this playlist.' }, { status: 400 });
    }

    for (let i = 0; i < ids.length; i++) {
      const { error } = await supabaseServer.from('playlist_songs').update({ position: i })
        .eq('playlist_id', access.playlist.id).eq('song_id', ids[i]);
      if (error) throw error;
    }
    const { error: playlistError } = await supabaseServer.from('playlists')
      .update({ updated_at: new Date().toISOString() }).eq('id', access.playlist.id);
    if (playlistError) throw playlistError;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[playlists/:id/songs] reorder error:', safeErrorDetails(err));
    return NextResponse.json({ error: 'Could not reorder.' }, { status: 500 });
  }
}
