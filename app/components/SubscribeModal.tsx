'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { createPortal } from 'react-dom';
import { useLang } from './LangContext';

type Phase = 'idle' | 'loading' | 'success' | 'error' | 'already' | 'confirmed';

const DONE_PHASES: Phase[] = ['success', 'already', 'confirmed'];
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export function SubscribeBellButton() {
  const { t } = useLang();
  // null = closed; Phase value = open in that state
  const [activePhase, setActivePhase] = useState<Phase | null>(null);

  // Open in confirmed state when redirected back from /api/confirm
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    if (p.get('subscribed') === '1') {
      setActivePhase('confirmed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <>
      <button
        onClick={() => setActivePhase('idle')}
        className="flex items-center gap-1.5 text-[11px] font-mono text-text3 hover:text-accent transition-colors duration-180 group"
        aria-label={t.subscribe.bellLabel}
      >
        <Bell size={11} className="group-hover:text-accent transition-colors duration-180" />
        <span>{t.subscribe.bellLabel}</span>
      </button>

      {activePhase !== null && (
        <SubscribeModal initialPhase={activePhase} onClose={() => setActivePhase(null)} />
      )}
    </>
  );
}

function SubscribeModal({ onClose, initialPhase = 'idle' }: { onClose: () => void; initialPhase?: Phase }) {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [errorMsg, setErrorMsg] = useState('');
  // When no Turnstile site key is configured (local dev), skip the widget
  const [turnstileToken, setTurnstileToken] = useState(TURNSTILE_SITE_KEY ? '' : 'dev-bypass');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input only when in idle phase
  useEffect(() => {
    if (phase === 'idle') inputRef.current?.focus();
  }, [phase]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === 'loading') return;
    setPhase('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, turnstileToken }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? 'Something went wrong. Please try again.');
        setPhase('error');
        return;
      }
      setPhase(json.alreadyConfirmed ? 'already' : 'success');
    } catch {
      setErrorMsg('Network error. Please check your connection.');
      setPhase('error');
    }
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={t.subscribe.title}
    >
      <div className="relative w-full max-w-md bg-bg1 border border-divider shadow-2xl overflow-hidden animate-fadeInUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-accent" />
            <span className="text-[12px] font-mono font-semibold text-text uppercase tracking-wider">
              {t.subscribe.title}
            </span>
          </div>
          <button onClick={onClose} className="text-text3 hover:text-text transition-colors" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-6">
          {DONE_PHASES.includes(phase) ? (
            <div className="text-center py-4">
              <CheckCircle size={40} className="text-ok mx-auto mb-4" />
              <h3 className="text-[14px] font-mono font-semibold text-text mb-2">
                {phase === 'confirmed' ? t.subscribe.confirmedTitle
                  : phase === 'already' ? t.subscribe.alreadyTitle
                  : t.subscribe.successTitle}
              </h3>
              <p className="text-[12px] font-mono text-text3 leading-relaxed">
                {phase === 'confirmed' ? t.subscribe.confirmedBody
                  : phase === 'already' ? t.subscribe.alreadyBody
                  : t.subscribe.successBody}
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 text-[11px] font-mono font-semibold bg-accent text-bg hover:bg-accent-hi transition-colors"
              >
                {t.subscribe.done}
              </button>
            </div>
          ) : (
            <>
              <p className="text-[12px] font-mono text-text3 leading-relaxed mb-5">
                {t.subscribe.subtitle}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text4 pointer-events-none" />
                  <input
                    ref={inputRef}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.subscribe.placeholder}
                    className="w-full pl-8 pr-4 py-2.5 bg-bg2 border border-divider
                               text-[12px] font-mono text-text placeholder-text4
                               focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                {phase === 'error' && (
                  <div className="flex items-center gap-2 text-[11px] font-mono text-danger">
                    <AlertCircle size={12} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {TURNSTILE_SITE_KEY && (
                  <div className="flex justify-center">
                    <Turnstile
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={setTurnstileToken}
                      options={{ theme: 'dark', size: 'flexible' }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={phase === 'loading' || !turnstileToken}
                  className="w-full py-2.5 bg-accent text-bg text-[12px] font-mono font-bold
                             hover:bg-accent-hi disabled:opacity-60
                             transition-colors flex items-center justify-center gap-2"
                >
                  {phase === 'loading'
                    ? <><Loader2 size={13} className="animate-spin" />{t.subscribe.loading}</>
                    : t.subscribe.submit
                  }
                </button>
              </form>

              <p className="mt-4 text-[10px] font-mono text-text4 text-center">
                {t.subscribe.note}
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function SubscribeInlineCTA() {
  const { t } = useLang();
  const [activePhase, setActivePhase] = useState<Phase | null>(null);

  return (
    <>
      <div className="border border-divider bg-bg2 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.22em] text-text3 mb-2">
              <Mail size={11} className="text-accent" />
              {t.subscribe.alertsLabel}
            </div>
            <p className="text-[12px] font-mono text-text3 leading-relaxed max-w-lg">
              {t.subscribe.alertsDesc}
            </p>
          </div>
          <button
            onClick={() => setActivePhase('idle')}
            className="shrink-0 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.12em]
              text-bg bg-accent hover:bg-accent-hi font-semibold
              transition-all duration-200"
          >
            {t.subscribe.alertsCta}
          </button>
        </div>
      </div>

      {activePhase !== null && (
        <SubscribeModal onClose={() => setActivePhase(null)} />
      )}
    </>
  );
}
