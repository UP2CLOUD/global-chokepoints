'use client';

import { NewsItem } from '@/app/lib/types';
import { useLang } from './LangContext';
import { fmtDateShort } from '@/app/lib/utils';
import { ExternalLink } from 'lucide-react';

interface Props {
  news: NewsItem[];
  loading?: boolean;
}

const SENTIMENT_GLYPH: Record<'positive' | 'negative' | 'neutral', { mark: string; color: string }> = {
  positive: { mark: '▲', color: 'text-ok' },
  negative: { mark: '▼', color: 'text-danger' },
  neutral:  { mark: '─', color: 'text-text4' },
};

function NewsSkeleton() {
  return (
    <div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="py-4 border-b border-divider animate-pulse">
          <div className="h-[9px] w-48 bg-bg2 rounded-sm mb-3" />
          <div className="h-[14px] w-full bg-bg2 rounded-sm mb-1.5" />
          <div className="h-[14px] w-3/4 bg-bg2 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

export default function NewsFeed({ news, loading = false }: Props) {
  const { t, locale } = useLang();

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
      <div className="max-h-[520px] overflow-y-auto scrollbar-thin -mr-1 pr-1">
        {loading && <NewsSkeleton />}

        {!loading && items.length === 0 && (
          <div className="py-12 text-center text-[12px] font-mono text-text3">
            {t.news.noArticles}
          </div>
        )}

        {!loading && items.map((item, i) => {
          const s = SENTIMENT_GLYPH[item.sentiment];
          const hasLink = item.url && item.url !== '#';
          return (
            <a
              key={item._key}
              href={hasLink ? item.url : undefined}
              target={hasLink ? '_blank' : undefined}
              rel={hasLink ? 'noopener noreferrer' : undefined}
              aria-disabled={!hasLink}
              className={`block py-4 border-b border-divider group ${
                hasLink ? 'cursor-pointer' : 'cursor-default'
              }`}
              style={{
                animation: `fadeInUp 200ms ease ${Math.min(i, 8) * 35}ms both`,
              }}
            >
              {/* Meta row */}
              <div className="flex items-center gap-3 mb-1.5">
                <span className={`text-[9px] font-mono font-semibold ${s.color}`}>
                  {s.mark}
                </span>
                <span className="text-[9px] font-mono text-text3 uppercase tracking-wider truncate max-w-[120px]">
                  {item.source}
                </span>
                <span className="text-[9px] font-mono text-text4">
                  {fmtDateShort(item.publishedAt, locale)}
                </span>
                <span className="ml-auto text-[9px] font-mono text-text4 tabular-nums">
                  {Math.round(item.relevance * 100)}%
                </span>
              </div>

              {/* Headline */}
              <h4 className={`text-[13px] font-medium leading-snug line-clamp-2 transition-colors duration-150 ${
                hasLink ? 'group-hover:text-accent' : ''
              }`}>
                {item.title}
                {hasLink && (
                  <ExternalLink
                    size={10}
                    className="inline-block ml-1 -mt-0.5 text-text4 group-hover:text-accent"
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
