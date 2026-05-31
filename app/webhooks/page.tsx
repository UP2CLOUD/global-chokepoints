'use client';

import { useState } from 'react';
import { Webhook, Copy, Check, Trash2, Plus } from 'lucide-react';

type WebhookResult = {
  id: string;
  url: string;
  secret: string;
  events: string;
};

export default function WebhooksPage() {
  const [url, setUrl]         = useState('');
  const [events, setEvents]   = useState('status_change');
  const [result, setResult]   = useState<WebhookResult | null>(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [showForm, setShowForm] = useState(true);

  const register = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, events }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? 'Failed'); return; }
      setResult(j);
      setShowForm(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-bg text-text font-mono">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">

        <div className="flex items-center gap-2 mb-2">
          <Webhook size={14} className="text-accent" />
          <span className="text-[9px] uppercase tracking-[0.22em] text-accent">Webhooks</span>
        </div>
        <h1 className="text-[22px] font-bold text-text mb-2">Register a Webhook</h1>
        <p className="text-[12px] text-text3 leading-relaxed mb-8 max-w-prose">
          Receive HMAC-SHA256-signed HTTP POST notifications whenever the strait status changes.
          Your endpoint must use <span className="text-text">HTTPS</span> and return 2xx within 10 seconds.
        </p>

        {showForm && (
          <div className="border border-divider bg-bg1 p-6 flex flex-col gap-4">
            <div>
              <label className="block text-[9px] uppercase tracking-[0.2em] text-text3 mb-1.5">Endpoint URL</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="w-full bg-bg border border-divider text-[12px] text-text px-3 py-2 focus:outline-none focus:border-accent/60 placeholder:text-text4"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-[0.2em] text-text3 mb-1.5">Events</label>
              <select
                value={events}
                onChange={e => setEvents(e.target.value)}
                className="w-full bg-bg border border-divider text-[12px] text-text px-3 py-2 focus:outline-none focus:border-accent/60"
              >
                <option value="status_change">status_change</option>
              </select>
            </div>
            {error && <p className="text-[11px] text-danger">{error}</p>}
            <button
              onClick={register}
              disabled={loading || !url}
              className="text-[10px] uppercase tracking-[0.14em] bg-accent text-bg px-4 py-2.5 hover:bg-accent-hi transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Plus size={12} />
              {loading ? 'Registering…' : 'Register Webhook'}
            </button>
          </div>
        )}

        {result && (
          <div className="border border-ok/40 bg-ok/[0.04] p-6 flex flex-col gap-4">
            <div className="text-[9px] uppercase tracking-[0.22em] text-ok">Webhook Registered — Save the secret</div>
            <div className="flex flex-col gap-2">
              <div>
                <div className="text-[9px] text-text4 uppercase tracking-[0.16em] mb-1">Endpoint</div>
                <div className="text-[11px] text-text break-all">{result.url}</div>
              </div>
              <div>
                <div className="text-[9px] text-text4 uppercase tracking-[0.16em] mb-1">Webhook ID</div>
                <div className="text-[11px] text-text3">{result.id}</div>
              </div>
              <div>
                <div className="text-[9px] text-text4 uppercase tracking-[0.16em] mb-1">Signing Secret</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[11px] text-text bg-bg border border-divider px-3 py-2 break-all">
                    {result.secret}
                  </code>
                  <button onClick={copySecret} className="shrink-0 p-2 border border-divider hover:border-accent/50 hover:text-accent transition-colors">
                    {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-caution">
              Store this secret — it will not be shown again. Use it to verify the{' '}
              <span className="text-text">X-Signature-256</span> header on incoming requests.
            </p>
            <button
              onClick={() => { setResult(null); setUrl(''); setShowForm(true); }}
              className="text-[10px] text-text3 hover:text-text2 transition-colors uppercase tracking-[0.14em] flex items-center gap-1.5"
            >
              <Plus size={10} /> Register another
            </button>
          </div>
        )}

        {/* Verification docs */}
        <div className="mt-8 border-t border-divider pt-8 flex flex-col gap-5">
          <div className="text-[9px] uppercase tracking-[0.22em] text-text3">Verifying Signatures</div>
          <p className="text-[11px] text-text4 leading-relaxed">
            Each delivery includes an{' '}
            <span className="text-text">X-Signature-256: sha256=&lt;hex&gt;</span> header.
            Compute <span className="text-text">HMAC-SHA256(secret, rawBody)</span> and compare.
          </p>
          <pre className="bg-bg1 border border-divider text-[10px] text-text3 p-3 overflow-x-auto leading-relaxed">{`// Node.js verification example
import { createHmac } from 'crypto';

function verify(secret, rawBody, sigHeader) {
  const expected = 'sha256=' +
    createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
  return sigHeader === expected;
}`}</pre>

          <div className="text-[9px] uppercase tracking-[0.22em] text-text3">Payload Schema</div>
          <pre className="bg-bg1 border border-divider text-[10px] text-accent p-3 overflow-x-auto leading-relaxed">{`{
  "event": "status_change",
  "previousStatus": "OPEN",
  "currentStatus": "PARTIALLY_CLOSED",
  "tensionIndex": 62,
  "reason": "Houthi vessels reported near...",
  "timestamp": "2026-05-31T10:00:00.000Z"
}`}</pre>
        </div>
      </div>
    </div>
  );
}
