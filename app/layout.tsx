import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://strait-of-hormuz-monitor.workers.dev'),
  title: 'IsStraitHormuzOpen? — Strait of Hormuz Real-Time Monitoring',
  description:
    'Public intelligence dashboard tracking the operational status of the Strait of Hormuz: maritime activity, oil markets, geopolitical events, and marine weather. Sourced from EIA, Yahoo Finance, GDELT, CNN, BBC, Al Jazeera, Reuters, Open-Meteo, and AISStream.',
  keywords: [
    'Strait of Hormuz', 'Ormuz', 'maritime intelligence', 'shipping', 'Iran',
    'geopolitics', 'oil tankers', 'Brent', 'WTI', 'naval', 'OPEC',
  ],
  authors: [{ name: 'IsStraitHormuzOpen?' }],
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': '/feed.xml' },
  },
  openGraph: {
    title: 'IsStraitHormuzOpen? — Strait of Hormuz Real-Time Monitoring',
    description:
      'Is the Strait of Hormuz open? Live monitoring of maritime, market and intelligence signals.',
    type: 'website',
    locale: 'en_US',
    siteName: 'IsStraitHormuzOpen?',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IsStraitHormuzOpen?',
    description: 'Real-time Strait of Hormuz monitoring',
    images: ['/api/og'],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#07090F',
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'IsStraitHormuzOpen?',
  alternateName: 'IsHormuzOpen',
  applicationCategory: 'NewsApplication',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://strait-of-hormuz-monitor.workers.dev',
  description:
    'Real-time monitoring of the Strait of Hormuz, integrating market data, news intelligence and marine weather.',
  operatingSystem: 'All',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@type': 'Organization', name: 'IsStraitHormuzOpen?' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="IsStraitHormuzOpen? — event feed"
          href="/feed.xml"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
