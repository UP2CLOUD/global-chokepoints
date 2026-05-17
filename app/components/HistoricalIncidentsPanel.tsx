'use client';

import { Clock } from 'lucide-react';
import { useLang } from './LangContext';

type Tag = 'military' | 'diplomatic' | 'incident';

interface Incident {
  period: string;
  title: string;
  desc: string;
  tag: Tag;
}

const EVENTS: Incident[] = [
  {
    period: '1980–1988',
    title: 'Tanker War',
    desc: 'Iran-Iraq War spills into the Gulf — 500+ commercial vessels attacked. Global marine war-risk insurance quadruples. US, UK, and France deploy warships.',
    tag: 'military',
  },
  {
    period: '1987',
    title: 'Operation Earnest Will',
    desc: 'US Navy re-flags and escorts Kuwaiti tankers after Iranian mine-laying. Largest convoy operation since WWII; establishes US permanent Gulf presence.',
    tag: 'military',
  },
  {
    period: '2012',
    title: 'Iran Closure Threat',
    desc: 'Iran threatens to close the Strait in response to Western sanctions over its nuclear programme. Brent crude spikes 4% in a single session.',
    tag: 'diplomatic',
  },
  {
    period: 'Jun 2019',
    title: 'Gulf of Oman Tanker Attacks',
    desc: 'Front Altair and Kokuka Courageous struck by limpet mines. US intelligence attributes attacks to Iran; insurance premiums for Gulf transit double.',
    tag: 'incident',
  },
  {
    period: 'Jul 2021',
    title: 'MV Mercer Street Drone Strike',
    desc: 'Israeli-linked tanker struck by an Iranian drone off the Omani coast, killing two crew. First confirmed lethal drone strike on a commercial vessel in history.',
    tag: 'incident',
  },
  {
    period: 'Apr 2024',
    title: 'IRGC Seizes MSC Aries',
    desc: 'Iran\'s Revolutionary Guard boards and seizes container ship MSC Aries with 25 crew. Linked to escalating tensions following Israel-Hamas conflict and Houthi Red Sea campaign.',
    tag: 'incident',
  },
];

const TAG_STYLE: Record<Tag, string> = {
  military:   'text-danger border-danger/30 bg-danger/[0.07]',
  diplomatic: 'text-accent border-accent/30 bg-accent/[0.07]',
  incident:   'text-caution border-caution/30 bg-caution/[0.07]',
};

export default function HistoricalIncidentsPanel() {
  const { t } = useLang();

  return (
    <section className="rounded-xl border border-divider bg-card/60 backdrop-blur-sm p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
          <Clock size={13} className="text-accent" />
          {t.history.title}
        </div>
        <span className="text-[10px] font-mono text-text4">{t.history.source}</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[50px] top-2 bottom-2 w-px bg-divider" aria-hidden="true" />

        <div className="space-y-6">
          {EVENTS.map(({ period, title, desc, tag }) => (
            <div key={`${period}-${title}`} className="flex gap-3 items-start">
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
          ))}
        </div>
      </div>
    </section>
  );
}
