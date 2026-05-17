'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getBrentHistory } from '@/app/lib/mockData';
import { fetchBrent } from '@/app/lib/api';

export default function BrentChart() {
  // Empty initial state — avoids SSR/client hydration mismatch.
  // getBrentHistory() uses static seed data but we still defer to useEffect
  // to ensure identical server and client render on first paint.
  const [data, setData] = useState<{ date: string; price: number }[]>([]);
  const [down, setDown] = useState(false);

  useEffect(() => {
    let active = true;
    setData(getBrentHistory()); // seed immediately on client mount
    const load = async () => {
      const b = await fetchBrent();
      if (!active) return;
      if (b?.history?.length) { setData(b.history); setDown(false); }
      else setDown(true);
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const accent = '#C17F24';  // aircraft amber
  const grid   = '#2E2920';  // warm divider
  const text3  = '#8C7D68';  // warm text3

  return (
    <div className="w-full h-[200px] md:h-[240px] relative" role="img" aria-label="Brent crude price, last 7 trading days">
      {down && (
        <div className="absolute top-2 right-2 z-10 text-[10px] font-mono down px-2 py-0.5 rounded">
          stale
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="brentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={accent} stopOpacity={0.28} />
              <stop offset="100%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke={grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: text3, fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: text3, fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
          <Tooltip
            cursor={{ stroke: accent, strokeDasharray: '2 4', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-bg1/95 border border-divider rounded-md px-2.5 py-1.5 text-[11px] font-mono">
                    <div className="text-text3">{payload[0].payload.date}</div>
                    <div className="text-accent font-semibold">${Number(payload[0].value).toFixed(2)}</div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area type="monotone" dataKey="price" stroke={accent} strokeWidth={1.5} fill="url(#brentGrad)" activeDot={{ r: 3, fill: accent, stroke: '#07090F', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
