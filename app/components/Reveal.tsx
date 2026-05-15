'use client';

import { useEffect, useRef } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  dir?: 'up' | 'left' | 'right';
  delay?: number;
}

export default function Reveal({ children, className = '', style, dir = 'up', delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          obs.unobserve(el);
        }
      },
      { threshold: 0.07, rootMargin: '0px 0px -28px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const base = dir === 'left' ? 'reveal-left' : dir === 'right' ? 'reveal-right' : 'reveal';

  return (
    <div
      ref={ref}
      className={`${base} ${className}`}
      style={delay ? { ...style, '--reveal-delay': `${delay}ms` } as React.CSSProperties : style}
    >
      {children}
    </div>
  );
}
