'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useLang } from '@/app/components/LangContext';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  const { t } = useLang();

  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg text-text font-mono flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-[9px] uppercase tracking-[0.22em] text-danger mb-3">500</div>
        <div className="text-[48px] font-black leading-none text-danger mb-4" style={{ fontFamily: 'var(--font-jetbrains)' }}>
          {t.error.title}
        </div>
        <p className="text-[13px] text-text3 leading-relaxed mb-8">
          {t.error.message}
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-text4 mb-6">
            ref: {error.digest}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={reset}
            className="text-[10px] font-mono uppercase tracking-[0.14em] bg-accent text-bg px-4 py-2 hover:bg-accent-hi transition-colors"
          >
            {t.error.retry}
          </button>
          <Link
            href="/"
            className="text-[10px] font-mono uppercase tracking-[0.14em] border border-divider text-text3 px-4 py-2 hover:border-accent/50 hover:text-accent transition-colors"
          >
            {t.notFound.liveStatus}
          </Link>
        </div>
      </div>
    </div>
  );
}
