'use client';

import dynamic from 'next/dynamic';
import { useDashboardData } from '@/app/hooks/useDashboardData';
import { useAisVessels }    from '@/app/hooks/useAisVessels';
import { useLang } from '@/app/components/LangContext';
import Header          from '@/app/components/Header';
import HeroStatus      from '@/app/components/HeroStatus';
import MetricsGrid     from '@/app/components/MetricsGrid';
import BrentChart      from '@/app/components/BrentChart';
import TransitChart    from '@/app/components/TransitChart';
import MarketsRail     from '@/app/components/MarketsRail';
import WeatherPanel    from '@/app/components/WeatherPanel';
import NewsFeed        from '@/app/components/NewsFeed';
import Timeline        from '@/app/components/Timeline';
import Footer          from '@/app/components/Footer';
import RefreshButton        from '@/app/components/RefreshButton';
import ScrollIndicator      from '@/app/components/ScrollIndicator';
import AdSlot               from '@/app/components/AdSlot';
import CriticalAlertBanner  from '@/app/components/CriticalAlertBanner';
import { SubscribeInlineCTA } from '@/app/components/SubscribeModal';
import GlobalExposurePanel    from '@/app/components/GlobalExposurePanel';
import StraitContextPanel     from '@/app/components/StraitContextPanel';
import ShippingRiskPanel      from '@/app/components/ShippingRiskPanel';
import EconomicImpactPanel    from '@/app/components/EconomicImpactPanel';
import HistoricalIncidentsPanel from '@/app/components/HistoricalIncidentsPanel';
import ChokepointsPanel       from '@/app/components/ChokepointsPanel';
import Reveal from '@/app/components/Reveal';
import TickerBar from '@/app/components/TickerBar';
import { TrendingUp, BarChart2, Zap, Radio, BarChart3, Info } from 'lucide-react';

const HormuzMap = dynamic(() => import('@/app/components/HormuzMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-bg flex items-center justify-center">
      <span className="text-[10px] font-mono text-text4 tracking-[0.22em] uppercase">
        …
      </span>
    </div>
  ),
});

function DashboardContent() {
  const { t }    = useLang();
  const vessels  = useAisVessels();
  const { data, dataReady, newsLoading, loadData } = useDashboardData();

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header
        status={dataReady ? data.status : undefined}
        metrics={dataReady ? data.metrics : undefined}
        loading={!dataReady}
        vesselCount={vessels.length > 0 ? vessels.length : undefined}
      />

      {/* ── CRITICAL ALERT BANNER ──────────────────────────── */}
      <CriticalAlertBanner state={dataReady ? data.status.state : undefined} />

      {/* ── LIVE TICKER ─────────────────────────────────────── */}
      <TickerBar
        status={dataReady ? data.status : undefined}
        metrics={dataReady ? data.metrics : undefined}
      />

      {/* ── MAP HERO ─────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative w-full overflow-hidden"
        style={{ height: 'min(65vh, 580px)', minHeight: '340px' }}
        aria-label="Global maritime chokepoints live map"
      >
        <HormuzMap status={data.status} vessels={vessels} />

        {/* Tactical overlays — scan line + scanlines texture */}
        <div className="scan-bar" aria-hidden />
        <div className="scanlines" aria-hidden />

        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <div className="h-28 bg-gradient-to-t from-bg to-transparent" />
        </div>

        {/* Status badge — rectangular, no pill shape */}
        <div className="absolute top-[90px] right-4 md:right-6 pointer-events-none z-[600]">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 border text-[10px] font-mono uppercase tracking-[0.16em] transition-colors duration-500 ${
              !dataReady
                ? 'bg-bg1/90 border-divider text-text3'
                : data.status.state === 'OPEN'
                ? 'bg-bg1/90 border-ok/40 text-ok'
                : data.status.state === 'CLOSED'
                ? 'bg-bg1/90 border-danger/40 text-danger'
                : 'bg-bg1/90 border-caution/40 text-caution'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full animate-[pulse-dot_2.4s_ease-in-out_infinite] ${
                !dataReady     ? 'bg-text4'
                : data.status.state === 'OPEN'   ? 'bg-ok'
                : data.status.state === 'CLOSED' ? 'bg-danger'
                : 'bg-caution'
              }`}
            />
            {!dataReady
              ? t.map.statusSyncing
              : data.status.state === 'OPEN'   ? t.map.statusOpen
              : data.status.state === 'CLOSED' ? t.map.statusClosed
              : t.map.statusDisrupted}
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <ScrollIndicator />
        </div>
      </section>

      {/* ── BRIEFING DOCUMENT ────────────────────────────────── */}
      <main id="main-content" className="max-w-[1440px] mx-auto px-4 md:px-8 pb-0">

        {/* Status Dispatch */}
        <section className="py-4 md:py-6 animate-fadeInUp" style={{ animationDelay: '0.08s' }}>
          <HeroStatus
            status={data.status}
            loading={!dataReady}
            brentPrice={data.metrics?.brentPrice}
          />
        </section>

        <hr className="section-rule" />

        {/* Data Strip */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.22s' }}>
          <MetricsGrid metrics={data.metrics} loading={!dataReady} />
          {/* Feed health row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-3 pb-1 text-[8px] font-mono text-text4 uppercase tracking-[0.14em]">
            {[
              { label: t.dashboard.feedBrent,  ok: !data.metrics?.brentDown   },
              { label: t.dashboard.feedEvents, ok: !data.metrics?.eventsDown  },
              { label: t.dashboard.feedAis,    ok: vessels.length > 0         },
              { label: t.dashboard.feedMarket, ok: true                       },
            ].map(({ label, ok }) => (
              <span key={label} className="flex items-center gap-1">
                <span className={`w-1 h-1 rounded-full ${ok ? 'bg-ok' : 'bg-danger'}`} />
                <span className={ok ? 'text-text4' : 'text-danger/70'}>{label}</span>
              </span>
            ))}
          </div>
        </div>

        <hr className="section-rule" />

        {/* Strategic Chokepoints Grid */}
        <Reveal>
          <section id="chokepoints" className="py-4 md:py-6" style={{ scrollMarginTop: '82px' }}>
            <ChokepointsPanel timeline={data.timeline} />
          </section>
        </Reveal>

        <hr className="section-rule" />

        {/* Global Exposure */}
        <Reveal>
          <section className="py-4 md:py-6">
            <GlobalExposurePanel state={data.status.state} />
          </section>
        </Reveal>

        <hr className="section-rule" />

        {/* Charts — no card wrapper, editorial labels */}
        <Reveal>
          <section className="py-4 md:py-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3 flex items-center gap-2">
                <TrendingUp size={11} className="text-accent" />
                {t.chart.title}
              </span>
              <span className="text-[9px] font-mono text-text4">
                Yahoo Finance · {t.chart.period}
              </span>
            </div>
            <BrentChart />
          </section>
        </Reveal>

        <hr className="section-rule" />

        <Reveal>
          <section className="py-4 md:py-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3 flex items-center gap-2">
                <BarChart2 size={11} className="text-accent" />
                {t.nav.vesselTransits}
              </span>
              <span className="text-[9px] font-mono text-text4">IMF PortWatch</span>
            </div>
            <TransitChart />
          </section>
        </Reveal>

        <hr className="section-rule" />

        {/* Intelligence Feed + Event Log — asymmetric 3/2 */}
        <Reveal>
          <section id="intel" className="py-4 md:py-6" style={{ scrollMarginTop: '82px' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3 flex items-center gap-2">
                <Radio size={11} className="text-accent" />
                {t.dashboard.intelligenceFeed}
              </span>
              <span className="text-[9px] font-mono text-text4">{t.dashboard.intelligenceFeedSrc}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr]">
              <div className="lg:pr-10 pb-6 lg:pb-0 lg:border-r border-divider">
                <NewsFeed news={data.news} loading={newsLoading} />
              </div>
              <div className="lg:pl-10">
                <Timeline events={data.timeline} />
              </div>
            </div>
          </section>
        </Reveal>

        <hr className="section-rule" />

        {/* Markets + Weather */}
        <section className="py-4 md:py-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3 flex items-center gap-2">
              <BarChart3 size={11} className="text-accent" />
              {t.dashboard.commodityMarkets}
            </span>
            <span className="text-[9px] font-mono text-text4">{t.dashboard.commodityMarketsSrc}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <Reveal dir="left">
              <div className="md:pr-8 pb-8 md:pb-0 md:border-r border-divider">
                <MarketsRail />
              </div>
            </Reveal>
            <Reveal dir="right">
              <div className="md:pl-8">
                <WeatherPanel />
              </div>
            </Reveal>
          </div>
        </section>

        <hr className="section-rule" />

        {/* Strait Context + Shipping Risk */}
        <section className="py-4 md:py-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3 flex items-center gap-2">
              <Info size={11} className="text-accent" />
              {t.dashboard.straitContext}
            </span>
            <span className="text-[9px] font-mono text-text4">{t.dashboard.straitContextSrc}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <Reveal dir="left">
              <div className="md:pr-8 pb-8 md:pb-0 md:border-r border-divider">
                <StraitContextPanel />
              </div>
            </Reveal>
            <Reveal dir="right">
              <div className="md:pl-8">
                <ShippingRiskPanel
                  state={data.status.state}
                  tensionIndex={data.status.tensionIndex ?? 0}
                />
              </div>
            </Reveal>
          </div>
        </section>

        <hr className="section-rule" />

        {/* Economic Impact */}
        <Reveal>
          <section className="py-4 md:py-6">
            <EconomicImpactPanel state={data.status.state} />
          </section>
        </Reveal>

        <hr className="section-rule" />

        {/* Historical Incidents */}
        <Reveal>
          <section className="py-4 md:py-6">
            <HistoricalIncidentsPanel />
          </section>
        </Reveal>

        <hr className="section-rule" />

        {/* Subscribe */}
        <Reveal>
          <section className="py-4 md:py-6">
            <SubscribeInlineCTA />
          </section>
        </Reveal>

        <hr className="section-rule" />

        {/* API Access — minimal text, no card */}
        <Reveal>
          <section className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3 mb-2 flex items-center gap-2">
                  <Zap size={11} className="text-accent" />
                  {t.nav.publicApi}
                </div>
                <p className="text-[12px] font-mono text-text3 leading-relaxed max-w-lg">
                  {t.nav.apiDescription}
                </p>
              </div>
              <a
                href="/docs"
                className="shrink-0 text-[10px] font-mono uppercase tracking-[0.14em] text-accent hover:text-accent-hi border-b border-accent/40 hover:border-accent/80 transition-colors pb-0.5"
              >
                {t.nav.apiDocsLink} →
              </a>
            </div>
          </section>
        </Reveal>

        <AdSlot position="below-intel" />

        <Footer />
      </main>

      <RefreshButton onRefresh={loadData} />
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
