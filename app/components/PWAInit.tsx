'use client';

import { useEffect, useState } from 'react';
import { useLang } from './LangContext';

type BeforeInstallPromptEvent = Event & { prompt(): Promise<void> };

export default function PWAInit() {
  const { t } = useLang();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!installPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[9000] border border-accent/40 bg-bg1/95 backdrop-blur-md p-4 animate-fadeInUp">
      <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-accent mb-1">{t.pwa.title}</div>
      <p className="text-[11px] font-mono text-text3 mb-3 leading-relaxed">
        {t.pwa.description}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => { installPrompt.prompt(); setInstallPrompt(null); }}
          className="text-[10px] font-mono uppercase tracking-[0.14em] bg-accent text-bg px-3 py-1.5 hover:bg-accent-hi transition-colors"
        >
          {t.pwa.install}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-[10px] font-mono text-text4 hover:text-text3 transition-colors uppercase tracking-[0.14em]"
        >
          {t.pwa.notNow}
        </button>
      </div>
    </div>
  );
}
