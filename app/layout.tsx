import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, IBM_Plex_Mono } from 'next/font/google';
import AdSenseLoader from '@/app/components/AdSenseLoader';
import { LangProvider } from '@/app/components/LangContext';
import PWAInit from '@/app/components/PWAInit';
import SkipLink from '@/app/components/SkipLink';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-ibm-plex',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev'),
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
    types: {
      'application/rss+xml': [
        { url: '/feed.xml',        title: 'Global Chokepoints — Events Feed' },
        { url: '/status-feed.xml', title: 'Global Chokepoints — Status Changes Feed' },
      ],
    },
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
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev',
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
        <link rel="alternate" type="application/rss+xml" title="Global Chokepoints Alerts — event feed" href="/feed.xml" />
        <link rel="alternate" type="application/rss+xml" title="Global Chokepoints Alerts — status changes" href="/status-feed.xml" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`antialiased ${inter.variable} ${jetbrainsMono.variable} ${ibmPlexMono.variable}`}
        suppressHydrationWarning
      >
        {/* JSON-LD in body avoids Next.js 15 head-script hydration collision with
            afterInteractive Script placeholders (AdSense). Search engines read it here fine. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <LangProvider>
          <SkipLink />
          {children}
          <PWAInit />
        </LangProvider>
      </body>
      {/* AdSense loaded client-side via useEffect to avoid data-nscript hydration error #418 */}
      {process.env.NEXT_PUBLIC_ADS_ENABLED === 'true' && <AdSenseLoader />}
    </html>
  );
}
