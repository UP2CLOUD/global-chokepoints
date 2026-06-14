'use client';

import { useLang } from './LangContext';

export default function LoadingScreen() {
  const { t } = useLang();

  return (
    <div
      role="status"
      aria-label={t.loading}
      className="fixed inset-0 bg-bg flex flex-col items-center justify-center gap-4 z-[100]"
    >
      <div className="w-8 h-8 border-2 border-divider border-t-accent rounded-full animate-spin" aria-hidden />
      <p className="text-[11px] text-text3 font-mono uppercase tracking-[0.18em]">{t.loading}</p>
    </div>
  );
}
