'use client';

import { useState } from 'react';
import { Key, Copy, Check } from 'lucide-react';

export default function KeysPage() {
  const [label, setLabel]         = useState('');
  const [rateLimit, setRateLimit] = useState(1000);
  const [result, setResult]       = useState<{ key: string; id: string; rateLimit: number } | null>(null);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [copied, setCopied]       = useState(false);

  const issue = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, rateLimit }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? 'Failed'); return; }
      setResult(j);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-bg text-text font-mono">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">

        <div className="flex items-center gap-2 mb-2">
          <Key size={14} className="text-accent" />
          <span className="text-[9px] uppercase tracking-[0.22em] text-accent">Public API</span>
        </div>
        <h1 className="text-[22px] font-bold text-text mb-2">Get an API Key</h1>
        <p className="text-[12px] text-text3 leading-relaxed mb-8 max-w-prose">
          API keys are optional —{' '}
          <a href="/v1/status" className="text-accent hover:text-accent-hi transition-colors">/v1/*</a>{' '}
          endpoints are publicly accessible without one. A key gives you a named rate-limit quota and
          usage tracking via <span className="text-text">X-RateLimit-*</span> response headers.
        </p>

        {!result && (
          <div className="border border-divider bg-bg1 p-6 flex flex-col gap-4">
            <div>
              <label className="block text-[9px] uppercase tracking-[0.2em] text-text3 mb-1.5">Label (optional)</label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="my-app, dashboard, ..."
                maxLength={80}
                className="w-full bg-bg border border-divider text-[12px] text-text px-3 py-2 focus:outline-none focus:border-accent/60 placeholder:text-text4"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-[0.2em] text-text3 mb-1.5">
                Daily request limit
                <span className="text-text4 ml-2 normal-case">(100–10,000)</span>
              </label>
              <input
                type="number"
                value={rateLimit}
                onChange={e => setRateLimit(Number(e.target.value))}
                min={100}
                max={10000}
                className="w-full bg-bg border border-divider text-[12px] text-text px-3 py-2 focus:outline-none focus:border-accent/60"
              />
            </div>
            {error && <p className="text-[11px] text-danger">{error}</p>}
            <button
              onClick={issue}
              disabled={loading}
              className="text-[10px] uppercase tracking-[0.14em] bg-accent text-bg px-4 py-2.5 hover:bg-accent-hi transition-colors disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Generate Key'}
            </button>
          </div>
        )}

        {result && (
          <div className="border border-ok/40 bg-ok/[0.04] p-6 flex flex-col gap-4">
            <div className="text-[9px] uppercase tracking-[0.22em] text-ok">Key Generated — Save it now</div>
            <div className="flex items-center gap-3">
              <code className="flex-1 text-[12px] text-text bg-bg border border-divider px-3 py-2 break-all">
                {result.key}
              </code>
              <button
                onClick={copyKey}
                className="shrink-0 p-2 border border-divider hover:border-accent/50 hover:text-accent transition-colors"
                aria-label="Copy key"
              >
                {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-[11px] text-caution">
              This key will not be shown again. Store it in a secure location.
            </p>
            <div className="grid grid-cols-2 gap-3 text-[11px] border-t border-divider pt-4">
              <div>
                <div className="text-text4 text-[9px] uppercase tracking-[0.16em] mb-0.5">Key ID</div>
                <div className="text-text3 break-all">{result.id}</div>
              </div>
              <div>
                <div className="text-text4 text-[9px] uppercase tracking-[0.16em] mb-0.5">Daily Limit</div>
                <div className="text-text3">{result.rateLimit.toLocaleString()} req/day</div>
              </div>
            </div>
            <button
              onClick={() => { setResult(null); setLabel(''); setRateLimit(1000); }}
              className="text-[10px] text-text3 hover:text-text2 transition-colors uppercase tracking-[0.14em]"
            >
              Generate another key
            </button>
          </div>
        )}

        <div className="mt-8 border-t border-divider pt-8 flex flex-col gap-5">
          <div className="text-[9px] uppercase tracking-[0.22em] text-text3">Usage</div>
          {[
            ['Authorization header', 'Authorization: Bearer gca_your_key'],
            ['X-API-Key header',     'X-API-Key: gca_your_key'],
          ].map(([lbl, code]) => (
            <div key={lbl}>
              <div className="text-[10px] text-text3 mb-1">{lbl}</div>
              <pre className="bg-bg1 border border-divider text-[11px] text-accent px-3 py-2 overflow-x-auto">{code}</pre>
            </div>
          ))}
          <p className="text-[11px] text-text4 leading-relaxed">
            Rate limit headers returned on every keyed request:{' '}
            <span className="text-text3">X-RateLimit-Limit</span> and{' '}
            <span className="text-text3">X-RateLimit-Remaining</span>. Quota resets at midnight UTC.
          </p>
          <a href="/docs" className="text-[10px] text-accent hover:text-accent-hi transition-colors uppercase tracking-[0.14em]">
            Full API reference →
          </a>
        </div>
      </div>
    </div>
  );
}
