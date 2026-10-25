import { useEffect, useState } from 'react';
import { getStore } from '../data/native';
import { finalizeTourMedals } from '../services/tourMedals';
import type { TourResult } from '../domain/tourMedals';
import type { Trip } from '../domain/types';

export function useTourMedals(trips: Trip[]) {
  const [results, setResults] = useState<TourResult[]>(() => getStore().tourResults());
  const [pending, setPending] = useState(false), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false; setPending(true); setError(false);
    const store = getStore();
    // A previous job may have captured the history just before this tour ended.
    void finalizeTourMedals(store).then(() => finalizeTourMedals(store)).then(() => {
      if (!cancelled) { setResults(store.tourResults()); setPending(false); }
    }).catch(() => { if (!cancelled) { setError(true); setPending(false); } });
    return () => { cancelled = true; };
  }, [trips, retry]);
  return { results, pending, error, retry: () => setRetry(n => n + 1) };
}
