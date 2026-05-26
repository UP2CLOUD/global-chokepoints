'use client';

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

function statusColor(state?: string): string {
  if (!state) return 'text-text4';
  if (state === 'OPEN') return 'text-ok';
  if (state === 'CLOSED') return 'text-danger';
  return 'text-caution';
}

const SEP = '·';

export default function TickerBar({ status, metrics }: Props) {
  const hormuzValue = status
    ? status.state === 'OPEN' ? 'OPEN' : status.state === 'CLOSED' ? 'CLOSED' : 'DISRUPTED'
    : 'MONITORING';

  const items: TickerItem[] = [
    { label: 'HORMUZ',       value: hormuzValue,                          colorClass: statusColor(status?.state) },
    { label: 'RED SEA',      value: 'DEGRADED',                           colorClass: 'text-warn'   },
    { label: 'SUEZ',         value: 'ELEVATED',                           colorClass: 'text-caution' },
    { label: 'PANAMA',       value: 'ELEVATED',                           colorClass: 'text-caution' },
    { label: 'TAIWAN STR.',  value: 'ELEVATED',                           colorClass: 'text-caution' },
    { label: 'BRENT',        value: metrics?.brentPrice ? `$${metrics.brentPrice.toFixed(2)}/bbl` : '$—/bbl', colorClass: 'text-text3' },
    { label: 'EVENTS 24H',   value: metrics?.eventsLast24h != null ? String(metrics.eventsLast24h) : '—', colorClass: metrics?.eventsLast24h ? 'text-caution' : 'text-text4' },
    { label: 'AIS FEEDS',    value: 'ACTIVE',                             colorClass: 'text-ok'     },
    { label: 'RSS FEEDS',    value: 'LIVE',                               colorClass: 'text-ok'     },
    { label: 'CHOKEPOINTS',  value: '5 MONITORED',                        colorClass: 'text-accent'  },
    { label: 'VESSEL TRACK', value: 'ONLINE',                             colorClass: 'text-ok'     },
    { label: 'DATA FEEDS',   value: 'OPERATIONAL',                        colorClass: 'text-ok'     },
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
