'use client';

import { useEffect, useState } from 'react';
import { useLang } from './LangContext';
import LanguageSwitcher from './LanguageSwitcher';
import SupportButton from './SupportButton';
import SponsorChip from './SponsorChip';

export default function Header() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[1100] transition-colors duration-200 ${
        scrolled
          ? 'bg-bg1/96 border-b border-divider'
          : 'bg-transparent border-b border-white/[0.04]'
      }`}
      style={scrolled ? { backdropFilter: 'none' } : undefined}
    >
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 flex items-center justify-between h-16">

        {/* Brand mark — stacked editorial wordmark */}
        <div className="flex items-center gap-3" aria-label="IsStraitHormuzOpen?">
          <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" aria-hidden />
          <div className="flex flex-col gap-[3px]">
            <span className="text-[9px] font-mono uppercase tracking-[0.28em] text-text3 leading-none">
              IS STRAIT
            </span>
            <h1 className="font-headline font-black italic text-[32px] leading-none tracking-tight text-text">
              HORMUZ
            </h1>
            <span className="text-[9px] font-mono uppercase tracking-[0.28em] text-accent leading-none">
              OPEN?
            </span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 md:gap-4">
          <SponsorChip />
          <LanguageSwitcher />

          <div className="hidden sm:flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-ok animate-[live-pulse_2s_ease-in-out_infinite]"
              aria-hidden
            />
            <span className="text-[8px] font-mono text-text3 tracking-[0.22em] uppercase">
              {t.header.live}
            </span>
          </div>

          <a
            href="/methodology"
            className="hidden md:block text-[9px] font-mono text-text3 hover:text-text2 transition-colors uppercase tracking-[0.18em]"
          >
            {t.header.methodology}
          </a>
          <a
            href="/docs"
            className="hidden md:block text-[9px] font-mono text-text3 hover:text-text2 transition-colors uppercase tracking-[0.18em]"
          >
            {t.header.api}
          </a>
          <SupportButton variant="header" />
        </div>
      </div>
    </header>
  );
}
