import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';

interface ListenLayoutProps {
  children: React.ReactNode;
  params: Promise<{ songId: string }>;
}

export async function generateMetadata(props: { params: Promise<{ songId: string }> }): Promise<Metadata> {
  const params = await props.params;
  const { songId } = params;

  // Fetch song — check is_public before exposing any metadata
  const { data: song } = await supabaseServer
    .from('songs')
    .select('id, title, image_url, is_public, account_id')
    .eq('id', songId)
    .maybeSingle();

  if (!song || !song.is_public) {
    return {
      title: 'The Song Room',
      description: 'Music collaboration for serious artists.',
    };
  }

  // Fetch workspace name for the description
  let workspaceName: string | null = null;
  if (song.account_id) {
    const { data: account } = await supabaseServer
      .from('accounts')
      .select('name')
      .eq('id', song.account_id)
      .maybeSingle();
    workspaceName = account?.name ?? null;
  }

  const title = song.title ?? 'Untitled';
  const description = workspaceName
    ? `Listen to ${title} by ${workspaceName} — shared via The Song Room`
    : `Listen to ${title} — shared via The Song Room`;

  const pageUrl = `https://song-room.live/listen/${songId}`;

  const images = song.image_url
    ? [
        {
          url: song.image_url,
          width: 1200,
          height: 1200,
          alt: title,
        },
      ]
    : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'The Song Room',
      type: 'music.song',
      images,
    },
    twitter: {
      card: song.image_url ? 'summary_large_image' : 'summary',
      title,
      description,
      images: song.image_url ? [song.image_url] : [],
    },
    // Prevent search engines from indexing individual shared songs
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function ListenLayout({ children }: ListenLayoutProps) {
  return <>{children}</>;
}
