'use client';

import { useLang } from './LangContext';

export default function SkipLink() {
  const { t } = useLang();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-accent focus:text-bg focus:font-mono focus:text-[10px] focus:uppercase focus:tracking-[0.14em] focus:outline-none"
    >
      {t.nav.skipToMain}
    </a>
  );
}
