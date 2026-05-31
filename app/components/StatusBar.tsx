'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useLang } from './LangContext';
import { LANG_LOCALE } from '@/app/lib/translations';

type ProbeStatus = 'ok' | 'degraded' | 'down';
type Probe = { key: string; label: string; status: ProbeStatus; latencyMs: number; httpStatus: number | null };
type BindingProbe = { available: boolean; latencyMs: number; error?: string };
type Health = {
  overall: ProbeStatus;
  probes: Probe[];
  bindings?: { d1?: BindingProbe; kv?: BindingProbe };
  generatedAt: string;
};

const ICON: Record<ProbeStatus, JSX.Element> = {
  ok:       <CheckCircle2 size={12} className="text-ok" />,
  degraded: <AlertTriangle size={12} className="text-caution" />,
  down:     <XCircle size={12} className="text-danger" />,
};

export default function StatusBar() {
  const { lang, t } = useLang();
  const [health, setHealth] = useState<Health | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Health;
        if (!cancelled) setHealth(data);
      } catch {
        if (!cancelled) setHealth({ overall: 'degraded', probes: [], generatedAt: new Date().toISOString() });
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const overall = health?.overall ?? 'ok';
  const overallLabel = t.statusBar[overall];
  const locale = LANG_LOCALE[lang];
  const time = health
    ? new Date(health.generatedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '—';

  const dotClass = overall === 'ok' ? 'bg-ok' : overall === 'degraded' ? 'bg-caution' : 'bg-danger';

  return (
    <div className="sticky top-0 z-40 border-b border-divider bg-bg1/85 backdrop-blur-md">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 h-8 flex items-center gap-3 text-[11px] font-mono">
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label={`System health: ${overallLabel}`}
          className="flex items-center gap-2 text-text2 hover:text-text transition-colors duration-180"
        >
          <span className="relative inline-flex">
            <span className={`block w-2 h-2 rounded-full ${dotClass}`} />
            <span className={`absolute inset-0 rounded-full ${dotClass} opacity-60 animate-[pulse-dot_2.4s_ease-in-out_infinite]`} />
          </span>
          <span className="uppercase tracking-[0.14em]">{overallLabel}</span>
        </button>

        <span className="text-text4">·</span>
        <span className="text-text3" suppressHydrationWarning><Activity size={11} className="inline mr-1 -mt-0.5" />{time} UTC</span>

        <div className="ml-auto hidden md:flex items-center gap-3 text-text3">
          <a href="/methodology" className="hover:text-cyan transition-colors duration-180">{t.header.methodology}</a>
          <a href="/feed.xml" className="hover:text-cyan transition-colors duration-180">RSS</a>
          <a href="/v1/status" className="hover:text-cyan transition-colors duration-180">API</a>
        </div>
      </div>

      {open && health && (
        <div className="border-t border-divider bg-bg1/95 backdrop-blur-md">
          <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px]">
            {health.probes.map((p) => (
              <div key={p.key} className="flex items-center gap-1.5 text-text2">
                {ICON[p.status]}
                <span className="truncate">{p.label}</span>
                <span className="ml-auto font-mono text-text3">{p.latencyMs}ms</span>
              </div>
            ))}
            {health.bindings && (
              <>
                {health.bindings.d1 && (
                  <div className="flex items-center gap-1.5 text-text2">
                    {health.bindings.d1.available ? ICON.ok : ICON.down}
                    <span className="truncate">D1 (database)</span>
                    {health.bindings.d1.available && (
                      <span className="ml-auto font-mono text-text3">{health.bindings.d1.latencyMs}ms</span>
                    )}
                  </div>
                )}
                {health.bindings.kv && (
                  <div className="flex items-center gap-1.5 text-text2">
                    {health.bindings.kv.available ? ICON.ok : ICON.down}
                    <span className="truncate">KV (cache)</span>
                    {health.bindings.kv.available && (
                      <span className="ml-auto font-mono text-text3">{health.bindings.kv.latencyMs}ms</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
