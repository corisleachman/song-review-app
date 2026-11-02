// Stable player URLs deliberately contain no Storage path or bearer credential.
// Each request is authorised by the media route before a short-lived redirect.
export const MEDIA_URL_TTL_SECONDS = 10 * 60;

export function audioDeliveryUrl(versionId: string, context?: { songId?: string; playlistId?: string }) {
  const query = new URLSearchParams();
  if (context?.songId) query.set('song', context.songId);
  if (context?.playlistId) query.set('playlist', context.playlistId);
  return `/api/media/audio/${encodeURIComponent(versionId)}${query.size ? `?${query}` : ''}`;
}

export function audioStoragePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const path = value.trim().replace(/^song-files\//, '');
  if (!path || path.startsWith('/') || /[\\?#\u0000-\u001f]/.test(path) || path.includes('://') || path.includes('%')) return null;
  if (path.split('/').some(part => !part || part === '.' || part === '..')) return null;
  return path;
}
