import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import '../styles/globals.css';
import BetaFeedback from '../components/BetaFeedback';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.song-room.live'),
  title: 'The Song Room',
  description:
    'A collaboration space for artists, bands and producers. Upload song versions, drop timestamped comments on the waveform, and track every action and decision across a record’s lifecycle — all in one shared workspace.',
  openGraph: {
    type: 'website',
    siteName: 'The Song Room',
    title: 'The Song Room',
    description:
      'A collaboration space for artists, bands and producers — upload song versions, drop timestamped comments on the waveform, and track every decision in one shared workspace.',
    url: '/',
    images: [{ url: '/song-room-preview.jpg', width: 1200, height: 630, alt: 'The Song Room' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Song Room',
    description: 'A collaboration space for artists, bands and producers.',
    images: ['/song-room-preview.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/cookie-consent.css" />
      </head>
      <body>
        {children}
        <BetaFeedback />
      </body>
      <Script src="/cookie-consent.js" strategy="beforeInteractive" />
    </html>
  );
}
