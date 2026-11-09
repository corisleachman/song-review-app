import { artworkSigningKey, artworkStoragePath } from '@/lib/artworkAccess';
import { signEmailArtworkAccess } from '@/lib/emailArtworkAccess';

// A 30-day, song-only artwork link for emails. Null when the song has no
// stored artwork or signing is unavailable; templates then show the brand tile.
export function emailArtworkUrl(songId: string, imageUrl: string | null, origin: string) {
  try {
    const path = artworkStoragePath('song', songId, imageUrl, process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
    if (!path) return null;
    const token = signEmailArtworkAccess({ songId, path }, artworkSigningKey());
    return new URL(`/api/media/email-artwork?access=${token}`, origin).toString();
  } catch {
    return null;
  }
}
