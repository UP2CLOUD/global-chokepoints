'use client';

import { MetricsData } from '@/app/lib/types';
import { useLang } from './LangContext';
import MetricCard from './MetricCard';
import TransitMetricCard from './TransitMetricCard';
import { DollarSign, Radio, AlertTriangle } from 'lucide-react';
import { fmtDateShort } from '@/app/lib/utils';

interface Props {
  metrics: MetricsData;
  loading?: boolean;
}

export default function MetricsGrid({ metrics, loading = false }: Props) {
  const { t, locale } = useLang();

  const eventsDelta = metrics.eventsChange;
  const eventsChangeStr =
    eventsDelta === 0
      ? '±0'
      : `${eventsDelta > 0 ? '↑' : '↓'} ${Math.abs(eventsDelta)} ${t.metrics.vsPrev24h}`;

  const brentDown = !!metrics.brentDown;
  const eventsDown = !!metrics.eventsDown;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 py-1">

      {/* Brent Crude */}
      <div className="py-5 pr-5 lg:pr-8 border-r border-divider">
        <MetricCard
          title={t.metrics.brent}
          value={`$${metrics.brentPrice.toFixed(2)}`}
          icon={<DollarSign size={11} />}
          change={`${metrics.brentChange >= 0 ? '↑' : '↓'} ${Math.abs(metrics.brentChange).toFixed(2)} (${metrics.brentChangePercent >= 0 ? '+' : ''}${metrics.brentChangePercent.toFixed(2)}%)`}
          changeType={metrics.brentChange >= 0 ? 'up' : 'down'}
          source="Yahoo Finance"
          spark={metrics.brentHistory}
          asOf={metrics.brentAsOf}
          refreshSec={300}
          down={brentDown}
          delay={0.05}
          loading={loading}
        />
      </div>

      {/* Events 24h */}
      <div className="py-5 pl-5 lg:pl-8 lg:pr-8 border-r border-divider">
        <MetricCard
          title={t.metrics.events24h}
          value={String(metrics.eventsLast24h)}
          icon={<Radio size={11} />}
          change={eventsChangeStr}
          changeType={eventsDelta > 0 ? 'up' : eventsDelta < 0 ? 'down' : 'neutral'}
          source="GDELT + RSS"
          asOf={metrics.eventsAsOf}
          refreshSec={60}
          down={eventsDown}
          delay={0.1}
          loading={loading}
        />
      </div>

      {/* Last Incident */}
      <div className="py-5 pl-5 lg:pl-8 lg:pr-8 border-t border-divider lg:border-t-0 lg:border-r lg:border-divider">
        <MetricCard
          title={t.metrics.lastIncident}
          value={
            metrics.lastIncident
              ? fmtDateShort(metrics.lastIncident, locale)
              : t.none
          }
          icon={<AlertTriangle size={11} />}
          source={t.metrics.derivedFromRss}
          asOf={metrics.eventsAsOf}
          refreshSec={60}
          delay={0.15}
          loading={loading}
        />
      </div>

      {/* Vessel Transits */}
      <div className="py-5 pl-5 lg:pl-8 border-t border-divider lg:border-t-0">
        <TransitMetricCard loading={loading} delay={0.2} />
      </div>
    </div>
  );
}
