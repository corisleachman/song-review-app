import { NextRequest, NextResponse } from 'next/server';
import { RequestTiming } from '@/lib/requestTiming';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const VERSION_PAGE_SIZE = 500;
const VERSION_SONG_BATCH_SIZE = 100;

interface PlayableVersionRecord {
  song_id: string;
  version_number: number | null;
  file_path: string | null;
}

interface VersionPageResult {
  versions: PlayableVersionRecord[];
  error: unknown | null;
  requestCount: number;
}

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

async function listPlayableVersionPages(
  songIds: string[],
  finalizedOnly: boolean
): Promise<VersionPageResult> {
  const versions: PlayableVersionRecord[] = [];
  let requestCount = 0;

  for (let batchStart = 0; batchStart < songIds.length; batchStart += VERSION_SONG_BATCH_SIZE) {
    const songIdBatch = songIds.slice(batchStart, batchStart + VERSION_SONG_BATCH_SIZE);

    for (let pageStart = 0; ; pageStart += VERSION_PAGE_SIZE) {
      let query = supabaseServer
        .from('song_versions')
        .select('song_id, version_number, file_path')
        .in('song_id', songIdBatch)
        .order('song_id', { ascending: true })
        .order('version_number', { ascending: false })
        .range(pageStart, pageStart + VERSION_PAGE_SIZE - 1);

      if (finalizedOnly) {
        query = query.not('upload_finalized_at', 'is', null);
      }

      requestCount += 1;
      const { data, error } = await query.returns<PlayableVersionRecord[]>();

      if (error) {
        return { versions: [], error, requestCount };
      }

      const page = data ?? [];
      versions.push(...page);

      if (page.length < VERSION_PAGE_SIZE) break;
    }
  }

  return { versions, error: null, requestCount };
}

async function getLatestPlayableVersions(songIds: string[]) {
  if (songIds.length === 0) {
    return { latestBySong: new Map<string, string | null>(), requestCount: 0 };
  }

  let result = await listPlayableVersionPages(songIds, true);
  let requestCount = result.requestCount;

  if (result.error && isMissingUploadFinalizedColumn(result.error)) {
    result = await listPlayableVersionPages(songIds, false);
    requestCount += result.requestCount;
  }

  if (result.error) throw result.error;

  const latestBySong = new Map<string, string | null>();
  for (const version of result.versions) {
    if (!latestBySong.has(version.song_id)) {
      latestBySong.set(version.song_id, version.file_path ?? null);
    }
  }

  return { latestBySong, requestCount };
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

    const workspaceNamePromise: Promise<string | null> = playlist.account_id
      ? timing.measure('workspace', async () => {
          const { data: account } = await supabaseServer
            .from('accounts')
            .select('name')
            .eq('id', playlist.account_id)
            .maybeSingle();
          return account?.name ?? null;
        })
      : Promise.resolve(null);

    // Ordered membership. NOTE: do NOT embed songs(...) here — a to-one FK embed
    // inner-joins and can silently drop rows. Fetch the membership plainly, then
    // resolve song meta separately with a direct .in(...).
    const playlistSongsPromise = timing.measure(
      'playlist-songs',
      async () => await supabaseServer
        .from('playlist_songs')
        .select('song_id, position')
        .eq('playlist_id', playlist.id)
        .order('position', { ascending: true })
    );
    const [workspaceName, { data: rows }] = await Promise.all([
      workspaceNamePromise,
      playlistSongsPromise,
    ]);
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

    // Paginated combined read avoids one request per song without restoring the
    // response-row truncation that previously dropped newer playlist tracks.
    const scopedSongIds = songIds.filter((songId) => songMeta.has(songId));
    const { latestBySong, requestCount: versionQueryCount } = await timing.measure(
      'versions',
      () => getLatestPlayableVersions(scopedSongIds)
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
        versionQueryCount,
        trackCount: tracks.length,
      }
    );
  } catch (err) {
    console.error('[public/playlist] error:', err);
    return respond({ error: 'Something went wrong' }, 500);
  }
}
