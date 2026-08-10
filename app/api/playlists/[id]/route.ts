import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolvePlaylistAccess } from '@/lib/playlistAccess';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await resolvePlaylistAccess(params.id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error === 'unauthorized' ? 'Sign in required.' : 'Not found.' },
      { status: access.error === 'unauthorized' ? 401 : 404 });
  }
  try {
    // Plain membership (no FK embed — a to-one embed can inner-join-drop rows).
    const { data: rows } = await supabaseServer
      .from('playlist_songs')
      .select('song_id, position')
      .eq('playlist_id', access.playlist.id)
      .order('position', { ascending: true });
    const orderedRows = rows ?? [];
    const inSongIds = orderedRows.map((r) => r.song_id);

    const metaMap = new Map<string, { title: string; status: string | null }>();
    if (inSongIds.length) {
      const { data: inSongs } = await supabaseServer.from('songs').select('id, title, status').in('id', inSongIds);
      for (const s of inSongs ?? []) metaMap.set(s.id, { title: s.title ?? 'Untitled', status: s.status ?? null });
    }

    const songs = orderedRows.map((r) => {
      const m = metaMap.get(r.song_id);
      return { id: r.song_id, title: m?.title ?? 'Untitled', status: m?.status ?? null, position: r.position };
    });

    const inIds = new Set(songs.map((s) => s.id));

    const { data: allSongs } = await supabaseServer
      .from('songs')
      .select('id, title, status')
      .eq('account_id', access.accountId)
      .order('title', { ascending: true });
    const available = (allSongs ?? [])
      .filter((s) => !inIds.has(s.id))
      .map((s) => ({ id: s.id, title: s.title ?? 'Untitled', status: s.status ?? null }));

    return NextResponse.json({
      playlist: { id: access.playlist.id, title: access.playlist.title, is_public: access.playlist.is_public, image_url: access.playlist.image_url },
      songs, available,
    });
  } catch (err) {
    console.error('[playlists/:id] get error:', err);
    return NextResponse.json({ error: 'Could not load playlist.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await resolvePlaylistAccess(params.id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error === 'unauthorized' ? 'Sign in required.' : 'Not found.' },
      { status: access.error === 'unauthorized' ? 401 : 404 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { title?: unknown; is_public?: unknown };
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body?.title === 'string' && body.title.trim()) update.title = body.title.trim().slice(0, 200);
    if (typeof body?.is_public === 'boolean') update.is_public = body.is_public;

    const { error } = await supabaseServer.from('playlists').update(update).eq('id', access.playlist.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[playlists/:id] patch error:', err);
    return NextResponse.json({ error: 'Could not update playlist.' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await resolvePlaylistAccess(params.id);
  if ('error' in access) {
    return NextResponse.json({ error: access.error === 'unauthorized' ? 'Sign in required.' : 'Not found.' },
      { status: access.error === 'unauthorized' ? 401 : 404 });
  }
  try {
    const { error } = await supabaseServer.from('playlists').delete().eq('id', access.playlist.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[playlists/:id] delete error:', err);
    return NextResponse.json({ error: 'Could not delete playlist.' }, { status: 500 });
  }
}
