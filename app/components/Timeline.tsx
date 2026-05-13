'use client';

import { useState, useMemo } from 'react';
import { TimelineEvent, Category } from '@/app/lib/types';
import { useLang } from './LangContext';
import { fmtDate } from '@/app/lib/utils';
import { History, ExternalLink, Shield, Handshake, AlertOctagon, DollarSign, type LucideIcon } from 'lucide-react';

interface Props {
  events: TimelineEvent[];
}

const CATEGORY_ICON: Record<Category, LucideIcon> = {
  incident: AlertOctagon,
  military: Shield,
  diplomatic: Handshake,
  economic: DollarSign,
};

const SEVERITY = {
  low:      { dot: 'bg-info',    text: 'text-info',    label: 'LOW' },
  medium:   { dot: 'bg-caution', text: 'text-caution', label: 'MED' },
  high:     { dot: 'bg-warn',    text: 'text-warn',    label: 'HIGH' },
  critical: { dot: 'bg-danger',  text: 'text-danger',  label: 'CRIT' },
} as const;

export default function Timeline({ events }: Props) {
  const { lang, t } = useLang();
  const locale = lang === 'en' ? 'en-US' : 'pt-BR';

  const [filter, setFilter] = useState<'all' | Category>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(
    () => filter === 'all' ? events : events.filter(e => e.category === filter),
    [events, filter]
  );

  const filters: { key: 'all' | Category; label: string }[] = [
    { key: 'all', label: t.timeline.filters.all },
    { key: 'incident', label: t.timeline.filters.incident },
    { key: 'military', label: t.timeline.filters.military },
    { key: 'diplomatic', label: t.timeline.filters.diplomatic },
    { key: 'economic', label: t.timeline.filters.economic },
  ];

  return (
    <section className="rounded-xl border border-divider bg-card/70 p-4 md:p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
          <History size={13} className="text-accent" />
          {t.timeline.title}
        </div>
        <span className="text-[10px] text-text3 font-mono">
          {filtered.length} {lang === 'en' ? 'events' : 'eventos'}
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setExpanded(null); }}
            aria-pressed={filter === f.key}
            className={`flex-shrink-0 px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-[0.14em] border transition-colors duration-180 cursor-pointer ${
              filter === f.key
                ? 'bg-accent/15 text-accent border-accent/30'
                : 'bg-bg1/60 text-text3 border-divider hover:text-text2'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative mt-4 pl-6 max-h-[420px] overflow-y-auto scrollbar-thin pr-2">
        <div className="absolute left-[7px] top-0 bottom-0 w-px bg-divider" aria-hidden />
        {filtered.length === 0 && (
          <div className="text-[12px] font-mono text-text3 py-8 text-center">
            {lang === 'en' ? 'No events match this filter yet.' : 'Nenhum evento corresponde a este filtro ainda.'}
          </div>
        )}
        {filtered.map((event, i) => {
          const isExpanded = expanded === event.id;
          const sev = SEVERITY[event.severity];
          const CategoryIcon = CATEGORY_ICON[event.category];
          return (
            <div
              key={event.id}
              className="relative pb-4 cursor-pointer group"
              style={{ animation: `fadeInUp 180ms cubic-bezier(0.2,0.8,0.2,1) ${Math.min(i, 8) * 30}ms both` }}
              onClick={() => setExpanded(isExpanded ? null : event.id)}
            >
              <span
                className={`absolute left-[-18px] top-1.5 w-2 h-2 rounded-full border-2 border-bg z-10 ${sev.dot}`}
                aria-hidden
              />
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-accent">{fmtDate(event.date, locale)}</span>
                <span className={`text-[9px] font-mono font-semibold ${sev.text}`}>{sev.label}</span>
                <span className="text-[9px] text-text3 font-mono inline-flex items-center gap-1">
                  <CategoryIcon size={10} />
                  <span className="uppercase tracking-wider">{event.category}</span>
                </span>
                <span className="ml-auto text-[9px] text-text4 font-mono truncate max-w-[120px]">{event.source}</span>
              </div>
              {event.url && event.url !== '#' ? (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="block text-[13px] font-medium text-text leading-snug transition-colors duration-180 hover:text-accent"
                >
                  {event.title}
                  <ExternalLink size={10} className="inline-block ml-1 -mt-0.5 text-text3" />
                </a>
              ) : (
                <h4 className="text-[13px] font-medium text-text leading-snug">{event.title}</h4>
              )}
              <div className={`mt-1.5 text-[12px] text-text2 leading-relaxed overflow-hidden transition-all duration-180 ${isExpanded ? 'max-h-[260px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {event.description}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
