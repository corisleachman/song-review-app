import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { artworkSigningKey, artworkStoragePath } from '@/lib/artworkAccess';
import { EMAIL_ARTWORK_FALLBACK_PATH, readEmailArtworkAccess } from '@/lib/emailArtworkAccess';

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer' };
const denied = () => NextResponse.json({ error: 'Not found' }, { status: 404, headers: noCache });
const RASTER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024;

function fallback(req: NextRequest) {
  return new Response(null, {
    status: 307,
    headers: { ...noCache, Location: new URL(EMAIL_ARTWORK_FALLBACK_PATH, req.nextUrl.origin).toString() },
  });
}

// Serves one song's artwork to an email client for 30 days after sending.
// The token only names the song and the exact Storage object it had at send
// time. Expired tokens, deleted songs and replaced or removed artwork all get
// the brand fallback tile, so an old email never reveals newer artwork.
export async function GET(req: NextRequest) {
  try {
    const access = readEmailArtworkAccess(req.nextUrl.searchParams.get('access'), artworkSigningKey());
    if (!access) return denied();
    if (access.expired) return fallback(req);

    const { data: song, error } = await supabaseServer.from('songs')
      .select('id, image_url').eq('id', access.songId).maybeSingle();
    if (error) throw error;
    const currentPath = song
      ? artworkStoragePath('song', song.id, song.image_url, process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
      : null;
    if (currentPath !== access.path) return fallback(req);

    const { data, error: downloadError } = await supabaseServer.storage.from('song-images').download(access.path);
    if (downloadError || !data) return fallback(req);
    if (data.size > MAX_BYTES || !RASTER_TYPES.has(data.type.toLowerCase())) return fallback(req);
    return new Response(data, {
      headers: {
        'Content-Type': data.type,
        'Content-Length': String(data.size),
        'Cache-Control': 'private, max-age=3600',
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
