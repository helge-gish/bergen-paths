import { useEffect, useState } from 'react';
import { collectionProgressAsync, type Discovery, type Progress } from '../domain/discoveries';
import type { Trip } from '../domain/types';

type Results = Record<string, Progress>;
type State = { items: Discovery[]; trips: Trip[]; progress: Results; processed: number; pending: boolean; error: string | null };
const completed = new WeakMap<Discovery[], WeakMap<Trip[], Results>>();

/** Retain visible results while checking; unchanged inputs reuse completed work. */
export function useCollectionProgress(items: Discovery[], trips: Trip[], saved?: Results) {
  const [state, setState] = useState<State | null>(null);
  const [attempt, setAttempt] = useState(0);
  const cached = completed.get(items)?.get(trips);
  const same = state?.items === items && state.trips === trips;
  // Never retain stamps from a deleted/changed track while rebuilding evidence.
  const retainsHistory = state?.trips.every(t => trips.includes(t));
  const previous = retainsHistory ? state?.progress : undefined;
  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    setState({ items, trips, progress: previous ?? saved ?? {}, processed: 0, pending: true, error: null });
    void collectionProgressAsync(items, trips, () => cancelled, update => {
      setState(old => ({ items, trips, progress: { ...(old?.progress ?? {}), ...update.progress }, processed: update.processed, pending: true, error: null }));
    }).then(progress => {
      if (!progress || cancelled) return;
      const cache = completed.get(items) ?? new WeakMap<Trip[], Results>();
      cache.set(trips, progress); completed.set(items, cache);
      setState({ items, trips, progress, processed: items.length, pending: false, error: null });
    }).catch(error => {
      if (!cancelled) setState(old => ({ items, trips, progress: old?.progress ?? previous ?? saved ?? {}, processed: old?.processed ?? 0, pending: false, error: error instanceof Error ? error.message : String(error) }));
    });
    return () => { cancelled = true; };
    // saved/previous are display fallbacks; their updates must not restart work.
  }, [items, trips, attempt, cached]);
  return {
    progress: cached ?? (same ? state.progress : previous ?? saved ?? {}),
    pending: cached ? false : same ? state.pending : true,
    processed: cached ? items.length : same ? state.processed : 0,
    total: items.length,
    error: same ? state.error : null,
    retry: () => setAttempt(n => n + 1),
  };
}
