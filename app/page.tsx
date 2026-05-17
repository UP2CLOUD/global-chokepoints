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
import RefreshButton   from '@/app/components/RefreshButton';
import ScrollIndicator from '@/app/components/ScrollIndicator';
import AdSlot          from '@/app/components/AdSlot';
import { SubscribeInlineCTA } from '@/app/components/SubscribeModal';
import GlobalExposurePanel    from '@/app/components/GlobalExposurePanel';
import StraitContextPanel     from '@/app/components/StraitContextPanel';
import ShippingRiskPanel      from '@/app/components/ShippingRiskPanel';
import EconomicImpactPanel    from '@/app/components/EconomicImpactPanel';
import HistoricalIncidentsPanel from '@/app/components/HistoricalIncidentsPanel';
import ChokepointsPanel       from '@/app/components/ChokepointsPanel';
import Reveal from '@/app/components/Reveal';
import { TrendingUp, BarChart2, Zap } from 'lucide-react';

// Leaflet must not run in SSR / Edge context
const HormuzMap = dynamic(() => import('@/app/components/HormuzMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#07090F] flex items-center justify-center">
      <span className="text-[11px] font-mono text-text3 tracking-[0.2em]">LOADING MAP…</span>
    </div>
  ),
});

function DashboardContent() {
  const { t }                               = useLang();
  const vessels                             = useAisVessels();
  const { data, dataReady, newsLoading, loadData } = useDashboardData();

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header />

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative w-full overflow-hidden"
        style={{ height: 'min(62vh, 520px)', minHeight: '340px' }}
        aria-label="Strait of Hormuz live map"
      >
        <HormuzMap status={data.status} vessels={vessels} />

        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <div className="h-32 bg-gradient-to-t from-bg to-transparent" />
        </div>

        {/* Status badge */}
        <div className="absolute top-16 right-4 md:right-6 pointer-events-none z-[600]">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md text-[11px] font-mono transition-colors duration-500 ${
            !dataReady
              ? 'bg-caution/10 border-caution/30 text-caution'
              : data.status.state === 'OPEN'
              ? 'bg-ok/10 border-ok/30 text-ok'
              : data.status.state === 'CLOSED'
              ? 'bg-danger/10 border-danger/35 text-danger'
              : 'bg-caution/10 border-caution/30 text-caution'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              !dataReady ? 'bg-caution'
              : data.status.state === 'OPEN' ? 'bg-ok'
              : data.status.state === 'CLOSED' ? 'bg-danger'
              : 'bg-caution'
            }`} />
            {!dataReady
              ? t.map.statusSyncing
              : data.status.state === 'OPEN'
              ? t.map.statusOpen
              : data.status.state === 'CLOSED'
              ? t.map.statusClosed
              : t.map.statusDisrupted}
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <ScrollIndicator />
        </div>
      </section>

      {/* ── CONTENT ────────────────────────────────────────────── */}
      <main className="max-w-[1280px] mx-auto px-4 py-8 md:px-6 md:py-10 flex flex-col gap-6 md:gap-8">

        <div className="animate-fadeInUp" style={{ animationDelay: '0.05s' }}>
          <HeroStatus status={data.status} loading={!dataReady} brentPrice={data.metrics?.brentPrice} />
        </div>

        <div className="animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <MetricsGrid metrics={data.metrics} loading={!dataReady} />
        </div>

        <Reveal dir="up">
          <GlobalExposurePanel state={data.status.state} />
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          <Reveal dir="left"><StraitContextPanel /></Reveal>
          <Reveal dir="right">
            <ShippingRiskPanel
              state={data.status.state}
              tensionIndex={data.status.tensionIndex ?? 0}
            />
          </Reveal>
        </div>

        <Reveal dir="up">
          <EconomicImpactPanel state={data.status.state} />
        </Reveal>

        <Reveal dir="up">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 md:gap-6">
            <section className="rounded-2xl border border-divider bg-card/60 backdrop-blur-sm p-5 md:p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
                  <TrendingUp size={13} className="text-accent" />
                  {t.chart.title}
                </div>
                <span className="text-[10px] text-text3 font-mono">Yahoo Finance · {t.chart.period}</span>
              </div>
              <BrentChart />
            </section>

            <section className="rounded-2xl border border-divider bg-card/60 backdrop-blur-sm p-5 md:p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
                  <BarChart2 size={13} className="text-accent" />
                  {t.nav.vesselTransits}
                </div>
                <span className="text-[10px] text-text3 font-mono">IMF PortWatch</span>
              </div>
              <TransitChart />
            </section>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          <Reveal dir="left"><MarketsRail /></Reveal>
          <Reveal dir="right"><WeatherPanel /></Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          <Reveal dir="left"><NewsFeed news={data.news} loading={newsLoading} /></Reveal>
          <Reveal dir="right"><Timeline events={data.timeline} /></Reveal>
        </div>

        <Reveal dir="up">
          <HistoricalIncidentsPanel />
        </Reveal>

        <Reveal dir="up">
          <ChokepointsPanel />
        </Reveal>

        <Reveal>
          <SubscribeInlineCTA />
        </Reveal>

        {/* API Access CTA */}
        <Reveal>
          <div className="rounded-2xl border border-divider bg-card/40 backdrop-blur-sm p-5 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2 mb-2">
                  <Zap size={13} className="text-accent" />
                  {t.nav.publicApi}
                </div>
                <p className="text-[12px] text-text3 leading-relaxed max-w-lg">
                  {t.nav.apiDescription}
                </p>
              </div>
              <a
                href="/docs"
                className="shrink-0 px-4 py-2 rounded-lg text-[11px] font-mono uppercase tracking-[0.12em]
                  text-accent border border-accent/30 hover:border-accent/60 hover:bg-accent/5
                  transition-all duration-200"
              >
                {t.nav.apiDocsLink}
              </a>
            </div>
          </div>
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
