import { useEffect, useMemo, useState } from 'react';
import { timingReferences } from '../domain/nature';
import { natureResults, type NatureResult } from '../domain/natureTiming';
import type { Discovery } from '../domain/discoveries';
import type { Trail, Trip } from '../domain/types';
export function useNatureTiming(items: Discovery[], saved: Trail[], trips: Trip[], active: Trip | null) {
  const references = useMemo(() => timingReferences(items, saved), [items, saved]);
  const [live, setLive] = useState(active);
  // Clock updates never restart geometric analysis. Coalesce active GPS fixes.
  useEffect(() => { const timer = setTimeout(() => setLive(active), 1000); return () => clearTimeout(timer); }, [active]);
  const [results, setResults] = useState<NatureResult[]>([]), [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false; setPending(true); setError(null);
    const all = live && !trips.some(t => t.id === live.id) ? [...trips, live] : trips;
    void natureResults(references, all, () => cancelled).then(value => { if (value && !cancelled) { setResults(value); setPending(false); } }).catch(e => { if (!cancelled) { setError(String(e)); setPending(false); } });
    return () => { cancelled = true; };
  }, [references, trips, live]);
  return { results, pending, error };
}
