'use client';

import { useEffect, useState } from 'react';
import { useLang } from './LangContext';
import MetricCard from './MetricCard';
import { Ship } from 'lucide-react';

type PortWatchResp = {
  ok: boolean;
  todayTotal: number;
  sevenDayAvg: number;
  baselineDaily: number;
  vsBaseline: number;
  latestDate: string;
};

interface Props {
  loading?: boolean;
  delay?: number;
}

/**
 * Self-fetching MetricCard for IMF PortWatch daily Hormuz transit count.
 * Shows today's vessel count vs. the pre-2026 baseline (~34/day).
 */
export default function TransitMetricCard({ loading: parentLoading = false, delay = 0.2 }: Props) {
  const { t } = useLang();
  const [data, setData] = useState<PortWatchResp | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await fetch('/api/portwatch', { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
        if (r.ok) {
          const j = await r.json() as PortWatchResp;
          if (mounted && j.ok) setData(j);
        }
      } catch { /* keep null */ } finally {
        if (mounted) setFetching(false);
      }
    };
    load();
    const id = setInterval(load, 30 * 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const isLoading = parentLoading || fetching;

  if (isLoading) {
    return (
      <MetricCard
        title={t.transit.dailyTransits}
        value="0"
        icon={<Ship size={14} />}
        loading={true}
        delay={delay}
      />
    );
  }

  if (!data) {
    return (
      <MetricCard
        title={t.transit.dailyTransits}
        value="—"
        icon={<Ship size={14} />}
        source="IMF PortWatch"
        down={true}
        delay={delay}
      />
    );
  }

  const { todayTotal, vsBaseline, sevenDayAvg, baselineDaily } = data;

  // Tone: 0 vessels = danger, <15% baseline = danger, <40% = caution, else ok
  const ratio = todayTotal / baselineDaily;
  const tone =
    todayTotal === 0         ? 'danger'
    : ratio < 0.15           ? 'danger'
    : ratio < 0.4            ? 'caution'
    : 'ok';

  const changeSign = vsBaseline >= 0 ? '+' : '';
  const changeStr = `${changeSign}${vsBaseline}% vs avg · ${sevenDayAvg.toFixed(1)} 7d avg`;

  return (
    <MetricCard
      title={t.transit.dailyTransits}
      value={String(todayTotal)}
      icon={<Ship size={14} />}
      change={changeStr}
      changeType={vsBaseline >= 0 ? 'up' : 'down'}
      source="IMF PortWatch"
      tone={tone}
      delay={delay}
    />
  );
}
