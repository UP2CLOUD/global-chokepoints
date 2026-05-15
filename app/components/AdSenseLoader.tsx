'use client';
import { useEffect } from 'react';

const CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? 'ca-pub-4771109071232940';

// Injects the AdSense script via useEffect to avoid Next.js <Script> adding
// data-nscript attribute, which AdSense rejects and causes React hydration error #418.
export default function AdSenseLoader() {
  useEffect(() => {
    if (document.querySelector('script[data-adsense]')) return;
    const s = document.createElement('script');
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-adsense', '1');
    document.head.appendChild(s);
  }, []);
  return null;
}
