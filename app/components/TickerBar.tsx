'use client';

import { useEffect, useState } from 'react';
import { StatusData, MetricsData } from '@/app/lib/types';

interface Props {
  status?: StatusData;
  metrics?: MetricsData;
}

interface TickerItem {
  label: string;
  value: string;
  colorClass: string;
}

type CPStatus = 'critical' | 'degraded' | 'elevated' | 'normal';

const CP_LABEL: Record<CPStatus, string>    = { critical: 'CRITICAL', degraded: 'DEGRADED', elevated: 'ELEVATED', normal: 'NORMAL' };
const CP_COLOR: Record<CPStatus, string>    = { critical: 'text-danger', degraded: 'text-warn', elevated: 'text-caution', normal: 'text-ok' };

function statusColor(state?: string): string {
  if (!state) return 'text-text4';
  if (state === 'OPEN') return 'text-ok';
  if (state === 'CLOSED') return 'text-danger';
  return 'text-caution';
}

const SEP = '·';

export default function TickerBar({ status, metrics }: Props) {
  const [cpLive, setCpLive] = useState<Record<string, CPStatus>>({});

  useEffect(() => {
    fetch('/v1/chokepoints', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.chokepoints) return;
        const map: Record<string, CPStatus> = {};
        for (const cp of d.chokepoints as { key: string; status: string }[]) {
          map[cp.key] = (cp.status as CPStatus) ?? 'normal';
        }
        setCpLive(map);
      })
      .catch(() => {});
  }, []);

  const cpValue = (key: string, fallback: CPStatus): string => {
    const s = cpLive[key] ?? fallback;
    return CP_LABEL[s] ?? s.toUpperCase();
  };
  const cpColor = (key: string, fallback: CPStatus): string => {
    const s = cpLive[key] ?? fallback;
    return CP_COLOR[s] ?? 'text-text4';
  };

  const hormuzValue = status
    ? status.state === 'OPEN' ? 'OPEN' : status.state === 'CLOSED' ? 'CLOSED' : 'DISRUPTED'
    : 'MONITORING';

  const items: TickerItem[] = [
    { label: 'HORMUZ',       value: hormuzValue,                                        colorClass: statusColor(status?.state) },
    { label: 'RED SEA',      value: cpValue('redsea', 'degraded'),                      colorClass: cpColor('redsea', 'degraded') },
    { label: 'SUEZ',         value: cpValue('suez', 'elevated'),                        colorClass: cpColor('suez', 'elevated') },
    { label: 'PANAMA',       value: cpValue('panama', 'elevated'),                      colorClass: cpColor('panama', 'elevated') },
    { label: 'TAIWAN STR.',  value: cpValue('taiwan', 'elevated'),                      colorClass: cpColor('taiwan', 'elevated') },
    { label: 'BRENT',        value: metrics?.brentPrice ? `$${metrics.brentPrice.toFixed(2)}/bbl` : '$—/bbl', colorClass: 'text-text3' },
    { label: 'EVENTS 24H',   value: metrics?.eventsLast24h != null ? String(metrics.eventsLast24h) : '—', colorClass: metrics?.eventsLast24h ? 'text-caution' : 'text-text4' },
    { label: 'AIS FEEDS',    value: 'ACTIVE',                                           colorClass: 'text-ok'     },
    { label: 'RSS FEEDS',    value: 'LIVE',                                             colorClass: 'text-ok'     },
    { label: 'CHOKEPOINTS',  value: '5 MONITORED',                                     colorClass: 'text-accent'  },
    { label: 'VESSEL TRACK', value: 'ONLINE',                                           colorClass: 'text-ok'     },
    { label: 'DATA FEEDS',   value: 'OPERATIONAL',                                     colorClass: 'text-ok'     },
  ];

  // Double for seamless loop
  const all = [...items, ...items];

  return (
    <div
      className="w-full bg-bg overflow-hidden relative border-b border-divider/50"
      style={{ height: '26px' }}
      aria-hidden="true"
    >
      {/* Edge fades */}
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-bg to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-bg to-transparent pointer-events-none" />

      <div
        className="flex items-center h-full"
        style={{
          width: 'max-content',
          animation: 'ticker 55s linear infinite',
        }}
      >
        {all.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 px-6 shrink-0">
            <span className="text-[8px] font-mono text-text4 uppercase tracking-[0.2em]">
              {item.label}
            </span>
            <span className="text-[8px] text-text4/50">{SEP}</span>
            <span className={`text-[8px] font-mono font-semibold uppercase tracking-[0.14em] ${item.colorClass}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
