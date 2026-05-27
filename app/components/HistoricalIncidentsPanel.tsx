'use client';

import { Clock } from 'lucide-react';
import { useLang } from './LangContext';

type Tag = 'military' | 'diplomatic' | 'incident';
type EventKey = 'tankerWar' | 'earnestWill' | 'iranThreat' | 'omanAttacks' | 'mercerStreet' | 'mscAries';

const EVENT_KEYS: Array<{ id: EventKey; period: string; tag: Tag }> = [
  { id: 'tankerWar',    period: '1980–1988', tag: 'military'   },
  { id: 'earnestWill',  period: '1987',      tag: 'military'   },
  { id: 'iranThreat',   period: '2012',      tag: 'diplomatic' },
  { id: 'omanAttacks',  period: 'Jun 2019',  tag: 'incident'   },
  { id: 'mercerStreet', period: 'Jul 2021',  tag: 'incident'   },
  { id: 'mscAries',     period: 'Apr 2024',  tag: 'incident'   },
];

const TAG_STYLE: Record<Tag, string> = {
  military:   'text-danger border-danger/30 bg-danger/[0.07]',
  diplomatic: 'text-accent border-accent/30 bg-accent/[0.07]',
  incident:   'text-caution border-caution/30 bg-caution/[0.07]',
};

export default function HistoricalIncidentsPanel() {
  const { t } = useLang();

  return (
    <section className="border border-divider bg-bg2 p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.22em] text-text3">
          <Clock size={11} className="text-accent" />
          {t.history.title}
        </div>
        <span className="text-[9px] font-mono text-text4">{t.history.source}</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[50px] top-2 bottom-2 w-px bg-divider" aria-hidden="true" />

        <div className="space-y-6">
          {EVENT_KEYS.map(({ id, period, tag }) => {
            const { title, desc } = t.history.events[id];
            return (
              <div key={id} className="flex gap-3 items-start">
                {/* Period label */}
                <div className="w-[44px] shrink-0 text-right pt-0.5">
                  <span className="text-[9px] font-mono text-text4 leading-tight whitespace-nowrap">{period}</span>
                </div>
                {/* Dot on the line */}
                <div className="relative z-10 mt-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent/80 border-2 border-bg1 ring-1 ring-accent/30" />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[12px] font-mono font-semibold text-text">{title}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${TAG_STYLE[tag]}`}>
                      {t.timeline.filters[tag]}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-text3 leading-relaxed">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
