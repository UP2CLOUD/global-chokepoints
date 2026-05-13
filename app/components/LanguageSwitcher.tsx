'use client';

import { useLang } from './LangContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'pt' : 'en')}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg2/80 border border-divider text-[10px] font-mono text-text2 hover:border-accent/40 hover:text-accent transition-colors duration-180"
      aria-label={`Switch to ${lang === 'en' ? 'Portuguese' : 'English'}`}
    >
      <Globe size={12} />
      <span className="uppercase font-semibold">{lang === 'en' ? 'EN' : 'PT'}</span>
    </button>
  );
}
