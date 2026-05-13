'use client';
export default function ScrollIndicator() {
  return (
    <div className="flex flex-col items-center gap-1.5 animate-bounce-slow" aria-hidden>
      <span className="text-[9px] font-mono tracking-[0.22em] text-text3 uppercase">Scroll</span>
      <svg width="16" height="24" viewBox="0 0 16 24" fill="none" className="text-text3">
        <rect x="6" y="1" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="4" r="1.5" fill="currentColor" className="animate-scroll-dot" />
        <path d="M4 16 L8 20 L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
