import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg text-text font-mono flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-[9px] uppercase tracking-[0.22em] text-accent mb-3">404</div>
        <div className="text-[64px] font-black leading-none text-danger mb-4" style={{ fontFamily: 'var(--font-jetbrains)' }}>
          NOT FOUND
        </div>
        <p className="text-[13px] text-text3 leading-relaxed mb-8">
          This route does not exist. The strait is still being monitored.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="text-[10px] font-mono uppercase tracking-[0.14em] bg-accent text-bg px-4 py-2 hover:bg-accent-hi transition-colors">
            Live Status
          </Link>
          <Link href="/docs" className="text-[10px] font-mono uppercase tracking-[0.14em] border border-divider text-text3 px-4 py-2 hover:border-accent/50 hover:text-accent transition-colors">
            API Docs
          </Link>
        </div>
      </div>
    </div>
  );
}
