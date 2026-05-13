'use client';

import { Lock } from 'lucide-react';

/**
 * PremiumLock — soft-lock badge for premium features.
 *
 * Shows a small violet badge with lock icon and upgrade CTA.
 * Does NOT block content — it's an overlay/badge, not a paywall.
 *
 * Controlled by NEXT_PUBLIC_PREMIUM_ENABLED env var.
 */

interface Props {
  feature: string;
  cta?: string;
  className?: string;
}

export default function PremiumLock({
  feature,
  cta = 'Unlock',
  className = '',
}: Props) {
  const enabled = process.env.NEXT_PUBLIC_PREMIUM_ENABLED === 'true';

  if (!enabled) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono
        bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/20
        cursor-pointer hover:bg-[#8B5CF6]/15 hover:border-[#8B5CF6]/35
        transition-all duration-200 uppercase tracking-[0.1em] ${className}`}
      role="button"
      aria-label={`${cta} ${feature}`}
      tabIndex={0}
    >
      <Lock size={9} />
      {cta}
    </div>
  );
}
