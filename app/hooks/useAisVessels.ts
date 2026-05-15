'use client';

import { useState, useEffect } from 'react';

export type AisVessel = {
  mmsi: number;
  lat: number;
  lon: number;
  type: string;
  heading: number | null;
};

type AisResponse = { running: boolean; vessels: AisVessel[] };

const POLL_INTERVAL_MS = 15_000;
const FETCH_TIMEOUT_MS = 10_000;

export function useAisVessels(): AisVessel[] {
  const [vessels, setVessels] = useState<AisVessel[]>([]);

  useEffect(() => {
    let abortController: AbortController | null = null;

    const load = async () => {
      abortController?.abort();
      abortController = new AbortController();
      try {
        const signal = AbortSignal.any
          ? AbortSignal.any([abortController.signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)])
          : abortController.signal;
        const r = await fetch('/api/vessels', { cache: 'no-store', signal });
        if (!r.ok) return;
        const j = (await r.json()) as AisResponse;
        if (j.running && j.vessels?.length > 0) setVessels(j.vessels);
      } catch (err) {
        // Retain last known state — AIS is non-critical, but log so failures
        // are visible in the browser console and any attached error tracker.
        console.warn('[useAisVessels] fetch failed:', err);
      }
    };

    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      clearInterval(id);
      abortController?.abort();
    };
  }, []);

  return vessels;
}
