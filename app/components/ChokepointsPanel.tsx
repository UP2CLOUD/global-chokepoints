'use client';

import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { CHOKEPOINT_KEYWORDS } from '@/app/lib/constants';
import type { TimelineEvent } from '@/app/lib/types';
import type { ChokepointStats } from '@/app/api/portwatch/route';

type OpStatus = 'critical' | 'degraded' | 'elevated' | 'normal';
type Trend    = 'up' | 'stable' | 'down';

// 7-day SVG sparkline for vessel transit trend
const SPARK_COLOR: Record<OpStatus, string> = {
  critical: '#EF4444', degraded: '#F97316', elevated: '#F59E0B', normal: '#10B981',
};

function Sparkline({ days, status }: { days: { total: number }[]; status: OpStatus }) {
  const recent = days.slice(-14);
  if (recent.length < 2) return null;
  const vals = recent.map(d => d.total);
  const max  = Math.max(...vals, 1);
  const W = 100, H = 18;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - (v / max) * (H - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div className="pt-1.5 border-t border-divider/40">
      <div className="text-[7px] font-mono text-text4 mb-0.5 uppercase tracking-[0.12em]">14-day transit</div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <polyline
          points={pts}
          fill="none"
          stroke={SPARK_COLOR[status]}
          strokeWidth="1.5"
          strokeOpacity="0.55"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

interface ChokepointDef {
  key:        string;
  name:       string;
  region:     string;
  codes:      string;
  status:     OpStatus;
  riskPct:    number;
  oilMbd:     string;
  tradePerDay:string;
  isFocus?:   boolean;
}

const CHOKEPOINTS: ChokepointDef[] = [
  {
    key: 'hormuz', name: 'Strait of Hormuz', region: 'Persian Gulf',
    codes: 'IR / OM', status: 'critical', riskPct: 88,
    oilMbd: '21 Mb/d', tradePerDay: '$3.4B/d', isFocus: true,
  },
  {
    key: 'redsea', name: 'Red Sea', region: 'Bab el-Mandeb',
    codes: 'YE / DJ', status: 'degraded', riskPct: 74,
    oilMbd: '6.2 Mb/d', tradePerDay: '$1.0B/d',
  },
  {
    key: 'suez', name: 'Suez Canal', region: 'Egypt',
    codes: 'EG', status: 'elevated', riskPct: 57,
    oilMbd: '9 Mb/d', tradePerDay: '$9.7B/d',
  },
  {
    key: 'panama', name: 'Panama Canal', region: 'Central America',
    codes: 'PA', status: 'elevated', riskPct: 41,
    oilMbd: '—', tradePerDay: '$270M/d',
  },
  {
    key: 'taiwan', name: 'Taiwan Strait', region: 'Western Pacific',
    codes: 'TW / CN', status: 'elevated', riskPct: 46,
    oilMbd: '—', tradePerDay: '$2.4B/d',
  },
];

// Static vessel counts used when PortWatch data is unavailable
const STATIC_VESSELS: Record<string, number> = {
  hormuz: 52, redsea: 28, suez: 45, panama: 35, taiwan: 128,
};

const STATUS: Record<OpStatus, {
  label: string; barClass: string; textClass: string; ringClass: string; subtleBg: string;
}> = {
  critical: { label: 'CRITICAL', barClass: 'bg-danger',  textClass: 'text-danger',  ringClass: 'border-danger/25',  subtleBg: 'bg-danger/[0.04]'  },
  degraded: { label: 'DEGRADED', barClass: 'bg-warn',    textClass: 'text-warn',    ringClass: 'border-warn/25',    subtleBg: 'bg-warn/[0.04]'    },
  elevated: { label: 'ELEVATED', barClass: 'bg-caution', textClass: 'text-caution', ringClass: 'border-caution/20', subtleBg: 'bg-caution/[0.03]'  },
  normal:   { label: 'NORMAL',   barClass: 'bg-ok',      textClass: 'text-ok',      ringClass: 'border-ok/20',      subtleBg: ''                  },
};

const TREND_GLYPH: Record<Trend, { glyph: string; cls: string }> = {
  up:     { glyph: '↑', cls: 'text-danger' },
  stable: { glyph: '→', cls: 'text-text4'  },
  down:   { glyph: '↓', cls: 'text-ok'     },
};

// Count events matching a keyword set within a time window
function countEvents(events: TimelineEvent[], keywords: string[], fromMs: number, toMs: number): number {
  return events.filter(e => {
    const t = +new Date(e.date);
    if (isNaN(t) || t < fromMs || t > toMs) return false;
    const text = `${e.title} ${e.description}`.toLowerCase();
    return keywords.some(kw => text.includes(kw));
  }).length;
}

interface Props {
  timeline?: TimelineEvent[];
}

export default function ChokepointsPanel({ timeline = [] }: Props) {
  const [pwData, setPwData] = useState<Record<string, ChokepointStats> | null>(null);

  useEffect(() => {
    fetch('/api/portwatch', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.chokepoints) setPwData(d.chokepoints); })
      .catch(() => {});
  }, []);

  const now = Date.now();
  const last24Ms  = now - 86_400_000;
  const prev24Ms  = now - 172_800_000;

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
          const s  = STATUS[cp.status];
          const pw = pwData?.[cp.key];

          // Live vessel count from PortWatch, or static fallback
          const vessels24h = pw?.todayTotal ?? STATIC_VESSELS[cp.key] ?? 0;
          const vsBaseline = pw?.vsBaseline ?? 0;

          // Derive trend from PortWatch baseline deviation
          const pwTrend: Trend = pw
            ? vsBaseline <= -10 ? 'down' : vsBaseline >= 10 ? 'up' : 'stable'
            : 'stable';

          const tr = TREND_GLYPH[pwTrend];

          // Per-chokepoint live event count
          const keywords = CHOKEPOINT_KEYWORDS[cp.key] ?? [];
          const events24h  = timeline.length > 0 ? countEvents(timeline, keywords, last24Ms, now) : null;
          const eventsPrev = timeline.length > 0 ? countEvents(timeline, keywords, prev24Ms, last24Ms) : null;
          const eventTrend: Trend | null = events24h != null && eventsPrev != null
            ? events24h > eventsPrev + 1 ? 'up' : events24h < eventsPrev - 1 ? 'down' : 'stable'
            : null;

          const showAlert = events24h != null && events24h > 0;

          return (
            <div
              key={cp.key}
              className={`bg-bg1 p-4 flex flex-col gap-3 card-tactical ${cp.isFocus ? s.subtleBg : ''}`}
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
                  <div className={`text-[10px] font-mono font-bold leading-none ${pw ? 'text-accent' : 'text-text'}`}>
                    {vessels24h}
                    {pw && vsBaseline !== 0 && (
                      <span className={`text-[8px] ml-0.5 ${vsBaseline < 0 ? 'text-danger' : 'text-ok'}`}>
                        {vsBaseline > 0 ? '+' : ''}{vsBaseline}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 14-day sparkline (when PortWatch data available) */}
              {pw?.days && pw.days.length > 2 && (
                <Sparkline days={pw.days} status={cp.status} />
              )}

              {/* Trend + event alert */}
              <div className="flex items-center justify-between pt-1">
                <span className={`text-[9px] font-mono flex items-center gap-1 ${tr.cls}`}>
                  {tr.glyph}
                  <span className="text-text4">{pwTrend.toUpperCase()}</span>
                </span>
                <div className="flex items-center gap-1">
                  {showAlert && (
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 border ${s.ringClass} ${s.textClass}`}>
                      {events24h} EVT{(events24h ?? 0) > 1 ? 'S' : ''}
                    </span>
                  )}
                  {eventTrend && showAlert && (
                    <span className={`text-[9px] font-mono ${TREND_GLYPH[eventTrend].cls}`}>
                      {TREND_GLYPH[eventTrend].glyph}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[9px] font-mono text-text4">
        Vessel counts: IMF PortWatch (1–2 day lag) · Events: GDELT + RSS · Risk indices are assessments only, not navigational advice.
      </p>
    </section>
  );
}
