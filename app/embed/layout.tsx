import { ReactNode } from 'react';

// The embed layout strips the standard Header and Footer
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-text p-2 md:p-4 overflow-hidden">
      {children}
    </div>
  );
}
