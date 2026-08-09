import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data: playlist } = await supabaseServer
    .from('playlists')
    .select('id, title, is_public, account_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!playlist || !playlist.is_public) {
    return { title: 'The Song Room', description: 'Music collaboration for serious artists.' };
  }

  let workspaceName: string | null = null;
  if (playlist.account_id) {
    const { data: account } = await supabaseServer.from('accounts').select('name').eq('id', playlist.account_id).maybeSingle();
    workspaceName = account?.name ?? null;
  }

  const title = playlist.title ?? 'Playlist';
  const description = workspaceName
    ? `A playlist shared by ${workspaceName} on The Song Room.`
    : 'A playlist on The Song Room.';

  return {
    title: `${title} · The Song Room`,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary', title, description },
  };
}

export default function PublicPlaylistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
