import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const { data: playlist } = await supabaseServer
    .from('playlists')
    .select('id, title, is_public, account_id, image_url')
    .eq('id', id)
    .maybeSingle();

  if (!playlist || !playlist.is_public) {
    return { title: 'The Song Room', description: 'Music collaboration for serious artists.' };
  }

  let workspaceName: string | null = null;
  if (playlist.account_id) {
    const { data: account } = await supabaseServer.from('accounts').select('name').eq('id', playlist.account_id).maybeSingle();
    workspaceName = account?.name ?? null;
  }

  // Share preview image: the playlist's custom cover, falling back to the first track's artwork.
  let ogImage: string | null = playlist.image_url ?? null;
  if (!ogImage) {
    const { data: firstRow } = await supabaseServer
      .from('playlist_songs')
      .select('song_id')
      .eq('playlist_id', playlist.id)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstRow?.song_id) {
      const { data: song } = await supabaseServer.from('songs').select('image_url').eq('id', firstRow.song_id).maybeSingle();
      ogImage = song?.image_url ?? null;
    }
  }

  const title = playlist.title ?? 'Playlist';
  const description = workspaceName
    ? `A playlist shared by ${workspaceName} on The Song Room.`
    : 'A playlist on The Song Room.';
  const images = ogImage ? [ogImage] : undefined;

  return {
    title: `${title} · The Song Room`,
    description,
    openGraph: { title, description, images },
    twitter: { card: ogImage ? 'summary_large_image' : 'summary', title, description, images },
  };
}

export default function PublicPlaylistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
