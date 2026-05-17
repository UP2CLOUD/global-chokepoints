'use client';

import { DollarSign } from 'lucide-react';
import { useLang } from './LangContext';
import type { StraitStatus } from '@/app/lib/types';

interface Props {
  state: StraitStatus;
}

const SECTORS: { key: 'crude' | 'lng' | 'petro' | 'other'; pct: number; bar: string }[] = [
  { key: 'crude', pct: 60, bar: 'bg-accent'  },
  { key: 'lng',   pct: 20, bar: 'bg-ok'      },
  { key: 'petro', pct: 12, bar: 'bg-caution' },
  { key: 'other', pct: 8,  bar: 'bg-text3'   },
];

export default function EconomicImpactPanel({ state }: Props) {
  const { t } = useLang();

  const statusColor =
    state === 'OPEN'             ? 'text-ok border-ok/30 bg-ok/[0.06]'
    : state === 'PARTIALLY_CLOSED' ? 'text-caution border-caution/30 bg-caution/[0.07]'
    : 'text-danger border-danger/35 bg-danger/[0.08]';

  const flowMsg =
    state === 'OPEN'             ? t.economic.flowNormal
    : state === 'PARTIALLY_CLOSED' ? t.economic.flowRisk
    : t.economic.flowBlocked;

  return (
    <section className="rounded-xl border border-divider bg-card/60 backdrop-blur-sm p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
          <DollarSign size={13} className="text-accent" />
          {t.economic.title}
        </div>
        <span className="text-[10px] font-mono text-text4">{t.economic.source}</span>
      </div>

      {/* Big stat tiles */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg border border-divider bg-bg1/60 p-3 text-center">
          <div className="text-[19px] font-mono font-bold text-text">{t.economic.dailyValue}</div>
          <div className="text-[9px] font-mono text-text3 uppercase tracking-wide mt-0.5">{t.economic.daily}</div>
        </div>
        <div className="rounded-lg border border-divider bg-bg1/60 p-3 text-center">
          <div className="text-[19px] font-mono font-bold text-text">{t.economic.annualValue}</div>
          <div className="text-[9px] font-mono text-text3 uppercase tracking-wide mt-0.5">{t.economic.annual}</div>
        </div>
        <div className="rounded-lg border border-divider bg-bg1/60 p-3 text-center">
          <div className="text-[19px] font-mono font-bold text-accent">{t.economic.oilDailyValue}</div>
          <div className="text-[9px] font-mono text-text3 uppercase tracking-wide mt-0.5">{t.economic.oilDaily}</div>
        </div>
      </div>

      {/* Sector breakdown */}
      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-text3 mb-3">
        {t.economic.sectors}
      </p>
      <div className="space-y-2.5 mb-5">
        {SECTORS.map(({ key, pct, bar }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono text-text2">{t.economic[key]}</span>
              <span className="text-[11px] font-mono font-bold text-text3">{pct}%</span>
            </div>
            <div className="h-1.5 bg-bg2 rounded-full overflow-hidden border border-divider">
              <div
                className={`h-full rounded-full ${bar} transition-all duration-700`}
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Live status callout */}
      <div className={`px-3 py-2.5 rounded-lg border text-[11px] font-mono flex flex-wrap items-center gap-2 ${statusColor}`}>
        <span className="font-bold tracking-wide">{t.economic.currentFlow}</span>
        <span className="text-text3">—</span>
        <span>{flowMsg}</span>
      </div>
    </section>
  );
}
