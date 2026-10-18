import { useEffect, useState } from 'react';
import { collectionProgressAsync, type Discovery, type Progress } from '../domain/discoveries';
import type { Trip } from '../domain/types';

/** Never calculate a whole city's collection during rendering or startup. */
export function useCollectionProgress(items: Discovery[], trips: Trip[]) {
  const [result, setResult] = useState<{ items: Discovery[]; trips: Trip[]; progress: Record<string, Progress> } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void collectionProgressAsync(items, trips, () => cancelled).then(progress => {
      if (progress && !cancelled) setResult({ items, trips, progress });
    });
    return () => { cancelled = true; };
  }, [items, trips]);
  return result?.items === items && result.trips === trips ? result.progress : null;
}
