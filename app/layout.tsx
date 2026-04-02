import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ff1493',
};

export const metadata: Metadata = {
  title: 'Song Review',
  description: 'Collaborative song review for Polite Rebels',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Song Review',
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
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
