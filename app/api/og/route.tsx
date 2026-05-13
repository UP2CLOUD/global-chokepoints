// ============================================================
// /api/og — Dynamic Open Graph image (1200x630)
// Renders the live answer to "Is the Strait of Hormuz open?"
//   OPEN              → YES  (green)
//   CLOSED            → NO   (red)
//   PARTIALLY_CLOSED  → DISRUPTED (amber)
// ============================================================
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const revalidate = 300;

function answerFor(state: string): { word: string; color: string; sub: string } {
  const s = state.toUpperCase();
  if (s === 'OPEN') return { word: 'YES', color: '#10B981', sub: 'STRAIT OPEN' };
  if (s === 'PARTIALLY_CLOSED' || s === 'DISRUPTED')
    return { word: 'DISRUPTED', color: '#F59E0B', sub: 'TRAFFIC DISRUPTED' };
  return { word: 'NO', color: '#EF4444', sub: 'STRAIT CLOSED' };
}

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const state = (u.searchParams.get('state') || 'OPEN').toUpperCase();
  const brent = u.searchParams.get('brent') || '—';
  const tension = u.searchParams.get('tension') || '—';
  const updated = u.searchParams.get('asof') || new Date().toISOString();
  const { word, color, sub } = answerFor(state);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          background:
            'linear-gradient(135deg, #07090F 0%, #0B0F18 60%, #131826 100%)',
          color: '#E6ECF3',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 24,
            letterSpacing: 2,
            color: '#06B6D4',
            textTransform: 'uppercase',
          }}
        >
          <span>IsStraitHormuzOpen? · Real-time monitoring</span>
          <span style={{ color: '#6B7787', fontSize: 18 }}>
            {new Date(updated).toUTCString()}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 36,
              color: '#A9B4C2',
              marginBottom: 8,
              letterSpacing: 1,
            }}
          >
            Is the Strait of Hormuz closed?
          </div>
          <div
            style={{
              fontSize: 240,
              fontWeight: 900,
              letterSpacing: -8,
              color,
              lineHeight: 1,
            }}
          >
            {word}
          </div>
          <div
            style={{
              fontSize: 22,
              color: '#6B7787',
              marginTop: 8,
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            {sub}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 48,
            paddingTop: 24,
            borderTop: '1px solid #1E2533',
            fontSize: 28,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#6B7787', fontSize: 16, textTransform: 'uppercase', letterSpacing: 2 }}>
              Brent
            </span>
            <span style={{ color: '#E6ECF3' }}>${brent}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#6B7787', fontSize: 16, textTransform: 'uppercase', letterSpacing: 2 }}>
              Tension
            </span>
            <span style={{ color: '#E6ECF3' }}>{tension}/100</span>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#6B7787',
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 9999,
                background: color,
              }}
            />
            ishormuzstraitopen.workers.dev
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
