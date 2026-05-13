import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://ishormuzstraitopen.pages.dev';
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'always', priority: 1 },
    { url: `${base}/methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ];
}
