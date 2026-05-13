import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: ['/', '/methodology'], disallow: ['/api/'] },
    ],
    sitemap: 'https://ishormuzstraitopen.pages.dev/sitemap.xml',
    host: 'https://ishormuzstraitopen.pages.dev',
  };
}
