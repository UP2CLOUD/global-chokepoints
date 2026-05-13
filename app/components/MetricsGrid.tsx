'use client';

import { MetricsData } from '@/app/lib/types';
import { useLang } from './LangContext';
import MetricCard from './MetricCard';
import { DollarSign, Radio, AlertTriangle, TrendingUp } from 'lucide-react';
import { fmtDateShort } from '@/app/lib/utils';

interface Props {
  metrics: MetricsData;
  loading?: boolean;
}

export default function MetricsGrid({ metrics, loading = false }: Props) {
  const { lang, t } = useLang();
  const locale = lang === 'en' ? 'en-US' : 'pt-BR';

  const eventsDelta = metrics.eventsChange;
  const eventsChangeStr =
    eventsDelta === 0
      ? '±0'
      : `${eventsDelta > 0 ? '+' : ''}${eventsDelta} ${lang === 'en' ? 'vs prev. 24h' : 'vs. 24h ant.'}`;

  const brentDown = !!metrics.brentDown;
  const eventsDown = !!metrics.eventsDown;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      <MetricCard
        title={t.metrics.brent}
        value={`$${metrics.brentPrice.toFixed(2)}`}
        icon={<DollarSign size={14} />}
        change={`${metrics.brentChange >= 0 ? '+' : ''}${metrics.brentChange.toFixed(2)} (${metrics.brentChangePercent >= 0 ? '+' : ''}${metrics.brentChangePercent.toFixed(2)}%)`}
        changeType={metrics.brentChange >= 0 ? 'up' : 'down'}
        source="Yahoo Finance"
        spark={metrics.brentHistory}
        asOf={metrics.brentAsOf}
        refreshSec={300}
        down={brentDown}
        delay={0.05}
        loading={loading}
      />
      <MetricCard
        title={t.metrics.events24h}
        value={String(metrics.eventsLast24h)}
        icon={<Radio size={14} />}
        change={eventsChangeStr}
        changeType={eventsDelta > 0 ? 'up' : eventsDelta < 0 ? 'down' : 'neutral'}
        source="GDELT + RSS"
        asOf={metrics.eventsAsOf}
        refreshSec={60}
        down={eventsDown}
        delay={0.1}
        loading={loading}
      />
      <MetricCard
        title={t.metrics.lastIncident}
        value={
          metrics.lastIncident
            ? fmtDateShort(metrics.lastIncident, locale)
            : t.none
        }
        icon={<AlertTriangle size={14} />}
        source={lang === 'en' ? 'derived from RSS' : 'derivado do RSS'}
        asOf={metrics.eventsAsOf}
        refreshSec={60}
        delay={0.15}
        loading={loading}
      />
      <MetricCard
        title={t.metrics.variation24h}
        value={`${metrics.brentChangePercent >= 0 ? '+' : ''}${metrics.brentChangePercent.toFixed(2)}%`}
        icon={<TrendingUp size={14} />}
        changeType={metrics.brentChangePercent >= 0 ? 'up' : 'down'}
        source="Yahoo Finance"
        asOf={metrics.brentAsOf}
        refreshSec={300}
        down={brentDown}
        tone={Math.abs(metrics.brentChangePercent) >= 3 ? 'caution' : 'default'}
        delay={0.2}
        loading={loading}
      />
    </div>
  );
}
