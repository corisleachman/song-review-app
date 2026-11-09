import { createHmac, timingSafeEqual } from 'node:crypto';

// Email images are fetched when a message is opened, often hours or days after
// it was sent, so the 10-minute app artwork capability is too short. This is a
// separate, song-only capability with its own signing context: it cannot be
// replayed against /api/media/artwork, and app tokens cannot be replayed here.
const CONTEXT = 'song-room-email-artwork-v1';
export const EMAIL_ARTWORK_TTL_SECONDS = 30 * 24 * 60 * 60;
export const EMAIL_ARTWORK_FALLBACK_PATH = '/marketing-assets/email-artwork-fallback.png';

export type EmailArtworkAccess = { songId: string; path: string; audience: string; issuedAt: number; expiresAt: number };
export type EmailArtworkRead = EmailArtworkAccess & { expired: boolean };

const ID = /^[a-zA-Z0-9-]+$/;

function validPath(songId: string, path: string) {
  if (!ID.test(songId) || path.length > 1024 || /[%\\?#\u0000-\u001f]/.test(path)) return false;
  if (path.split('/').some(part => !part || part === '.' || part === '..')) return false;
  return path.startsWith(`${songId}-`) && /\.(?:jpe?g|png|webp|gif)$/i.test(path);
}

function projectAudience(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Artwork configuration is unavailable.');
  return url.origin;
}

function digest(payload: string, key: string) {
  return createHmac('sha256', key).update(`${CONTEXT}.${payload}`).digest('base64url');
}

export function signEmailArtworkAccess(
  input: { songId: string; path: string },
  key: string,
  now = Math.floor(Date.now() / 1000),
  audience = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
) {
  if (key.length < 32 || !validPath(input.songId, input.path)) throw new Error('Invalid email artwork access.');
  const issuedAt = Math.floor(now / 3600) * 3600;
  const payload = Buffer.from(JSON.stringify({
    songId: input.songId,
    path: input.path,
    audience: projectAudience(audience),
    issuedAt,
    expiresAt: issuedAt + EMAIL_ARTWORK_TTL_SECONDS,
  })).toString('base64url');
  return `${payload}.${digest(payload, key)}`;
}

// Returns null for anything not signed by this server for this project. An
// authentic but expired token is returned with expired: true so the route can
// show the fallback tile instead of a broken image; it never authorises a read.
export function readEmailArtworkAccess(
  token: string | null,
  key: string,
  now = Math.floor(Date.now() / 1000),
  audience = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
): EmailArtworkRead | null {
  if (!token || token.length > 2048 || key.length < 32) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts.every(part => /^[a-zA-Z0-9_-]+$/.test(part))) return null;
  const expected = Buffer.from(digest(parts[0], key));
  const actual = Buffer.from(parts[1]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const value = JSON.parse(Buffer.from(parts[0], 'base64url').toString()) as EmailArtworkAccess;
    if (value.audience !== projectAudience(audience)) return null;
    if (typeof value.songId !== 'string' || typeof value.path !== 'string' || !validPath(value.songId, value.path)) return null;
    if (!Number.isInteger(value.issuedAt) || !Number.isInteger(value.expiresAt)) return null;
    if (value.issuedAt > now + 60 || value.expiresAt - value.issuedAt !== EMAIL_ARTWORK_TTL_SECONDS) return null;
    return { ...value, expired: value.expiresAt <= now };
  } catch { return null; }
}
