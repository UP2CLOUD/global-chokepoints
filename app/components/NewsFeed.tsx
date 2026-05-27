'use client';

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
          <div className="h-[8px] w-36 bg-bg2 rounded-sm mb-2" />
          <div className="h-[12px] w-full bg-bg2 rounded-sm mb-1" />
          <div className="h-[12px] w-3/4 bg-bg2 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

export default function NewsFeed({ news, loading = false }: Props) {
  const { t } = useLang();

  const seenIds = new Set<string>();
  const items = news.map((item, i) => {
    let key = item.id || item.url || `news-${i}`;
    if (seenIds.has(key)) key = `${key}-${i}`;
    seenIds.add(key);
    return { ...item, _key: key };
  });

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

      {/* Feed */}
      <div className="max-h-[540px] overflow-y-auto scrollbar-thin -mr-1 pr-1">
        {loading && <NewsSkeleton />}

        {!loading && items.length === 0 && (
          <div className="py-10 text-center text-[11px] font-mono text-text3">
            {t.news.noArticles}
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
