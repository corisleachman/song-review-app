import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.song-room.live';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages = [
    { path: '/', changeFrequency: 'weekly' as const, priority: 1 },
    { path: '/blog/', changeFrequency: 'weekly' as const, priority: 0.6 },
    { path: '/privacy', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/terms', changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  const blogPosts = [
    'how-to-collaborate-on-a-song-remotely',
    'how-to-give-useful-feedback-on-a-song',
    'how-to-organise-song-versions-without-losing-track',
    'the-best-way-to-share-demos-with-music-collaborators',
  ].map((slug) => ({
    path: `/blog/${slug}.html`,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [...staticPages, ...blogPosts].map((page) => ({
    url: `${BASE_URL}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
