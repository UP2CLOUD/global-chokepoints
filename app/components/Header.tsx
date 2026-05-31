'use client';

import { useEffect, useState } from 'react';
import { useLang } from './LangContext';
import LanguageSwitcher from './LanguageSwitcher';
import SupportButton from './SupportButton';
import SponsorChip from './SponsorChip';
import { StatusData, MetricsData } from '@/app/lib/types';
import { fmtTime } from '@/app/lib/utils';

interface Props {
  status?: StatusData;
  metrics?: MetricsData;
  loading?: boolean;
  vesselCount?: number;
}

export default function Header({ status, metrics, loading, vesselCount }: Props) {
  const { t, locale } = useLang();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const globalStatus = loading || !status
    ? t.header.statusSyncing
    : status.state === 'OPEN'    ? t.header.statusNormalOps
    : status.state === 'CLOSED'  ? t.header.statusCritical
    : t.header.statusElevatedRisk;

  const statusColor = loading || !status
    ? 'text-text4'
    : status.state === 'OPEN'    ? 'text-ok'
    : status.state === 'CLOSED'  ? 'text-danger'
    : 'text-caution';

  const activeIncidents = metrics?.eventsLast24h ?? 0;
  const lastUpdate      = status?.lastUpdated;

  return (
    <header className="fixed top-0 left-0 right-0 z-[1100]">

      {/* ── Telemetry strip ──────────────────────────────── */}
      <div className="bg-bg2 border-b border-divider/70">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-[26px] flex items-center gap-0 overflow-x-auto scrollbar-none">

          <div className="flex items-center gap-2 pr-4 border-r border-divider/70 shrink-0">
            <span className="text-[8px] font-mono text-text4 uppercase tracking-[0.16em]">{t.header.globalStatusLabel}</span>
            <span className={`text-[8px] font-mono font-semibold uppercase tracking-[0.12em] ${statusColor}`}>
              {globalStatus}
            </span>
          </div>

          <div className="flex items-center gap-2 px-4 border-r border-divider/70 shrink-0">
            <span className="text-[8px] font-mono text-text4 uppercase tracking-[0.16em]">{t.header.incidentsLabel}</span>
            <span className={`text-[8px] font-mono font-semibold ${activeIncidents > 0 ? 'text-caution' : 'text-text3'}`}>
              {activeIncidents}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-4 border-r border-divider/70 shrink-0">
            <span className="text-[8px] font-mono text-text4 uppercase tracking-[0.16em]">{t.header.chokepointsLabel}</span>
            <span className="text-[8px] font-mono font-semibold text-text3">{t.header.monitoredCount}</span>
          </div>

          <div className="hidden md:flex items-center gap-2 px-4 border-r border-divider/70 shrink-0">
            <span className="text-[8px] font-mono text-text4 uppercase tracking-[0.16em]">{t.header.vesselsLabel}</span>
            <span className="text-[8px] font-mono font-semibold text-text3">
              {vesselCount != null && vesselCount > 0 ? vesselCount.toLocaleString() : '—'}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 px-4 shrink-0 ml-auto">
            <span className="text-[8px] font-mono text-text4 uppercase tracking-[0.16em]">{t.header.lastUpdateLabel}</span>
            <span className="text-[8px] font-mono text-text3 tabular-nums" suppressHydrationWarning>
              {lastUpdate ? fmtTime(lastUpdate, locale) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main nav bar ─────────────────────────────────── */}
      <div
        className={`transition-colors duration-200 ${
          scrolled
            ? 'bg-bg1/97 border-b border-divider'
            : 'bg-bg/90 border-b border-white/[0.04]'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 flex items-center justify-between h-14">

          {/* Brand mark */}
          <div className="flex items-center gap-3" aria-label="Global Chokepoints Alerts">
            {/* Chokepoint icon — concentric ring with pulse dot */}
            <div className="relative w-7 h-7 shrink-0 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-accent/30" />
              <span className="absolute inset-[5px] rounded-full border border-accent/50" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-[live-pulse_2.4s_ease-in-out_infinite]" />
            </div>

            <div>
              <h1 className="text-[15px] font-bold leading-none tracking-[-0.01em] text-text">
                {t.header.title}<span className="text-accent font-semibold">{t.header.titleAccent}</span>
              </h1>
              <p className="text-[8px] font-mono text-text4 uppercase tracking-[0.22em] mt-[3px]">
                {t.header.subtitle}
              </p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3 md:gap-4">
            <SponsorChip />
            <LanguageSwitcher />

            <div className="hidden sm:flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full bg-ok animate-[live-pulse_2s_ease-in-out_infinite]"
                aria-hidden
              />
              <span className="text-[8px] font-mono text-text3 tracking-[0.22em] uppercase">
                {t.header.live}
              </span>
            </div>

            <a
              href="/methodology"
              className="hidden md:block text-[9px] font-mono text-text3 hover:text-text2 transition-colors uppercase tracking-[0.18em]"
            >
              {t.header.methodology}
            </a>
            <a
              href="/docs"
              className="hidden md:block text-[9px] font-mono text-text3 hover:text-text2 transition-colors uppercase tracking-[0.18em]"
            >
              {t.header.api}
            </a>
            <a
              href="/keys"
              className="hidden md:block text-[9px] font-mono text-text3 hover:text-text2 transition-colors uppercase tracking-[0.18em]"
            >
              API Keys
            </a>
            <a
              href="/webhooks"
              className="hidden md:block text-[9px] font-mono text-text3 hover:text-text2 transition-colors uppercase tracking-[0.18em]"
            >
              Webhooks
            </a>
            <SupportButton variant="header" />
          </div>
        </div>
      </div>
    </header>
  );
}
