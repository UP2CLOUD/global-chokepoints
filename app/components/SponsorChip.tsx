'use client';

import { useLang } from './LangContext';

export default function SponsorChip() {
  const { t } = useLang();
  const name = process.env.NEXT_PUBLIC_SPONSOR_NAME;
  const url = process.env.NEXT_PUBLIC_SPONSOR_URL;

  if (!name) return null;

  const inner = (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono
      text-text3 bg-bg2/50 border border-divider/50 uppercase tracking-[0.1em]">
      {t.nav.supportedBy} <span className="text-text2">{name}</span>
    </span>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="hover:opacity-80 transition-opacity duration-200"
        aria-label={`${t.nav.supportedBy} ${name}`}
      >
        {inner}
      </a>
    );
  }

  return inner;
}
