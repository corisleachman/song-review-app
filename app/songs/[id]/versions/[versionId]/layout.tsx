import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';

interface Props {
  children: ReactNode;
  params: { id: string; versionId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: songId } = params;

  const { data: song } = await supabaseServer
    .from('songs')
    .select('title, image_url')
    .eq('id', songId)
    .single();

  const title = song?.title ? `${song.title} — Rebel HQ` : 'Rebel HQ';
  const description = 'Collaborative song review for Polite Rebels';
  const imageUrl = song?.image_url ?? null;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'Rebel HQ',
      type: 'music.song',
      ...(imageUrl && {
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 1200,
            alt: song?.title ?? 'Song artwork',
          },
        ],
      }),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default function VersionLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
