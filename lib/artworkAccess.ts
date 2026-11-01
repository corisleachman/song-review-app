import { createHmac, timingSafeEqual } from 'node:crypto';

// Server-only capability issuer. Reuses the existing server signing-key pattern
// with a distinct context; never exposes the key or a Storage credential.
const CONTEXT = 'song-room-artwork-v1';
export const ARTWORK_TTL_SECONDS = 600;
export type ArtworkKind = 'song' | 'playlist' | 'workspace';
export type ArtworkContext = { publicSong?: true; publicPlaylist?: true; playlistId?: string };
export type ArtworkAccess = ArtworkContext & {
  kind: ArtworkKind; id: string; path: string; audience: string; issuedAt: number; expiresAt: number;
};

export function artworkSigningKey() {
  const key = [process.env.INTERNAL_API_SECRET?.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()]
    .find(value => value && value.length >= 32);
  if (!key || key.length < 32) throw new Error('Artwork signing is unavailable.');
  return key;
}

export function validArtworkPath(kind: ArtworkKind, id: string, path: string) {
  if (!['song', 'playlist', 'workspace'].includes(kind) || !/^[a-zA-Z0-9-]+$/.test(id) || path.length > 1024 || /[%\\?#\u0000-\u001f]/.test(path)) return false;
  if (path.split('/').some(part => !part || part === '.' || part === '..')) return false;
  const prefix = kind === 'song' ? `${id}-` : kind === 'playlist' ? `playlist-${id}-` : `workspace-images/${id}-`;
  return path.startsWith(prefix) && /\.(?:jpe?g|png|webp|gif)$/i.test(path);
}

export function artworkStoragePath(kind: ArtworkKind, id: string, value: string | null | undefined, projectUrl: string) {
  if (!value) return null;
  try {
    const source = new URL(value);
    const project = new URL(projectUrl);
    const prefix = '/storage/v1/object/public/song-images/';
    if (source.origin !== project.origin || source.search || source.hash || !source.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(source.pathname.slice(prefix.length));
    return validArtworkPath(kind, id, path) ? path : null;
  } catch { return null; }
}

function projectAudience(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Artwork configuration is unavailable.');
  return url.origin;
}

function digest(payload: string, key: string) {
  return createHmac('sha256', key).update(`${CONTEXT}.${payload}`).digest('base64url');
}

export function signArtworkAccess(input: Omit<ArtworkAccess, 'issuedAt' | 'expiresAt' | 'audience'>, key: string, now = Math.floor(Date.now() / 1000), audience = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') {
  if (key.length < 32 || !validArtworkPath(input.kind, input.id, input.path)) throw new Error('Invalid artwork access.');
  if ((input.publicSong || input.playlistId) && input.kind !== 'song') throw new Error('Invalid artwork context.');
  if (input.publicPlaylist && input.kind !== 'playlist') throw new Error('Invalid artwork context.');
  if ([input.publicSong, input.publicPlaylist, input.playlistId].filter(Boolean).length > 1) throw new Error('Invalid artwork context.');
  if (input.playlistId && !/^[a-zA-Z0-9-]+$/.test(input.playlistId)) throw new Error('Invalid artwork context.');
  // Identical image references within a minute reuse a browser-cache key. Every
  // issued capability has at least nine and at most ten minutes remaining.
  const issuedAt = Math.floor(now / 60) * 60;
  const payload = Buffer.from(JSON.stringify({ ...input, audience: projectAudience(audience), issuedAt, expiresAt: issuedAt + ARTWORK_TTL_SECONDS })).toString('base64url');
  return `${payload}.${digest(payload, key)}`;
}

export function readArtworkAccess(token: string | null, key: string, now = Math.floor(Date.now() / 1000), allowExpired = false, audience = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''): ArtworkAccess | null {
  if (!token || token.length > 4096 || key.length < 32) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts.every(part => /^[a-zA-Z0-9_-]+$/.test(part))) return null;
  const expected = Buffer.from(digest(parts[0], key));
  const actual = Buffer.from(parts[1]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const value = JSON.parse(Buffer.from(parts[0], 'base64url').toString()) as ArtworkAccess;
    if (value.audience !== projectAudience(audience)) return null;
    if (!['song', 'playlist', 'workspace'].includes(value.kind) || typeof value.id !== 'string' || typeof value.path !== 'string') return null;
    if (!validArtworkPath(value.kind, value.id, value.path)) return null;
    if (!Number.isInteger(value.issuedAt) || !Number.isInteger(value.expiresAt) || value.issuedAt > now + 60 || value.expiresAt - value.issuedAt !== ARTWORK_TTL_SECONDS) return null;
    if (!allowExpired && value.expiresAt <= now) return null;
    if (value.publicPlaylist !== undefined && value.publicPlaylist !== true) return null;
    if (value.publicPlaylist && value.kind !== 'playlist') return null;
    if (value.publicSong !== undefined && value.publicSong !== true) return null;
    if (value.playlistId !== undefined && (typeof value.playlistId !== 'string' || !/^[a-zA-Z0-9-]+$/.test(value.playlistId))) return null;
    if ((value.publicSong || value.playlistId) && value.kind !== 'song') return null;
    if ([value.publicSong, value.publicPlaylist, value.playlistId].filter(Boolean).length > 1) return null;
    return value;
  } catch { return null; }
}

export function artworkDeliveryUrl(kind: ArtworkKind, id: string, value: string | null | undefined, context: ArtworkContext = {}) {
  const path = artworkStoragePath(kind, id, value, process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  if (!path) return null;
  const token = signArtworkAccess({ kind, id, path, ...context }, artworkSigningKey());
  return `/api/media/artwork?access=${token}`;
}

export function absoluteArtworkUrl(path: string | null) {
  if (!path) return null;
  const origin = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_APP_URL || 'https://www.song-room.live';
  return new URL(path, origin).toString();
}
