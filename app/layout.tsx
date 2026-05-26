import type { Metadata, Viewport } from 'next';
import AdSenseLoader from '@/app/components/AdSenseLoader';
import { LangProvider } from '@/app/components/LangContext';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://strait-of-hormuz-monitor.pages.dev'),
  title: 'Global Chokepoints Alerts — Real-Time Maritime Intelligence',
  description:
    'Monitor strategic global maritime chokepoints including Hormuz, Red Sea, Suez, and Panama with live shipping intelligence, disruption tracking, AIS interference monitoring, and oil transit analysis.',
  keywords: [
    'maritime intelligence', 'Strait of Hormuz', 'Red Sea', 'Suez Canal', 'Panama Canal',
    'shipping disruption', 'AIS monitoring', 'oil transit', 'geopolitical risk',
    'maritime chokepoints', 'tanker tracking', 'naval incidents', 'OSINT',
  ],
  authors: [{ name: 'Global Chokepoints Alerts' }],
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': '/feed.xml' },
  },
  openGraph: {
    title: 'Global Chokepoints Alerts — Real-Time Maritime Intelligence',
    description:
      'Live monitoring of strategic maritime chokepoints: shipping disruptions, AIS interference, oil transit flow, and geopolitical incident feeds.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Global Chokepoints Alerts',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Global Chokepoints Alerts',
    description: 'Real-time maritime intelligence for strategic global chokepoints',
    images: ['/api/og'],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#070B11',
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Global Chokepoints Alerts',
  alternateName: 'GlobalChokepointsAlerts',
  applicationCategory: 'NewsApplication',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://strait-of-hormuz-monitor.pages.dev',
  description:
    'Real-time maritime intelligence platform monitoring strategic global chokepoints, shipping disruptions, AIS interference, and oil transit flow.',
  operatingSystem: 'All',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@type': 'Organization', name: 'Global Chokepoints Alerts' },
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Inter (UI + headlines) + JetBrains Mono (telemetry) */}
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Global Chokepoints Alerts — event feed"
          href="/feed.xml"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {/* JSON-LD in body avoids Next.js 15 head-script hydration collision with
            afterInteractive Script placeholders (AdSense). Search engines read it here fine. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <LangProvider>{children}</LangProvider>
      </body>
      {/* AdSense loaded client-side via useEffect to avoid data-nscript hydration error #418 */}
      {process.env.NEXT_PUBLIC_ADS_ENABLED === 'true' && <AdSenseLoader />}
    </html>
  );
}
