'use client';

import { Globe2 } from 'lucide-react';
import { useLang } from './LangContext';
import type { StraitStatus } from '@/app/lib/types';

const COUNTRIES = [
  { flag: '🇯🇵', name: 'Japan',       pct: 87 },
  { flag: '🇰🇷', name: 'South Korea', pct: 75 },
  { flag: '🇮🇳', name: 'India',       pct: 60 },
  { flag: '🇨🇳', name: 'China',       pct: 45 },
  { flag: '🇸🇬', name: 'Singapore',   pct: 35 },
  { flag: '🇪🇺', name: 'EU',          pct: 18 },
  { flag: '🌏',  name: 'SE Asia',     pct: 22 },
  { flag: '🇺🇸', name: 'USA',         pct:  7 },
];

function barColor(pct: number) {
  if (pct >= 70) return 'bg-danger';
  if (pct >= 40) return 'bg-caution';
  return 'bg-accent';
}
function textColor(pct: number) {
  if (pct >= 70) return 'text-danger';
  if (pct >= 40) return 'text-caution';
  return 'text-accent';
}

interface Props {
  state: StraitStatus;
}

export default function GlobalExposurePanel({ state }: Props) {
  const { t } = useLang();

  const statusLabel =
    state === 'OPEN'             ? t.exposure.statusOpen
    : state === 'PARTIALLY_CLOSED' ? t.exposure.statusDisrupted
    : t.exposure.statusClosed;

  const statusColor =
    state === 'OPEN'             ? 'text-ok border-ok/30 bg-ok/[0.06]'
    : state === 'PARTIALLY_CLOSED' ? 'text-caution border-caution/30 bg-caution/[0.07]'
    : 'text-danger border-danger/35 bg-danger/[0.08]';

  return (
    <section className="border border-divider bg-bg2 p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
          <Globe2 size={13} className="text-accent" />
          {t.exposure.title}
        </div>
        <span className="text-[10px] font-mono text-text4">{t.exposure.source}</span>
      </div>

      {/* Global flow callout */}
      <div className={`mb-5 px-4 py-3 rounded-lg border text-[11px] font-mono ${statusColor} flex flex-wrap items-center gap-2`}>
        <span className="font-bold tracking-wide">{t.exposure.globalFlow}</span>
        <span className="text-text3">—</span>
        <span>{statusLabel}</span>
      </div>

      {/* Country bars — two columns on md+ */}
      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-text3 mb-3">
        {t.exposure.subtitle}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {COUNTRIES.map(({ flag, name, pct }) => (
          <div key={name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-mono text-text flex items-center gap-1.5">
                <span>{flag}</span>
                <span>{name}</span>
              </span>
              <span className={`text-[11px] font-mono font-bold ${textColor(pct)}`}>
                {pct}%
              </span>
            </div>
            <div className="h-1.5 bg-bg2 rounded-full overflow-hidden border border-divider">
              <div
                className={`h-full rounded-full ${barColor(pct)} transition-all duration-700`}
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${name} ${pct}% ${t.exposure.dependency}`}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
