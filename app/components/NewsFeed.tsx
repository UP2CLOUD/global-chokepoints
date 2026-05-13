'use client';

import { NewsItem } from '@/app/lib/types';
import { useLang } from './LangContext';
import { fmtDateShort } from '@/app/lib/utils';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  news: NewsItem[];
}

const SENTIMENT = {
  positive: { Icon: TrendingUp,   color: 'text-ok',     label: 'POSITIVE' },
  negative: { Icon: TrendingDown, color: 'text-danger', label: 'NEGATIVE' },
  neutral:  { Icon: Minus,        color: 'text-text3',  label: 'NEUTRAL' },
} as const;

export default function NewsFeed({ news }: Props) {
  const { lang, t } = useLang();
  const locale = lang === 'en' ? 'en-US' : 'pt-BR';

  // Defensive uniqueness — even if upstream slips a duplicate id through
  // (it has historically), React still gets stable, unique keys.
  const seenIds = new Set<string>();
  const items = news.map((item, i) => {
    let key = item.id || item.url || `news-${i}`;
    if (seenIds.has(key)) key = `${key}-${i}`;
    seenIds.add(key);
    return { ...item, _key: key };
  });

  return (
    <section className="rounded-xl border border-divider bg-card/70 p-4 md:p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
          <Newspaper size={13} className="text-accent" />
          {t.news.title}
        </div>
        <span className="text-[10px] text-text3 font-mono">
          {news.length} {t.news.sources}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
        {items.length === 0 && (
          <div className="text-[12px] font-mono text-text3 py-8 text-center">
            {lang === 'en' ? 'No matching articles yet. Polling…' : 'Nenhum artigo correspondente ainda. Atualizando…'}
          </div>
        )}
        {items.map((item, i) => {
          const s = SENTIMENT[item.sentiment];
          const hasLink = item.url && item.url !== '#';
          return (
            <a
              key={item._key}
              href={hasLink ? item.url : undefined}
              target={hasLink ? '_blank' : undefined}
              rel={hasLink ? 'noopener noreferrer' : undefined}
              aria-disabled={!hasLink}
              className={`block p-3 rounded-lg bg-bg1/60 border border-divider transition-colors duration-180 ${hasLink ? 'hover:border-accent/40 hover:bg-bg1/90 cursor-pointer' : 'opacity-80 cursor-default'}`}
              style={{ animation: `fadeInUp 180ms cubic-bezier(0.2,0.8,0.2,1) ${Math.min(i, 8) * 40}ms both` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-medium text-text leading-snug line-clamp-2">
                    {item.title}
                    {hasLink && <ExternalLink size={10} className="inline-block ml-1 -mt-0.5 text-text3" />}
                  </h4>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-text3 font-mono">
                    <span className="truncate max-w-[140px]">{item.source}</span>
                    <span className="text-text4">·</span>
                    <span>{fmtDateShort(item.publishedAt, locale)}</span>
                    <span className="text-text4">·</span>
                    <span className={`inline-flex items-center gap-1 ${s.color}`}>
                      <s.Icon size={10} aria-hidden />
                      <span className="uppercase tracking-wider">{s.label}</span>
                    </span>
                  </div>
                </div>
                <div className="text-[9px] text-text3 font-mono">
                  {Math.round(item.relevance * 100)}%
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
