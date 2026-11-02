import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { audioStoragePath, MEDIA_URL_TTL_SECONDS } from '@/lib/mediaDelivery';
import { RequestTiming } from '@/lib/requestTiming';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer' };
const denied = () => NextResponse.json({ error: 'Not found' }, { status: 404, headers });

type MediaVersion = {
  id: string; song_id: string; file_path: string | null; upload_finalized_at: string | null;
  song: { id: string; account_id: string | null; is_public: boolean };
};
type PlaylistEntry = {
  song_id: string;
  playlist: { id: string; account_id: string | null; is_public: boolean };
};

export async function GET(req: NextRequest, props: { params: Promise<{ versionId: string }> }) {
  const timing = new RequestTiming();
  try {
    const { versionId } = await props.params;
    const songContext = req.nextUrl.searchParams.get('song');
    const playlistContext = req.nextUrl.searchParams.get('playlist');
    if (!versionId || (songContext !== null && playlistContext !== null)) return denied();

    // Public contexts must pass their own checks, even if the visitor is signed in.
    const identity = songContext === null && playlistContext === null
      ? await timing.measure('identity', () => resolveCanonicalIdentity()) : null;
    if (songContext === null && playlistContext === null && !identity) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401, headers });
    }

    const { data: version, error: versionError } = await timing.measure('version_song', async () => await supabaseServer
      .from('song_versions')
      .select('id, song_id, file_path, upload_finalized_at, song:songs!inner(id, account_id, is_public)')
      .eq('id', versionId).returns<MediaVersion[]>().maybeSingle());
    if (versionError) throw versionError;
    if (!version || !version.upload_finalized_at || !version.song) return denied();
    const song = version.song;

    if (songContext !== null || playlistContext !== null) {
      if (songContext !== null && (songContext !== song.id || !song.is_public)) return denied();
      // The latest-version check and playlist membership read are independent.
      // Join each parent in the same read rather than repeating database round trips.
      const [latestResult, entryResult] = await Promise.all([
        timing.measure('latest', async () => await supabaseServer
          .from('song_versions').select('id').eq('song_id', song.id)
          .not('upload_finalized_at', 'is', null).order('version_number', { ascending: false })
          .limit(1).maybeSingle()),
        playlistContext !== null
          ? timing.measure('playlist_entry', async () => await supabaseServer
            .from('playlist_songs').select('song_id, playlist:playlists!inner(id, account_id, is_public)')
            .eq('playlist_id', playlistContext).eq('song_id', song.id)
            .returns<PlaylistEntry[]>().maybeSingle())
          : Promise.resolve(null),
      ]);
      if (latestResult.error) throw latestResult.error;
      if (entryResult?.error) throw entryResult.error;
      if (latestResult.data?.id !== version.id) return denied();
      if (playlistContext !== null) {
        const playlist = entryResult?.data?.playlist;
        if (!playlist?.is_public || playlist.account_id !== song.account_id) return denied();
      }
    } else if (!song.account_id || song.account_id !== identity?.identity.workspaceId) {
      return denied();
    }

    const path = audioStoragePath(version.file_path);
    if (!path || !path.startsWith(`songs/${song.id}/`)) return denied();
    const { data, error } = await timing.measure('sign', () => supabaseServer.storage.from('song-files')
      .createSignedUrl(path, MEDIA_URL_TTL_SECONDS));
    if (error || !data?.signedUrl) {
      // Don't log provider exceptions: they can contain paths or signed URLs.
      return NextResponse.json({ error: 'Audio is temporarily unavailable.' }, { status: 503, headers });
    }
    // No cached redirect, no proxying audio bytes through application Functions.
    return timing.attach(new Response(null, { status: 307, headers: { ...headers, Location: data.signedUrl } }));
  } catch {
    return NextResponse.json({ error: 'Audio is temporarily unavailable.' }, { status: 503, headers });
  }
}

export const HEAD = GET;
