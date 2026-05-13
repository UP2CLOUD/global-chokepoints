'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { useLang } from './LangContext';

type Phase = 'idle' | 'loading' | 'success' | 'error' | 'already';

export function SubscribeBellButton() {
  const [open, setOpen] = useState(false);

  // Show success banner if redirected back from /api/confirm
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    if (p.get('subscribed') === '1') {
      setOpen(true);
      // Clean the URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[11px] font-mono text-text3 hover:text-accent transition-colors duration-180 group"
        aria-label="Subscribe to strait status alerts"
      >
        <Bell
          size={11}
          className="group-hover:text-accent transition-colors duration-180"
        />
        <span>Alerts</span>
      </button>

      {open && <SubscribeModal onClose={() => setOpen(false)} />}
    </>
  );
}

function SubscribeModal({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Trap focus + close on Escape
  useEffect(() => {
    inputRef.current?.focus();
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

  const t = {
    title:       lang === 'en' ? 'Get status alerts' : 'Receber alertas',
    subtitle:    lang === 'en'
      ? "We'll email you when the Strait of Hormuz status changes — open, disrupted, or closed."
      : 'Enviaremos um email quando o status do Estreito de Ormuz mudar.',
    placeholder: lang === 'en' ? 'your@email.com' : 'seu@email.com',
    submit:      lang === 'en' ? 'Subscribe' : 'Subscrever',
    loading:     lang === 'en' ? 'Sending…' : 'Enviando…',
    successTitle: lang === 'en' ? 'Check your inbox' : 'Verifique seu email',
    successBody:  lang === 'en'
      ? "We've sent a confirmation link. Click it to activate your alerts."
      : 'Enviámos um link de confirmação. Clique para ativar os alertas.',
    alreadyTitle: lang === 'en' ? 'Already subscribed' : 'Já subscrito',
    alreadyBody:  lang === 'en'
      ? "This email is already confirmed and will receive status alerts."
      : 'Este email já está confirmado e receberá alertas de status.',
    note: lang === 'en'
      ? 'No spam. One-click unsubscribe in every email.'
      : 'Sem spam. Cancelamento com um clique em cada email.',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Subscribe to alerts"
    >
      <div className="relative w-full max-w-md bg-bg1 border border-divider rounded-xl shadow-2xl overflow-hidden animate-fadeInUp">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-accent" />
            <span className="text-[12px] font-mono font-semibold text-text uppercase tracking-wider">
              {t.title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text3 hover:text-text transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-6">
          {(phase === 'success' || phase === 'already') ? (
            <div className="text-center py-4">
              <CheckCircle size={40} className="text-ok mx-auto mb-4" />
              <h3 className="text-[14px] font-mono font-semibold text-text mb-2">
                {phase === 'already' ? t.alreadyTitle : t.successTitle}
              </h3>
              <p className="text-[12px] font-mono text-text3 leading-relaxed">
                {phase === 'already' ? t.alreadyBody : t.successBody}
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 text-[11px] font-mono font-semibold bg-accent text-bg rounded-md hover:bg-accent-hi transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="text-[12px] font-mono text-text3 leading-relaxed mb-5">
                {t.subtitle}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text4 pointer-events-none"
                  />
                  <input
                    ref={inputRef}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.placeholder}
                    className="w-full pl-8 pr-4 py-2.5 bg-bg2 border border-divider rounded-md
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

                <div className="flex justify-center">
                  <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                    onSuccess={setTurnstileToken}
                    options={{ theme: 'dark', size: 'flexible' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={phase === 'loading' || !turnstileToken}
                  className="w-full py-2.5 bg-accent text-bg text-[12px] font-mono font-bold
                             rounded-md hover:bg-accent-hi disabled:opacity-60
                             transition-colors flex items-center justify-center gap-2"
                >
                  {phase === 'loading'
                    ? <><Loader2 size={13} className="animate-spin" />{t.loading}</>
                    : t.submit
                  }
                </button>
              </form>

              <p className="mt-4 text-[10px] font-mono text-text4 text-center">
                {t.note}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * SubscribeInlineCTA — full-width newsletter capture strip for the dashboard.
 * Opens the subscribe modal when clicked.
 */
export function SubscribeInlineCTA() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-divider bg-card/40 backdrop-blur-sm p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2 mb-2">
              <Mail size={13} className="text-accent" />
              {lang === 'en' ? 'Status Alerts' : 'Alertas de Status'}
            </div>
            <p className="text-[12px] text-text3 leading-relaxed max-w-lg">
              {lang === 'en'
                ? 'Get notified when the risk signal changes. One short alert when it matters \u2014 no spam, no newsletters.'
                : 'Seja notificado quando o sinal de risco mudar. Um alerta curto quando importa \u2014 sem spam, sem newsletters.'}
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 px-4 py-2 rounded-lg text-[11px] font-mono uppercase tracking-[0.12em]
              text-bg bg-accent hover:bg-accent-hi font-semibold
              transition-all duration-200"
          >
            {lang === 'en' ? 'Subscribe' : 'Inscrever-se'}
          </button>
        </div>
      </div>

      {open && <SubscribeModal onClose={() => setOpen(false)} />}
    </>
  );
}
