'use client';

import { Activity } from 'lucide-react';

type OpStatus = 'critical' | 'degraded' | 'elevated' | 'normal';
type Trend    = 'up' | 'stable' | 'down';

interface ChokepointDef {
  key:        string;
  name:       string;
  region:     string;
  codes:      string;
  status:     OpStatus;
  riskPct:    number;
  oilMbd:     string;
  tradePerDay:string;
  vessels24h: number;
  trend:      Trend;
  alerts:     number;
  isFocus?:   boolean;
}

const CHOKEPOINTS: ChokepointDef[] = [
  {
    key: 'hormuz', name: 'Strait of Hormuz', region: 'Persian Gulf',
    codes: 'IR / OM', status: 'critical', riskPct: 88,
    oilMbd: '21 Mb/d', tradePerDay: '$3.4B/d', vessels24h: 52,
    trend: 'stable', alerts: 3, isFocus: true,
  },
  {
    key: 'redsea', name: 'Red Sea', region: 'Bab el-Mandeb',
    codes: 'YE / DJ', status: 'degraded', riskPct: 74,
    oilMbd: '6.2 Mb/d', tradePerDay: '$1.0B/d', vessels24h: 28,
    trend: 'down', alerts: 12,
  },
  {
    key: 'suez', name: 'Suez Canal', region: 'Egypt',
    codes: 'EG', status: 'elevated', riskPct: 57,
    oilMbd: '9 Mb/d', tradePerDay: '$9.7B/d', vessels24h: 45,
    trend: 'down', alerts: 7,
  },
  {
    key: 'panama', name: 'Panama Canal', region: 'Central America',
    codes: 'PA', status: 'elevated', riskPct: 41,
    oilMbd: '—', tradePerDay: '$270M/d', vessels24h: 35,
    trend: 'stable', alerts: 2,
  },
  {
    key: 'taiwan', name: 'Taiwan Strait', region: 'Western Pacific',
    codes: 'TW / CN', status: 'elevated', riskPct: 46,
    oilMbd: '—', tradePerDay: '$2.4B/d', vessels24h: 128,
    trend: 'stable', alerts: 1,
  },
];

const STATUS: Record<OpStatus, {
  label: string;
  barClass: string;
  textClass: string;
  ringClass: string;
  subtleBg: string;
}> = {
  critical: { label: 'CRITICAL', barClass: 'bg-danger',  textClass: 'text-danger',  ringClass: 'border-danger/25',  subtleBg: 'bg-danger/[0.04]'  },
  degraded: { label: 'DEGRADED', barClass: 'bg-warn',    textClass: 'text-warn',    ringClass: 'border-warn/25',    subtleBg: 'bg-warn/[0.04]'    },
  elevated: { label: 'ELEVATED', barClass: 'bg-caution', textClass: 'text-caution', ringClass: 'border-caution/20', subtleBg: 'bg-caution/[0.03]'  },
  normal:   { label: 'NORMAL',   barClass: 'bg-ok',      textClass: 'text-ok',      ringClass: 'border-ok/20',      subtleBg: ''                  },
};

const TREND_GLYPH: Record<Trend, { glyph: string; cls: string }> = {
  up:     { glyph: '↑', cls: 'text-ok'     },
  stable: { glyph: '→', cls: 'text-text4'  },
  down:   { glyph: '↓', cls: 'text-danger' },
};

export default function ChokepointsPanel() {
  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.22em] text-text3">
          <Activity size={11} className="text-accent" />
          Strategic Chokepoints
        </div>
        <span className="text-[9px] font-mono text-text4">EIA · IEA · IMF PortWatch</span>
      </div>

      {/* Card grid — 1 col → 2 col → 5 col */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-px bg-divider border border-divider">
        {CHOKEPOINTS.map((cp) => {
          const s = STATUS[cp.status];
          const tr = TREND_GLYPH[cp.trend];
          return (
            <div
              key={cp.key}
              className={`bg-bg1 p-4 flex flex-col gap-3 ${cp.isFocus ? s.subtleBg : ''}`}
            >
              {/* Status + name */}
              <div>
                <div className={`flex items-center gap-1.5 mb-1.5 ${s.textClass}`}>
                  <span
                    className={`w-1 h-1 rounded-full ${s.barClass} animate-[live-pulse_2.4s_ease-in-out_infinite]`}
                    aria-hidden
                  />
                  <span className="text-[8px] font-mono font-bold uppercase tracking-[0.2em]">
                    {s.label}
                  </span>
                </div>
                <div className={`text-[12px] font-mono font-semibold leading-tight ${cp.isFocus ? 'text-accent' : 'text-text'}`}>
                  {cp.name}
                </div>
                <div className="text-[9px] font-mono text-text4 mt-0.5">
                  {cp.region} · {cp.codes}
                </div>
              </div>

              {/* Risk bar */}
              <div>
                <div className="h-[2px] bg-bg2 mb-1">
                  <div
                    className={`h-full ${s.barClass} transition-all duration-700`}
                    style={{ width: `${cp.riskPct}%` }}
                    role="meter"
                    aria-valuenow={cp.riskPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${cp.name} risk: ${cp.riskPct}/100`}
                  />
                </div>
                <div className="flex justify-between text-[8px] font-mono">
                  <span className="text-text4">RISK INDEX</span>
                  <span className={s.textClass}>{cp.riskPct}/100</span>
                </div>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-1 pt-2.5 border-t border-divider/60">
                <div>
                  <div className="text-[8px] font-mono text-text4 uppercase mb-0.5">OIL</div>
                  <div className="text-[10px] font-mono font-bold text-text leading-none">{cp.oilMbd}</div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-text4 uppercase mb-0.5">TRADE</div>
                  <div className="text-[10px] font-mono font-bold text-text leading-none">{cp.tradePerDay}</div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-text4 uppercase mb-0.5">VES/D</div>
                  <div className="text-[10px] font-mono font-bold text-text leading-none">{cp.vessels24h}</div>
                </div>
              </div>

              {/* Trend + alerts */}
              <div className="flex items-center justify-between pt-1">
                <span className={`text-[9px] font-mono flex items-center gap-1 ${tr.cls}`}>
                  {tr.glyph}
                  <span className="text-text4">{cp.trend.toUpperCase()}</span>
                </span>
                {cp.alerts > 0 && (
                  <span className={`text-[8px] font-mono px-1.5 py-0.5 border ${s.ringClass} ${s.textClass}`}>
                    {cp.alerts} ALERT{cp.alerts > 1 ? 'S' : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[9px] font-mono text-text4">
        Risk indices reflect current geopolitical assessment. Not navigational advice.
      </p>
    </section>
  );
}
