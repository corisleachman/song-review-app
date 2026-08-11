import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function normalizeStoragePath(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  const prefix = 'song-files/';
  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
}
function audioUrlFor(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  const { data } = supabaseServer.storage.from('song-files').getPublicUrl(normalizeStoragePath(filePath));
  return data?.publicUrl ?? null;
}

function isMissingUploadFinalizedColumn(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string'
    ? error.message.toLowerCase()
    : '';

  return (code === '42703' || code === 'PGRST204')
    && message.includes('upload_finalized_at');
}

async function getLatestPlayableVersion(songId: string) {
  const finalizedResult = await supabaseServer
    .from('song_versions')
    .select('file_path')
    .eq('song_id', songId)
    .not('upload_finalized_at', 'is', null)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!finalizedResult.error) return finalizedResult;
  if (!isMissingUploadFinalizedColumn(finalizedResult.error)) return finalizedResult;

  return supabaseServer
    .from('song_versions')
    .select('file_path')
    .eq('song_id', songId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Service role bypasses RLS, so we check is_public ourselves.
    const { data: playlist } = await supabaseServer
      .from('playlists')
      .select('id, title, is_public, account_id')
      .eq('id', id)
      .maybeSingle();

    // 404 (not 403) so we don't confirm a private playlist exists.
    if (!playlist || !playlist.is_public) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let workspaceName: string | null = null;
    if (playlist.account_id) {
      const { data: account } = await supabaseServer.from('accounts').select('name').eq('id', playlist.account_id).maybeSingle();
      workspaceName = account?.name ?? null;
    }

    // Ordered membership. NOTE: do NOT embed songs(...) here — a to-one FK embed
    // inner-joins and can silently drop rows. Fetch the membership plainly, then
    // resolve song meta separately with a direct .in(...).
    const { data: rows } = await supabaseServer
      .from('playlist_songs')
      .select('song_id, position')
      .eq('playlist_id', playlist.id)
      .order('position', { ascending: true });
    const ordered = rows ?? [];
    const songIds = ordered.map((r) => r.song_id);

    // Song meta (title, artwork).
    const songMeta = new Map<string, { title: string; image_url: string | null }>();
    if (songIds.length) {
      const { data: songs, error: songsError } = await supabaseServer
        .from('songs')
        .select('id, title, image_url')
        .in('id', songIds)
        .eq('account_id', playlist.account_id);
      if (songsError) throw songsError;
      for (const s of songs ?? []) songMeta.set(s.id, { title: s.title ?? 'Untitled', image_url: s.image_url ?? null });
    }

    // Latest version per song (per-song; reliable, not subject to a combined row limit).
    const latestBySong = new Map<string, string | null>();
    await Promise.all(
      songIds.filter((sid) => songMeta.has(sid)).map(async (sid) => {
        const { data: v, error: versionError } = await getLatestPlayableVersion(sid);
        if (versionError) throw versionError;
        latestBySong.set(sid, v?.file_path ?? null);
      }),
    );

    const tracks = ordered
      .map((r) => {
        const meta = songMeta.get(r.song_id);
        if (!meta) return null;
        return {
          id: r.song_id,
          title: meta.title,
          image_url: meta.image_url,
          audioUrl: audioUrlFor(latestBySong.get(r.song_id) ?? null),
        };
      })
      .filter((track): track is NonNullable<typeof track> => Boolean(track?.audioUrl));

    return NextResponse.json(
      { playlist: { id: playlist.id, title: playlist.title, workspace_name: workspaceName }, tracks },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (err) {
    console.error('[public/playlist] error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
