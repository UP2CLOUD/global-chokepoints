'use client';

import { useState, useEffect } from 'react';

const LANGS = [
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'it', label: 'Italiano' },
  { value: 'ru', label: 'Русский' },
  { value: 'de', label: 'Deutsch' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ar', label: 'العربية' },
];

export default function EmbedConfigurePage() {
  const [lang, setLang]     = useState('en');
  const [height, setHeight] = useState(440);
  const [width, setWidth]   = useState('100%');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const src     = `${origin}/embed?lang=${lang}`;
  const snippet = `<iframe\n  src="${src}"\n  width="${width}"\n  height="${height}"\n  frameborder="0"\n  scrolling="no"\n  style="border:none;display:block"\n  title="Global Chokepoints Alerts — Live Status"\n></iframe>`;

  const copy = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-bg text-text font-mono">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">

        <div className="mb-8">
          <div className="text-[9px] uppercase tracking-[0.22em] text-accent mb-2">Embed Generator</div>
          <h1 className="text-[22px] font-bold text-text leading-tight">Configure Your Widget</h1>
          <p className="text-[12px] text-text3 mt-2 max-w-xl leading-relaxed">
            Embed a live Global Chokepoints Alerts status widget on your site. Configure below, then copy the HTML snippet.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8">

          <div className="flex flex-col gap-5">

            <div>
              <label className="block text-[9px] uppercase tracking-[0.2em] text-text3 mb-1.5">Language</label>
              <select
                value={lang}
                onChange={e => setLang(e.target.value)}
                className="w-full bg-bg1 border border-divider text-[12px] text-text px-3 py-2 focus:outline-none focus:border-accent/60"
              >
                {LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-[0.2em] text-text3 mb-1.5">Width</label>
              <input
                type="text"
                value={width}
                onChange={e => setWidth(e.target.value)}
                className="w-full bg-bg1 border border-divider text-[12px] text-text px-3 py-2 focus:outline-none focus:border-accent/60"
                placeholder="100% or 600px"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-[0.2em] text-text3 mb-1.5">Height (px)</label>
              <input
                type="number"
                value={height}
                onChange={e => setHeight(Number(e.target.value))}
                min={300}
                max={900}
                className="w-full bg-bg1 border border-divider text-[12px] text-text px-3 py-2 focus:outline-none focus:border-accent/60"
              />
            </div>

            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-text3 mb-1.5">HTML Snippet</div>
              <pre className="bg-bg1 border border-divider text-[10px] text-text3 p-3 overflow-x-auto whitespace-pre leading-relaxed">
                {snippet}
              </pre>
              <button
                onClick={copy}
                className="mt-2 w-full text-[10px] uppercase tracking-[0.14em] border border-accent/40 text-accent px-3 py-2 hover:bg-accent/5 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy HTML'}
              </button>
            </div>

            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-text3 mb-1.5">Direct URL</div>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-accent hover:text-accent-hi transition-colors break-all"
              >
                {src}
              </a>
            </div>

            <p className="text-[10px] text-text4 leading-relaxed border-t border-divider pt-4">
              Free to embed under CC-BY-4.0. Attribution required:{' '}
              <span className="text-text3">"Global Chokepoints Alerts"</span> with a link to{' '}
              <span className="text-text3">global-chokepoints.pages.dev</span>.
            </p>
          </div>

          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-text3 mb-2">Live Preview</div>
            {origin ? (
              <iframe
                key={`${lang}-${height}`}
                src={src}
                width={width}
                height={height}
                frameBorder={0}
                scrolling="no"
                style={{ border: '1px solid var(--divider)', display: 'block', maxWidth: '100%' }}
                title="Embed preview"
              />
            ) : (
              <div
                className="border border-divider bg-bg1 flex items-center justify-center"
                style={{ height }}
              >
                <span className="text-[10px] text-text4 uppercase tracking-widest">Loading preview…</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
