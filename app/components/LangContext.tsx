'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Lang } from '@/app/lib/types';
import { translations, LANG_LOCALE, HTML_LANG } from '@/app/lib/translations';

export { LANG_LOCALE };

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: typeof translations.en;
  locale: string;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

const STORAGE_KEY = 'hormuz-lang';
const VALID_LANGS = Object.keys(translations) as Lang[];
const RTL_LANGS = new Set<Lang>(['ar']);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  // Restore saved language preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved && VALID_LANGS.includes(saved)) {
        setLangState(saved);
        document.documentElement.lang = HTML_LANG[saved];
        document.documentElement.dir = RTL_LANGS.has(saved) ? 'rtl' : 'ltr';
      }
    } catch {
      // localStorage may be blocked in some environments
    }
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    document.documentElement.lang = HTML_LANG[newLang];
    document.documentElement.dir = RTL_LANGS.has(newLang) ? 'rtl' : 'ltr';
    try { localStorage.setItem(STORAGE_KEY, newLang); } catch { /* ignore */ }
  }, []);

  const t = translations[lang] as typeof translations.en;
  const locale = LANG_LOCALE[lang];

  return (
    <LangContext.Provider value={{ lang, setLang, t, locale }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LangContext);
  if (!context) throw new Error('useLang must be used within LangProvider');
  return context;
}
