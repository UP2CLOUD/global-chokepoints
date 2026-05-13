'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Lang } from '@/app/lib/types';
import { translations } from '@/app/lib/translations';

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: typeof translations.en;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    document.documentElement.lang = newLang === 'en' ? 'en' : 'pt-BR';
  }, []);

  // `translations` is declared `as const` so each language has a distinct
  // literal-string type. Cast to the EN shape — both branches are
  // structurally identical, only string values differ.
  const t = translations[lang] as typeof translations.en;

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LangContext);
  if (!context) throw new Error('useLang must be used within LangProvider');
  return context;
}
