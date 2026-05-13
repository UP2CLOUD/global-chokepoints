'use client';

/**
 * AdSlot — reserved container for future display ads.
 *
 * Renders a fixed-height container to prevent CLS (Cumulative Layout Shift).
 * Only visible when NEXT_PUBLIC_ADS_ENABLED=true.
 * Never placed above or inside the main status card.
 *
 * On mobile, hidden by default unless explicitly enabled.
 */

interface Props {
  position: 'below-metrics' | 'below-intel' | 'footer';
  className?: string;
}

export default function AdSlot({ position, className = '' }: Props) {
  const enabled = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

  if (!enabled) return null;

  return (
    <div
      className={`w-full rounded-lg border border-dashed border-divider/40 bg-[#0A0D14]
        flex items-center justify-center min-h-[90px]
        hidden md:flex ${className}`}
      role="complementary"
      aria-label="Advertisement"
      data-ad-slot={position}
    >
      <span className="text-[9px] font-mono text-text4 uppercase tracking-[0.18em]">
        Advertisement
      </span>
    </div>
  );
}
