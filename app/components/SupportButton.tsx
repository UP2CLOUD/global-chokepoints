'use client';

import { Heart } from 'lucide-react';
import { useLang } from './LangContext';

interface Props {
  variant?: 'header' | 'footer' | 'inline';
  className?: string;
}

export default function SupportButton({ variant = 'header', className = '' }: Props) {
  const { t } = useLang();
  const url = process.env.NEXT_PUBLIC_SUPPORT_URL;

  const handleClick = (e: React.MouseEvent) => {
    if (!url) {
      e.preventDefault();
      alert('Support URL not configured. Please set NEXT_PUBLIC_SUPPORT_URL in your .env.local file.');
    }
  };

  // In production, hide if no URL is set
  if (!url && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return null;
  }

  const commonProps = {
    href: url || '#',
    target: url ? "_blank" : undefined,
    rel: url ? "noopener noreferrer" : undefined,
    onClick: handleClick,
  };

  if (variant === 'header') {
    return (
      <a
        {...commonProps}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono
          text-text2 hover:text-accent border border-divider hover:border-accent/40
          bg-bg2 transition-all duration-200 uppercase tracking-[0.12em]
          ${className}`}
        aria-label={t.footer.supportAria}
      >
        <Heart size={11} className="text-danger/70" />
        <span className="hidden sm:inline">{t.footer.supportBtn}</span>
      </a>
    );
  }

  if (variant === 'footer') {
    return (
      <a
        {...commonProps}
        className={`hover:text-accent transition-colors duration-180 ${className}`}
        aria-label={t.footer.supportAria}
      >
        {t.footer.supportBtn}
      </a>
    );
  }

  // variant === 'inline'
  return (
    <a
      {...commonProps}
      className={`inline-flex items-center gap-2 px-4 py-2 text-[12px] font-mono
        text-text border border-accent/30 hover:border-accent/60 hover:bg-accent/5
        transition-all duration-200 ${className}`}
      aria-label={t.footer.supportAria}
    >
      <Heart size={13} className="text-danger/70" />
      {t.footer.supportInline}
    </a>
  );
}
