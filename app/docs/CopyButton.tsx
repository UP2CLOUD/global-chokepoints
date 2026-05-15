'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable
    }
  };

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy to clipboard"
      className="flex items-center gap-1.5 text-[10px] font-mono text-text4 hover:text-text2 transition-colors duration-120"
    >
      {copied
        ? <><Check size={11} className="text-ok" /><span className="text-ok">copied</span></>
        : <><Copy size={11} /><span>copy</span></>}
    </button>
  );
}
