'use client';

import { Ship } from 'lucide-react';
import { useLang } from './LangContext';
import type { StraitStatus } from '@/app/lib/types';

interface Props {
  state: StraitStatus;
  tensionIndex: number;
}

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Crude tankers and LNG carriers are the highest-value, most targeted cargo
// classes; their sensitivity offset pushes them to higher risk tiers first.
const CARGO_CLASSES: { key: 'crude' | 'lng' | 'container' | 'chemical'; icon: string; offset: number }[] = [
  { key: 'crude',     icon: '🛢️', offset: 15 },
  { key: 'lng',       icon: '🔵', offset: 10 },
  { key: 'chemical',  icon: '⚗️', offset: 5  },
  { key: 'container', icon: '📦', offset: 0  },
];

function riskLevel(state: StraitStatus, tension: number, offset: number): RiskLevel {
  if (state === 'CLOSED') return 'critical';
  const score = tension + offset;
  if (state === 'PARTIALLY_CLOSED' || score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

const RISK_BADGE: Record<RiskLevel, string> = {
  low:      'text-ok border-ok/30 bg-ok/[0.06]',
  medium:   'text-caution border-caution/30 bg-caution/[0.07]',
  high:     'text-danger border-danger/35 bg-danger/[0.10]',
  critical: 'text-danger border-danger/50 bg-danger/[0.18]',
};
const RISK_BAR: Record<RiskLevel, string> = {
  low:      'bg-ok',
  medium:   'bg-caution',
  high:     'bg-danger',
  critical: 'bg-danger',
};
const RISK_PCT: Record<RiskLevel, number> = {
  low: 22, medium: 50, high: 75, critical: 100,
};

export default function ShippingRiskPanel({ state, tensionIndex }: Props) {
  const { t } = useLang();

  return (
    <section className="rounded-xl border border-divider bg-card/60 backdrop-blur-sm p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
          <Ship size={13} className="text-accent" />
          {t.risk.title}
        </div>
        <span className="text-[10px] font-mono text-text4">{t.risk.subtitle}</span>
      </div>

      {/* Cargo rows */}
      <div className="space-y-4">
        {CARGO_CLASSES.map(({ key, icon, offset }) => {
          const risk = riskLevel(state, tensionIndex, offset);
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-mono text-text flex items-center gap-2">
                  <span>{icon}</span>
                  <span>{t.risk[key]}</span>
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${RISK_BADGE[risk]}`}>
                  {t.risk[risk]}
                </span>
              </div>
              <div className="h-1.5 bg-bg2 rounded-full overflow-hidden border border-divider">
                <div
                  className={`h-full rounded-full ${RISK_BAR[risk]} transition-all duration-700`}
                  style={{ width: `${RISK_PCT[risk]}%` }}
                  role="progressbar"
                  aria-valuenow={RISK_PCT[risk]}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${t.risk[key]} — ${t.risk[risk]}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-[10px] font-mono text-text4 leading-relaxed">
        {t.risk.source}
      </p>
    </section>
  );
}
