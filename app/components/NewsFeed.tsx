'use client';

import { useState } from 'react';
import { NewsItem } from '@/app/lib/types';
import { useLang } from './LangContext';
import { ExternalLink } from 'lucide-react';

interface Props {
  news: NewsItem[];
  loading?: boolean;
}

const SENTIMENT_GLYPH: Record<'positive' | 'negative' | 'neutral', { mark: string; color: string }> = {
  positive: { mark: '▲', color: 'text-ok'    },
  negative: { mark: '▼', color: 'text-danger' },
  neutral:  { mark: '─', color: 'text-text4'  },
};

type FilterKey = 'all' | 'hormuz' | 'redsea' | 'suez' | 'panama' | 'taiwan';

const FILTER_LABELS: Record<Exclude<FilterKey, 'all'>, string> = {
  hormuz: 'HORMUZ', redsea: 'RED SEA', suez: 'SUEZ', panama: 'PANAMA', taiwan: 'TAIWAN',
};

const FILTER_KW: Record<Exclude<FilterKey, 'all'>, string[]> = {
  hormuz: ['hormuz', 'irgc', 'persian gulf', 'gulf of oman', 'iranian'],
  redsea: ['red sea', 'houthi', 'bab el-mandeb', 'bab-el-mandeb', 'yemen', 'gulf of aden'],
  suez:   ['suez'],
  panama: ['panama canal', 'panama lock'],
  taiwan: ['taiwan strait', 'taiwan channel', 'pla navy', 'south china sea'],
};

function matchesFilter(item: NewsItem, key: FilterKey): boolean {
  if (key === 'all') return true;
  const hay = item.title.toLowerCase();
  return FILTER_KW[key].some(kw => hay.includes(kw));
}

function timeAgo(iso: string): string {
  const delta = (Date.now() - new Date(iso).getTime()) / 1000;
  if (delta < 60)    return '<1m';
  if (delta < 3600)  return `${Math.floor(delta / 60)}m`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`;
  return `${Math.floor(delta / 86400)}d`;
}

function relevanceColor(rel: number): string {
  if (rel >= 0.85) return 'text-accent';
  if (rel >= 0.65) return 'text-text3';
  return 'text-text4';
}

function NewsSkeleton() {
  return (
    <div>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="py-2.5 border-b border-divider animate-pulse">
          <div className="h-[8px] w-36 bg-bg2 mb-2" />
          <div className="h-[12px] w-full bg-bg2 mb-1" />
          <div className="h-[12px] w-3/4 bg-bg2" />
        </div>
      ))}
    </div>
  );
}

export default function NewsFeed({ news, loading = false }: Props) {
  const { t } = useLang();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const seenIds = new Set<string>();
  const allItems = news.map((item, i) => {
    let key = item.id || item.url || `news-${i}`;
    if (seenIds.has(key)) key = `${key}-${i}`;
    seenIds.add(key);
    return { ...item, _key: key };
  });

  const items = activeFilter === 'all'
    ? allItems
    : allItems.filter(item => matchesFilter(item, activeFilter));

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between pb-3 border-b border-divider">
        <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3">
          {t.news.title}
        </span>
        <span className="text-[9px] font-mono text-text4">
          {loading ? '—' : `${news.length} ${t.news.sources}`} · GDELT + RSS
        </span>
      </div>

      {/* Chokepoint filter tabs */}
      <div className="flex border-b border-divider">
        {(['all', 'hormuz', 'redsea', 'suez', 'panama', 'taiwan'] as FilterKey[]).map(key => {
          const label = key === 'all' ? t.timeline.filters.all : FILTER_LABELS[key];
          const count = key === 'all'
            ? allItems.length
            : allItems.filter(item => matchesFilter(item, key)).length;
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[8px] font-mono uppercase tracking-[0.14em] border-b-2 transition-colors -mb-px ${
                activeFilter === key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text4 hover:text-text3'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-[7px] tabular-nums ${activeFilter === key ? 'text-accent/70' : 'text-text4/60'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <div className="max-h-[540px] overflow-y-auto scrollbar-thin -mr-1 pr-1">
        {loading && <NewsSkeleton />}

        {!loading && items.length === 0 && (
          <div className="py-10 text-center text-[11px] font-mono text-text3">
            {activeFilter === 'all'
              ? t.news.noArticles
              : `No ${FILTER_LABELS[activeFilter]} articles in feed`}
          </div>
        )}

        {!loading && items.map((item, i) => {
          const s = SENTIMENT_GLYPH[item.sentiment];
          const hasLink = item.url && item.url !== '#';
          const relPct = Math.round(item.relevance * 100);
          return (
            <a
              key={item._key}
              href={hasLink ? item.url : undefined}
              target={hasLink ? '_blank' : undefined}
              rel={hasLink ? 'noopener noreferrer' : undefined}
              aria-disabled={!hasLink}
              className={`block py-2.5 border-b border-divider/70 group hover:bg-bg1/30 transition-colors duration-100 ${
                hasLink ? 'cursor-pointer' : 'cursor-default'
              }`}
              style={{ animation: `fadeInUp 200ms ease ${Math.min(i, 8) * 30}ms both` }}
            >
              {/* Meta row */}
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[8px] font-mono font-semibold ${s.color}`} aria-hidden>
                  {s.mark}
                </span>
                <span className="text-[8px] font-mono text-text4 uppercase tracking-[0.12em] truncate max-w-[100px]">
                  {item.source}
                </span>
                <span className="text-text4/40 text-[8px]">·</span>
                <span className="text-[8px] font-mono text-text4 tabular-nums" suppressHydrationWarning>
                  {timeAgo(item.publishedAt)}
                </span>
                <span className={`ml-auto text-[8px] font-mono tabular-nums font-semibold ${relevanceColor(item.relevance)}`}>
                  {relPct}%
                </span>
              </div>

              {/* Headline */}
              <h4 className={`text-[12px] leading-snug line-clamp-2 transition-colors duration-150 ${
                hasLink ? 'text-text2 group-hover:text-accent' : 'text-text2'
              }`}>
                {item.title}
                {hasLink && (
                  <ExternalLink
                    size={9}
                    className="inline-block ml-1 -mt-0.5 text-text4 group-hover:text-accent/70"
                  />
                )}
              </h4>
            </a>
          );
        })}
      </div>
    </div>
  );
}
