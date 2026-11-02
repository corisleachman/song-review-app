import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { artworkDeliveryUrl, artworkSigningKey, readArtworkAccess, type ArtworkAccess } from '@/lib/artworkAccess';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer' };
const denied = () => NextResponse.json({ error: 'Not found' }, { status: 404, headers: noCache });
const RASTER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024;
type ArtworkRecord = { id: string; image_url: string | null; account_id?: string; is_public?: boolean };

async function renew(access: ArtworkAccess) {
  const table = access.kind === 'song' ? 'songs' : access.kind === 'playlist' ? 'playlists' : 'accounts';
  const columns = access.kind === 'workspace' ? 'id, image_url' : 'id, account_id, image_url, is_public';
  const { data: record, error } = await supabaseServer.from(table).select(columns).eq('id', access.id).returns<ArtworkRecord[]>().maybeSingle();
  if (error) throw error;
  if (!record) return null;
  if (access.publicSong || access.publicPlaylist) {
    if (!('is_public' in record) || !record.is_public) return null;
  } else if (access.playlistId) {
    const { data: playlist, error: playlistError } = await supabaseServer.from('playlists')
      .select('id, account_id, is_public').eq('id', access.playlistId).maybeSingle();
    if (playlistError) throw playlistError;
    if (!playlist?.is_public || !('account_id' in record) || record.account_id !== playlist.account_id) return null;
    const { data: entry, error: entryError } = await supabaseServer.from('playlist_songs').select('song_id')
      .eq('playlist_id', playlist.id).eq('song_id', record.id).maybeSingle();
    if (entryError) throw entryError;
    if (!entry) return null;
  } else {
    const { resolveCanonicalIdentity } = await import('@/lib/canonicalIdentity');
    const resolved = await resolveCanonicalIdentity();
    if (!resolved) return null;
    if (access.kind === 'workspace') {
      const { data: membership, error: membershipError } = await supabaseServer.from('account_members')
        .select('account_id').eq('account_id', record.id).eq('user_id', resolved.identity.userId).maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership) return null;
    } else if (!('account_id' in record) || record.account_id !== resolved.identity.workspaceId) return null;
  }
  return artworkDeliveryUrl(access.kind, record.id, record.image_url, {
    ...(access.publicSong ? { publicSong: true } : {}),
    ...(access.publicPlaylist ? { publicPlaylist: true } : {}),
    ...(access.playlistId ? { playlistId: access.playlistId } : {}),
  });
}

export async function GET(req: NextRequest) {
  try {
    const now = Math.floor(Date.now() / 1000);
    // An expired but authentic token is only an identifier for a new permission
    // check. It never authorises a download by itself.
    const access = readArtworkAccess(req.nextUrl.searchParams.get('access'), artworkSigningKey(), now, true);
    if (!access) return denied();
    if (access.expiresAt <= now) {
      const renewed = await renew(access);
      return renewed ? new Response(null, { status: 307, headers: { ...noCache, Location: renewed } }) : denied();
    }
    const { data, error } = await supabaseServer.storage.from('song-images').download(access.path);
    if (error || !data) return denied();
    if (data.size > MAX_BYTES || !RASTER_TYPES.has(data.type.toLowerCase())) return denied();
    return new Response(data, {
      headers: {
        'Content-Type': data.type,
        'Content-Length': String(data.size),
        'Cache-Control': `private, max-age=${Math.max(0, access.expiresAt - Math.floor(Date.now() / 1000))}, must-revalidate`,
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch {
    // Provider errors and request URLs can include bearer credentials.
    return NextResponse.json({ error: 'Artwork is temporarily unavailable.' }, { status: 503, headers: noCache });
  }
}

export const HEAD = GET;
