'use client';

import { Ship, Droplets, Flame, FlaskConical, Package } from 'lucide-react';
import { useLang } from './LangContext';
import type { StraitStatus } from '@/app/lib/types';

interface Props {
  state: StraitStatus;
  tensionIndex: number;
}

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Crude tankers and LNG carriers are the highest-value, most targeted cargo
// classes; their sensitivity offset pushes them to higher risk tiers first.
const CARGO_CLASSES: { key: 'crude' | 'lng' | 'container' | 'chemical'; icon: React.ReactNode; offset: number }[] = [
  { key: 'crude',     icon: <Droplets    size={13} />, offset: 15 },
  { key: 'lng',       icon: <Flame       size={13} />, offset: 10 },
  { key: 'chemical',  icon: <FlaskConical size={13} />, offset: 5  },
  { key: 'container', icon: <Package     size={13} />, offset: 0  },
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
    <section className="h-full flex flex-col border border-divider bg-bg2 p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.22em] text-text3">
          <Ship size={11} className="text-accent" />
          {t.risk.title}
        </div>
        <span className="text-[9px] font-mono text-text4">{t.risk.subtitle}</span>
      </div>

      {/* Cargo rows */}
      <div className="flex-1 space-y-4">
        {CARGO_CLASSES.map(({ key, icon, offset }) => {
          const risk = riskLevel(state, tensionIndex, offset);
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-mono text-text flex items-center gap-2 text-text3">
                  <span aria-hidden>{icon}</span>
                  <span>{t.risk[key]}</span>
                </span>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border ${RISK_BADGE[risk]}`}>
                  {t.risk[risk]}
                </span>
              </div>
              <div className="h-[2px] bg-divider overflow-hidden">
                <div
                  className={`h-full ${RISK_BAR[risk]} transition-all duration-700`}
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
