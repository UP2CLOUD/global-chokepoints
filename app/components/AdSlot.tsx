'use client';

import { useEffect } from 'react';

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

interface Props {
  position: 'below-metrics' | 'below-intel' | 'footer';
  className?: string;
}

const CLIENT = 'ca-pub-4771109071232940';

// TODO: Replace these with real data-ad-slot IDs from your AdSense dashboard.
//   Ads → By ad unit → Display ads → create a Responsive unit → copy data-ad-slot value.
const SLOT_IDS: Record<Props['position'], string> = {
  'below-metrics': '0000000001',
  'below-intel':   '0000000002',
  'footer':        '0000000003',
};

export default function AdSlot({ position, className = '' }: Props) {
  const enabled = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

  useEffect(() => {
    if (!enabled) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // script not yet loaded — no-op
    }
  }, [enabled, position]);

  if (!enabled) return null;

  return (
    <div
      className={`w-full overflow-hidden min-h-[100px] ${className}`}
      role="complementary"
      aria-label="Advertisement"
    >
      <ins
        key={position}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT}
        data-ad-slot={SLOT_IDS[position]}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
