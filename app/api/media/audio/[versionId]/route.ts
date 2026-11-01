import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { audioStoragePath, MEDIA_URL_TTL_SECONDS } from '@/lib/mediaDelivery';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer' };
const denied = () => NextResponse.json({ error: 'Not found' }, { status: 404, headers });

export async function GET(req: NextRequest, props: { params: Promise<{ versionId: string }> }) {
  try {
    const { versionId } = await props.params;
    const songContext = req.nextUrl.searchParams.get('song');
    const playlistContext = req.nextUrl.searchParams.get('playlist');
    if (!versionId || (songContext !== null && playlistContext !== null)) return denied();

    // Public contexts must pass their own checks, even if the visitor is signed in.
    const identity = songContext === null && playlistContext === null
      ? await resolveCanonicalIdentity() : null;
    if (songContext === null && playlistContext === null && !identity) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401, headers });
    }

    const { data: version, error: versionError } = await supabaseServer
      .from('song_versions').select('id, song_id, file_path, upload_finalized_at')
      .eq('id', versionId).maybeSingle();
    if (versionError) throw versionError;
    if (!version || !version.upload_finalized_at) return denied();
    const { data: song, error: songError } = await supabaseServer
      .from('songs').select('id, account_id, is_public').eq('id', version.song_id).maybeSingle();
    if (songError) throw songError;
    if (!song) return denied();

    if (songContext !== null || playlistContext !== null) {
      if (songContext !== null) {
        if (songContext !== song.id || !song.is_public) return denied();
      } else {
        const { data: playlist, error: playlistError } = await supabaseServer
          .from('playlists').select('id, account_id, is_public').eq('id', playlistContext).maybeSingle();
        if (playlistError) throw playlistError;
        if (!playlist?.is_public || playlist.account_id !== song.account_id) return denied();
        const { data: entry, error: entryError } = await supabaseServer
          .from('playlist_songs').select('song_id').eq('playlist_id', playlist.id)
          .eq('song_id', song.id).maybeSingle();
        if (entryError) throw entryError;
        if (!entry) return denied();
      }
      // Public song/playlist APIs expose the latest finalized version, not history.
      const { data: latest, error: latestError } = await supabaseServer
        .from('song_versions').select('id').eq('song_id', song.id)
        .not('upload_finalized_at', 'is', null).order('version_number', { ascending: false })
        .limit(1).maybeSingle();
      if (latestError) throw latestError;
      if (latest?.id !== version.id) return denied();
    } else if (!song.account_id || song.account_id !== identity?.identity.workspaceId) {
      return denied();
    }

    const path = audioStoragePath(version.file_path);
    if (!path || !path.startsWith(`songs/${song.id}/`)) return denied();
    const { data, error } = await supabaseServer.storage.from('song-files')
      .createSignedUrl(path, MEDIA_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
      // Don't log provider exceptions: they can contain paths or signed URLs.
      return NextResponse.json({ error: 'Audio is temporarily unavailable.' }, { status: 503, headers });
    }
    // No cached redirect, no proxying audio bytes through application Functions.
    return new Response(null, { status: 307, headers: { ...headers, Location: data.signedUrl } });
  } catch {
    return NextResponse.json({ error: 'Audio is temporarily unavailable.' }, { status: 503, headers });
  }
}

export const HEAD = GET;
