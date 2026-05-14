'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { TimelineEvent, Category } from '@/app/lib/types';
import { useLang } from './LangContext';
import { fmtDate } from '@/app/lib/utils';
import { History, ExternalLink, Shield, Handshake, AlertOctagon, DollarSign, type LucideIcon } from 'lucide-react';

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

const CATEGORY_ICON: Record<Category, LucideIcon> = {
  incident: AlertOctagon, military: Shield,
  diplomatic: Handshake,  economic: DollarSign,
};

const SEVERITY = {
  low:      { dot: 'bg-info',    text: 'text-info',    label: 'LOW',  bar: 'bg-info' },
  medium:   { dot: 'bg-caution', text: 'text-caution', label: 'MED',  bar: 'bg-caution' },
  high:     { dot: 'bg-warn',    text: 'text-warn',    label: 'HIGH', bar: 'bg-warn' },
  critical: { dot: 'bg-danger',  text: 'text-danger',  label: 'CRIT', bar: 'bg-danger' },
} as const;

const SEV_BORDER: Record<string, string> = {
  low: 'border-info/20', medium: 'border-caution/20',
  high: 'border-warn/25', critical: 'border-danger/30',
};

export default function Timeline({ events }: Props) {
  const { lang, t } = useLang();
  const locale = lang === 'en' ? 'en-US' : 'pt-BR';
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => filter === 'all' ? events : events.filter(e => e.category === filter),
    [events, filter],
  );

  // GSAP ScrollTrigger — animate items as they enter the viewport
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cleanup: (() => void) | null = null;

    ensureGsap().then(() => {
      if (!gsapLib || !containerRef.current) return;
      const items = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>('.tl-item'),
      );
      if (items.length === 0) return; // nothing to animate — avoids GSAP NodeList warning
      gsapLib.set(items, { opacity: 0, x: 18 });
      const triggers: { kill(): void }[] = [];

      items.forEach((item, i) => {
        const tween = gsapLib!.to(item, {
          opacity: 1, x: 0, duration: 0.45,
          ease: 'power2.out',
          delay: (i % 5) * 0.06,
          scrollTrigger: {
            trigger: item,
            start: 'top 88%',
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
    <section className="rounded-2xl border border-divider bg-card/60 backdrop-blur-sm p-5 md:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
          <History size={13} className="text-accent" />
          {t.timeline.title}
        </div>
        <span className="text-[10px] text-text3 font-mono px-2 py-0.5 rounded bg-bg2 border border-divider">
          {filtered.length} {lang === 'en' ? 'events' : 'eventos'}
        </span>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 mb-4">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setExpanded(null); }}
            aria-pressed={filter === f.key}
            className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-[0.14em] border transition-all duration-200 cursor-pointer ${
              filter === f.key
                ? 'bg-accent/12 text-accent border-accent/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                : 'bg-bg1/40 text-text3 border-divider hover:text-text2 hover:border-text4'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline list */}
      <div ref={containerRef} className="relative pl-5 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
        {/* Vertical rail */}
        <div className="absolute left-[5px] top-0 bottom-0 w-px bg-gradient-to-b from-accent/30 via-divider to-transparent" aria-hidden />

        {filtered.length === 0 && (
          <div className="text-[12px] font-mono text-text3 py-10 text-center">
            {lang === 'en' ? 'No events match this filter.' : 'Nenhum evento corresponde a este filtro.'}
          </div>
        )}

        {filtered.map((event) => {
          const isExpanded = expanded === event.id;
          const sev = SEVERITY[event.severity];
          const CategoryIcon = CATEGORY_ICON[event.category];
          const borderCls = SEV_BORDER[event.severity] ?? 'border-divider';

          return (
            <div
              key={event.id}
              className={`tl-item relative pb-4 cursor-pointer group`}
              onClick={() => setExpanded(isExpanded ? null : event.id)}
            >
              {/* Timeline dot */}
              <span
                className={`absolute left-[-17px] top-[5px] w-2 h-2 rounded-full border-2 border-bg z-10 ${sev.dot} transition-transform duration-200 group-hover:scale-125`}
                aria-hidden
              />

              {/* Card */}
              <div className={`rounded-xl border ${borderCls} bg-bg1/50 p-3 transition-all duration-200 group-hover:bg-bg1/80 group-hover:border-opacity-50`}>
                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono text-accent">{fmtDate(event.date, locale)}</span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${sev.text} bg-current/10`} style={{ background: 'rgba(0,0,0,0.0)' }}>
                    <span className={sev.text}>{sev.label}</span>
                  </span>
                  <span className="text-[9px] text-text3 font-mono inline-flex items-center gap-1">
                    <CategoryIcon size={9} />
                    <span className="uppercase tracking-wider">{event.category}</span>
                  </span>
                  <span className="ml-auto text-[9px] text-text4 font-mono truncate max-w-[110px]">{event.source}</span>
                </div>

                {/* Severity bar accent */}
                <div className={`h-[2px] w-8 rounded-full ${sev.bar} mb-2 opacity-60`} aria-hidden />

                {/* Title */}
                {event.url && event.url !== '#' ? (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block text-[13px] font-medium text-text leading-snug hover:text-accent transition-colors duration-180"
                  >
                    {event.title}
                    <ExternalLink size={10} className="inline-block ml-1 -mt-0.5 text-text3" />
                  </a>
                ) : (
                  <h4 className="text-[13px] font-medium text-text leading-snug">{event.title}</h4>
                )}

                {/* Expanded description */}
                <div className={`mt-2 text-[12px] text-text2 leading-relaxed overflow-hidden transition-all duration-250 ${isExpanded ? 'max-h-[240px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {event.description}
                </div>

                {/* Expand hint */}
                <div className={`mt-1 text-[9px] font-mono text-text4 transition-opacity duration-180 ${isExpanded ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                  {lang === 'en' ? 'click to expand' : 'clique para expandir'} ↓
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
