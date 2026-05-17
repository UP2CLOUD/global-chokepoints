'use client';

import { Anchor } from 'lucide-react';
import { useLang } from './LangContext';

type ChokepointKey = 'hormuz' | 'malacca' | 'suez' | 'babelmandeb' | 'turkish';

interface Chokepoint {
  key: ChokepointKey;
  region: string;
  dailyOil: string;
  dailyTotal: string;
  riskKey: 'critical' | 'high' | 'medium' | 'low';
  isCurrent?: boolean;
}

const CHOKEPOINTS: Chokepoint[] = [
  { key: 'hormuz',      region: '🇮🇷🇴🇲', dailyOil: '21 Mb/d',  dailyTotal: '$3.4B/d', riskKey: 'critical', isCurrent: true },
  { key: 'malacca',     region: '🇲🇾🇸🇬', dailyOil: '16 Mb/d',  dailyTotal: '$2.6B/d', riskKey: 'medium' },
  { key: 'suez',        region: '🇪🇬',    dailyOil: '9 Mb/d',   dailyTotal: '$9.7B/d', riskKey: 'high'   },
  { key: 'babelmandeb', region: '🇾🇪🇩🇯', dailyOil: '6.2 Mb/d', dailyTotal: '$1.0B/d', riskKey: 'high'   },
  { key: 'turkish',     region: '🇹🇷',    dailyOil: '3 Mb/d',   dailyTotal: '$0.5B/d', riskKey: 'low'    },
];

const RISK_BADGE: Record<string, string> = {
  critical: 'text-danger border-danger/40 bg-danger/[0.09]',
  high:     'text-caution border-caution/40 bg-caution/[0.07]',
  medium:   'text-accent border-accent/30 bg-accent/[0.06]',
  low:      'text-ok border-ok/30 bg-ok/[0.06]',
};

export default function ChokepointsPanel() {
  const { t } = useLang();

  return (
    <section className="rounded-xl border border-divider bg-card/60 backdrop-blur-sm p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
          <Anchor size={13} className="text-accent" />
          {t.chokepoints.title}
        </div>
        <span className="text-[10px] font-mono text-text4">{t.chokepoints.source}</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 gap-y-1 mb-2 px-1">
        <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-text4">{t.chokepoints.colName}</span>
        <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-text4 text-right">{t.chokepoints.colOil}</span>
        <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-text4 text-right hidden sm:block">{t.chokepoints.colTrade}</span>
        <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-text4 text-right hidden md:block">{t.chokepoints.colBypass}</span>
        <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-text4 text-right">{t.chokepoints.colRisk}</span>
      </div>

      <div className="divide-y divide-divider/50">
        {CHOKEPOINTS.map((cp) => {
          const cpT = t.chokepoints[cp.key];
          return (
            <div
              key={cp.key}
              className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center py-2.5 px-1 rounded-sm ${
                cp.isCurrent ? 'bg-accent/[0.04]' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{cp.region}</span>
                  <span className={`text-[12px] font-mono truncate ${cp.isCurrent ? 'text-accent font-semibold' : 'text-text'}`}>
                    {cpT.name}
                  </span>
                  {cp.isCurrent && (
                    <span className="text-[8px] font-mono text-accent border border-accent/30 px-1 py-0.5 rounded">
                      ↗ {t.chokepoints.current}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-text text-right">{cp.dailyOil}</span>
              <span className="text-[11px] font-mono text-text3 text-right hidden sm:block">{cp.dailyTotal}</span>
              <div className="text-right hidden md:block">
                <span className="text-[10px] font-mono text-text3">{cpT.bypass}</span>
                <span className="text-[9px] font-mono text-text4 ml-1">({cpT.bypassExtra})</span>
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border text-right ${RISK_BADGE[cp.riskKey]}`}>
                {t.chokepoints[cp.riskKey]}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[10px] font-mono text-text4">{t.chokepoints.note}</p>
    </section>
  );
}
