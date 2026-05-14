'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLang } from './LangContext';

interface Props {
  onRefresh: () => Promise<void> | void;
}

export default function RefreshButton({ onRefresh }: Props) {
  const { t } = useLang();
  const [spinning, setSpinning] = useState(false);

  const handleClick = async () => {
    if (spinning) return;
    setSpinning(true);
    try {
      await onRefresh();
    } finally {
      setSpinning(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      title={t.refresh}
      aria-label={t.refresh}
      className="fixed bottom-5 right-5 w-11 h-11 rounded-full bg-bg2/95 border border-divider hover:border-accent/60 text-text2 hover:text-accent flex items-center justify-center backdrop-blur-md shadow-lg z-40 transition-colors duration-180 active:scale-95"
    >
      <RefreshCw size={18} className={spinning ? 'animate-spin' : ''} aria-hidden />
    </button>
  );
}
