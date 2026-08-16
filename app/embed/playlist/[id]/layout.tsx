import type { Metadata } from 'next';

// Embed frames should never compete with the canonical /listen page in search.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EmbedPlaylistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
