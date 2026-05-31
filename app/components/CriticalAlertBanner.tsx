'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLang } from './LangContext';

interface Props {
  state: string | undefined;
}

export default function CriticalAlertBanner({ state }: Props) {
  const { t } = useLang();
  const [dismissed, setDismissed] = useState(true);

  const isCritical  = state === 'CLOSED';
  const isWarning   = state === 'PARTIALLY_CLOSED' || state === 'DISRUPTED';
  const isActive    = isCritical || isWarning;

  // Persist dismissal keyed to the state so a new state re-shows the banner
  const storageKey = `alert-dismissed:${state}`;

  useEffect(() => {
    if (!isActive) return;
    try {
      setDismissed(localStorage.getItem(storageKey) === '1');
    } catch {
      setDismissed(false);
    }
  }, [storageKey, isActive]);

  if (!isActive || dismissed) return null;

  const title = isCritical ? t.alert.criticalTitle : t.alert.warningTitle;
  const body  = isCritical ? t.alert.criticalBody  : t.alert.warningBody;

  const colorClass = isCritical
    ? 'bg-danger/10 border-danger/40 text-danger'
    : 'bg-caution/10 border-caution/40 text-caution';

  const dotClass = isCritical ? 'bg-danger' : 'bg-caution';

  function dismiss() {
    try { localStorage.setItem(storageKey, '1'); } catch { /* */ }
    setDismissed(true);
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`w-full border-b ${colorClass} animate-fadeInUp`}
    >
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-2.5 flex items-start sm:items-center gap-3">
        <span className={`mt-0.5 sm:mt-0 shrink-0 w-1.5 h-1.5 rounded-full animate-[pulse-dot_1.6s_ease-in-out_infinite] ${dotClass}`} />

        <AlertTriangle size={13} className="shrink-0 mt-0.5 sm:mt-0 opacity-80" aria-hidden />

        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mr-2">
            {title}
          </span>
          <span className="text-[11px] font-mono opacity-80 leading-relaxed">
            {body}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#main-content"
            className="text-[10px] font-mono uppercase tracking-[0.14em] underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity hidden sm:block"
          >
            {t.alert.learnMore}
          </a>
          <button
            onClick={dismiss}
            aria-label={t.alert.dismiss}
            className="p-1 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
