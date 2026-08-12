import { NextRequest, NextResponse } from 'next/server';
import { RequestTiming } from '@/lib/requestTiming';
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

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const timing = new RequestTiming();

  function respond(
    body: unknown,
    status: number,
    details: Record<string, number | string | boolean | null> = {}
  ) {
    const response = timing.attach(NextResponse.json(body, {
      status,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }));
    timing.logPreview('/api/public/playlist/[id]', req, status, details);
    return response;
  }

  try {
    const { id } = await props.params;
    if (!id) return respond({ error: 'Not found' }, 404);

    // Service role bypasses RLS, so we check is_public ourselves.
    const { data: playlist } = await timing.measure(
      'playlist',
      async () => await supabaseServer
        .from('playlists')
        .select('id, title, is_public, account_id')
        .eq('id', id)
        .maybeSingle()
    );

    // 404 (not 403) so we don't confirm a private playlist exists.
    if (!playlist || !playlist.is_public) {
      return respond({ error: 'Not found' }, 404);
    }

    let workspaceName: string | null = null;
    if (playlist.account_id) {
      const { data: account } = await timing.measure(
        'workspace',
        async () => await supabaseServer
          .from('accounts')
          .select('name')
          .eq('id', playlist.account_id)
          .maybeSingle()
      );
      workspaceName = account?.name ?? null;
    }

    // Ordered membership. NOTE: do NOT embed songs(...) here — a to-one FK embed
    // inner-joins and can silently drop rows. Fetch the membership plainly, then
    // resolve song meta separately with a direct .in(...).
    const { data: rows } = await timing.measure(
      'playlist-songs',
      async () => await supabaseServer
        .from('playlist_songs')
        .select('song_id, position')
        .eq('playlist_id', playlist.id)
        .order('position', { ascending: true })
    );
    const ordered = rows ?? [];
    const songIds = ordered.map((r) => r.song_id);

    // Song meta (title, artwork).
    const songMeta = new Map<string, { title: string; image_url: string | null }>();
    if (songIds.length) {
      const { data: songs, error: songsError } = await timing.measure(
        'songs',
        async () => await supabaseServer
          .from('songs')
          .select('id, title, image_url')
          .in('id', songIds)
          .eq('account_id', playlist.account_id)
      );
      if (songsError) throw songsError;
      for (const s of songs ?? []) songMeta.set(s.id, { title: s.title ?? 'Untitled', image_url: s.image_url ?? null });
    }

    // Latest version per song (per-song; reliable, not subject to a combined row limit).
    const latestBySong = new Map<string, string | null>();
    const scopedSongIds = songIds.filter((songId) => songMeta.has(songId));
    await timing.measure(
      'versions',
      () => Promise.all(
        scopedSongIds.map(async (songId) => {
          const { data: version, error: versionError } = await getLatestPlayableVersion(songId);
          if (versionError) throw versionError;
          latestBySong.set(songId, version?.file_path ?? null);
        })
      )
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

    return respond(
      { playlist: { id: playlist.id, title: playlist.title, workspace_name: workspaceName }, tracks },
      200,
      {
        playlistSongCount: ordered.length,
        scopedSongCount: scopedSongIds.length,
        versionQueryCount: scopedSongIds.length,
        trackCount: tracks.length,
      }
    );
  } catch (err) {
    console.error('[public/playlist] error:', err);
    return respond({ error: 'Something went wrong' }, 500);
  }
}
