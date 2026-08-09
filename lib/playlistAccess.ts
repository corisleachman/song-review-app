import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

export type PlaylistAccess =
  | { error: 'unauthorized' }
  | { error: 'notfound'; accountId: string; userId: string }
  | { playlist: { id: string; account_id: string; title: string; is_public: boolean }; accountId: string; userId: string };

// Resolves the caller's account and verifies the playlist belongs to it.
export async function resolvePlaylistAccess(playlistId: string): Promise<PlaylistAccess> {
  const resolved = await resolveCanonicalIdentity();
  if (!resolved) return { error: 'unauthorized' };
  const accountId = resolved.identity.workspaceId;
  const userId = resolved.identity.userId;

  const { data } = await supabaseServer
    .from('playlists')
    .select('id, account_id, title, is_public')
    .eq('id', playlistId)
    .maybeSingle();

  if (!data || data.account_id !== accountId) return { error: 'notfound', accountId, userId };
  return { playlist: data, accountId, userId };
}
