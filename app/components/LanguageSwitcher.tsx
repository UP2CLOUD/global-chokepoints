'use client';

import { useRef, useState, useEffect } from 'react';
import { useLang } from './LangContext';
import { Globe } from 'lucide-react';
import { Lang } from '@/app/lib/types';
import { LANG_FLAG, LANG_LABEL, LANG_NATIVE } from '@/app/lib/translations';

const LANGS = Object.keys(LANG_LABEL) as Lang[];

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-bg2/80 border border-divider text-[10px] font-mono text-text2 hover:border-accent/40 hover:text-accent transition-colors duration-180"
        aria-label={t.nav.selectLanguage}
        aria-expanded={open}
      >
        <Globe size={12} />
        <span className="uppercase font-semibold">{LANG_FLAG[lang]} {LANG_LABEL[lang]}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-[2000] min-w-[150px] border border-divider bg-bg1/95 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden animate-fadeInUp">
          {LANGS.map(l => (
            <button
              key={l}
              onClick={() => { setLang(l); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[11px] font-mono transition-colors duration-150 ${
                l === lang
                  ? 'bg-accent/10 text-accent'
                  : 'text-text2 hover:bg-bg2/60 hover:text-text'
              }`}
            >
              <span className="text-base leading-none">{LANG_FLAG[l]}</span>
              <span className="font-semibold uppercase tracking-[0.1em]">{LANG_LABEL[l]}</span>
              <span className="text-text3 ml-auto text-[10px]">{LANG_NATIVE[l]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
