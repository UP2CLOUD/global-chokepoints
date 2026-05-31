'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: '#070B11', color: '#E6ECF3', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0, padding: '1rem' }}>
        <div style={{ maxWidth: 400 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#4DA3FF', marginBottom: 12 }}>System Error</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: '#EF4444', lineHeight: 1, marginBottom: 16 }}>ERROR</div>
          <p style={{ fontSize: 13, color: '#8A95A3', lineHeight: 1.6, marginBottom: 24 }}>
            An unexpected error occurred. The monitoring system remains active.
          </p>
          <button
            onClick={reset}
            style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', background: '#4DA3FF', color: '#070B11', border: 'none', padding: '8px 16px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
