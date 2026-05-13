'use client';

import { useLang } from './LangContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const { t } = useLang();

  return (
    <header className="sticky top-8 z-30 border-b border-divider bg-bg/85 backdrop-blur-xl">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <div className="relative w-5 h-5 rounded-full border border-accent/60" aria-hidden>
            <span className="absolute inset-1 rounded-full bg-accent/30" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-ok rounded-full animate-[pulse-dot_2.4s_ease-in-out_infinite]" />
          </div>
          <div className="leading-tight">
            <h1 className="text-[15px] font-semibold tracking-tight font-mono">
              {t.header.title}<span className="text-accent">{t.header.titleAccent}</span>
            </h1>
            <p className="hidden md:block text-[9px] text-text3 uppercase tracking-[0.18em] font-mono">
              {t.header.subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg2/80 border border-divider">
            <span className="w-1.5 h-1.5 bg-ok rounded-full animate-[live-pulse_2s_ease-in-out_infinite]" aria-hidden />
            <span className="text-[10px] text-text2 font-mono tracking-[0.18em]">{t.header.live}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
