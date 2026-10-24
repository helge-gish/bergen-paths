import { useEffect, useState } from 'react';
import type { Discovery, Progress } from '../domain/discoveries';
import { natureProgress } from '../domain/natureProgress';
import type { Trip } from '../domain/types';
export function useNatureProgress(items: Discovery[], trips: Trip[], active: Trip | null, enabled = true) {
  const [result, setResult] = useState<{ items: Discovery[]; progress: Record<string, Progress> }>({ items: [], progress: {} });
  const [pending, setPending] = useState(true), [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false; setPending(true); setError(null);
    const timer = setTimeout(() => { void (async () => {
      const progress = await natureProgress(items, trips, active, () => cancelled);
      if (cancelled || !progress) return;
      setResult({ items, progress }); setPending(false);
    })().catch(e => { if (!cancelled) { setError(String(e)); setPending(false); } }); }, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [items, trips, active, enabled]);
  // A different area must not briefly inherit the previous area's counter.
  return { progress: result.items === items ? result.progress : {}, pending, error };
}
