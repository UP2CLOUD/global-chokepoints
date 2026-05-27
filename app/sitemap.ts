import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://strait-of-hormuz-monitor.workers.dev').replace(/\/$/, '');
  const now = new Date();
  return [
    { url: `${base}/`,            lastModified: now, changeFrequency: 'always',  priority: 1.0 },
    { url: `${base}/methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/docs`,        lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/embed`,       lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
