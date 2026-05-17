'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { TimelineEvent, Category } from '@/app/lib/types';
import { useLang } from './LangContext';
import { fmtDate } from '@/app/lib/utils';
import { ExternalLink } from 'lucide-react';

// GSAP + ScrollTrigger — registered lazily on client only
let gsapReady = false;
let gsapLib: typeof import('gsap')['gsap'] | null = null;

async function ensureGsap() {
  if (gsapReady) return;
  const { gsap } = await import('gsap');
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);
  gsapLib = gsap;
  gsapReady = true;
}

interface Props { events: TimelineEvent[] }

const SEVERITY_STYLE = {
  low:      { dot: 'bg-info',    text: 'text-text3',  code: 'LOW',  bar: 'bg-info' },
  medium:   { dot: 'bg-caution', text: 'text-caution', code: 'MED',  bar: 'bg-caution' },
  high:     { dot: 'bg-warn',    text: 'text-warn',    code: 'HIGH', bar: 'bg-warn' },
  critical: { dot: 'bg-danger',  text: 'text-danger',  code: 'CRIT', bar: 'bg-danger' },
} as const;

export default function Timeline({ events }: Props) {
  const { t, locale } = useLang();
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => filter === 'all' ? events : events.filter(e => e.category === filter),
    [events, filter],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cleanup: (() => void) | null = null;

    ensureGsap().then(() => {
      if (!gsapLib || !containerRef.current) return;
      const items = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>('.tl-item'),
      );
      if (items.length === 0) return;
      gsapLib.set(items, { opacity: 0, x: 10 });
      const triggers: { kill(): void }[] = [];

      items.forEach((item, i) => {
        const tween = gsapLib!.to(item, {
          opacity: 1, x: 0, duration: 0.35,
          ease: 'power2.out',
          delay: (i % 6) * 0.05,
          scrollTrigger: {
            trigger: item,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        });
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
      });

      cleanup = () => triggers.forEach(t => t.kill());
    });

    return () => { cleanup?.(); };
  }, [filtered]);

  const filters: { key: 'all' | Category; label: string }[] = [
    { key: 'all',        label: t.timeline.filters.all },
    { key: 'incident',   label: t.timeline.filters.incident },
    { key: 'military',   label: t.timeline.filters.military },
    { key: 'diplomatic', label: t.timeline.filters.diplomatic },
    { key: 'economic',   label: t.timeline.filters.economic },
  ];

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between pb-3 border-b border-divider">
        <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3">
          {t.timeline.title}
        </span>
        <span className="text-[9px] font-mono text-text4">
          {filtered.length} {t.timeline.events}
        </span>
      </div>

      {/* Filter strip */}
      <div className="flex gap-0 overflow-x-auto scrollbar-none border-b border-divider">
        {filters.map((f, idx) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setExpanded(null); }}
            aria-pressed={filter === f.key}
            className={`flex-shrink-0 px-3 py-2 text-[9px] font-mono uppercase tracking-[0.14em] border-r border-divider transition-colors cursor-pointer ${
              filter === f.key
                ? 'text-accent bg-bg1'
                : 'text-text4 hover:text-text3'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Event log */}
      <div ref={containerRef} className="max-h-[460px] overflow-y-auto scrollbar-thin -mr-1 pr-1">
        {filtered.length === 0 && (
          <div className="py-12 text-center text-[12px] font-mono text-text3">
            {t.timeline.noEvents}
          </div>
        )}

        {filtered.map((event) => {
          const isExpanded = expanded === event.id;
          const sev = SEVERITY_STYLE[event.severity];

          return (
            <div
              key={event.id}
              className="tl-item border-b border-divider cursor-pointer group"
              onClick={() => setExpanded(isExpanded ? null : event.id)}
            >
              <div className="py-3.5 flex gap-3">
                {/* Severity indicator */}
                <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} aria-hidden />
                  <span
                    className={`text-[8px] font-mono font-bold ${sev.text}`}
                    style={{ writingMode: 'vertical-lr', textOrientation: 'mixed', letterSpacing: '0.08em' }}
                  >
                    {sev.code}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Meta row */}
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-[9px] font-mono text-accent tabular-nums">
                      {fmtDate(event.date, locale)}
                    </span>
                    <span className="text-[9px] font-mono text-text4 uppercase tracking-wider">
                      {event.category}
                    </span>
                    <span className="ml-auto text-[9px] font-mono text-text4 truncate max-w-[80px]">
                      {event.source}
                    </span>
                  </div>

                  {/* Title */}
                  {event.url && event.url !== '#' ? (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="block text-[12px] font-medium leading-snug hover:text-accent transition-colors duration-150"
                    >
                      {event.title}
                      <ExternalLink size={9} className="inline-block ml-1 -mt-0.5 text-text4" />
                    </a>
                  ) : (
                    <h4 className="text-[12px] font-medium leading-snug">{event.title}</h4>
                  )}

                  {/* Expanded description */}
                  <div
                    className={`mt-2 text-[11px] text-text3 leading-relaxed overflow-hidden transition-all duration-200 ${
                      isExpanded ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    {event.description}
                  </div>

                  {/* Expand hint */}
                  <div
                    className={`mt-1 text-[9px] font-mono text-text4 transition-opacity ${
                      isExpanded ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {t.timeline.clickExpand} ↓
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
