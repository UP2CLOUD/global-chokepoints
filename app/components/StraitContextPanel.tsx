'use client';

import { Info, ArrowRight } from 'lucide-react';
import { useLang } from './LangContext';

const STATS = [
  { value: '21 Mb/d', labelKey: 'throughputLabel' as const, icon: '🛢️' },
  { value: '~20%',    labelKey: 'shareLabel'       as const, icon: '🌍' },
  { value: '5,000+',  labelKey: 'vesselsLabel'     as const, icon: '⛴️' },
  { value: '2 km',    labelKey: 'widthLabel'       as const, icon: '📍' },
];

export default function StraitContextPanel() {
  const { t } = useLang();

  return (
    <section className="rounded-xl border border-divider bg-card/60 backdrop-blur-sm p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
          <Info size={13} className="text-accent" />
          {t.facts.title}
        </div>
        <span className="text-[10px] font-mono text-text4">{t.facts.source}</span>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {STATS.map(({ value, labelKey, icon }) => (
          <div
            key={labelKey}
            className="rounded-lg border border-divider bg-bg1/60 p-3 text-center"
          >
            <div className="text-xl mb-1">{icon}</div>
            <div className="text-[20px] font-mono font-bold text-accent mb-0.5">{value}</div>
            <div className="text-[10px] font-mono text-text3 uppercase tracking-wide">
              {t.facts[labelKey]}
            </div>
          </div>
        ))}
      </div>

      {/* If closed — rerouting cost */}
      <div className="rounded-lg border border-danger/20 bg-danger/[0.04] p-4">
        <div className="flex items-center gap-2 text-[11px] font-mono font-semibold text-danger uppercase tracking-wide mb-2">
          <ArrowRight size={11} />
          {t.facts.rerouteTitle}
        </div>
        <p className="text-[11px] font-mono text-text3 leading-relaxed mb-2">
          {t.facts.rerouteDesc}
        </p>
        <p className="text-[10px] font-mono text-text4 leading-relaxed">
          {t.facts.rerouteExtra}
        </p>
      </div>
    </section>
  );
}
