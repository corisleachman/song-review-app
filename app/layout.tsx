import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import '../styles/globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Song Review',
  description: 'Collaborative song review app',
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
      <body>{children}</body>
      <Script src="/cookie-consent.js" strategy="beforeInteractive" />
    </html>
  );
}
