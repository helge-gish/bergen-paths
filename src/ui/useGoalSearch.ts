import { useEffect, useRef, useState } from 'react';
import { goalRequest } from '../services/goalRequest';
export function useGoalSearch() {
  const current = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState<'nearby' | 'bergen' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancel = () => { const controller = current.current; current.current = null; controller?.abort(); setLoading(null); };
  useEffect(() => () => { current.current?.abort(); current.current = null; }, []);
  async function run<T>(kind: 'nearby' | 'bergen', work: (signal: AbortSignal) => Promise<T>, commit: (result: T) => void) {
    if (current.current) return;
    const controller = new AbortController(); current.current = controller;
    setError(null); setLoading(kind);
    try {
      const result = await goalRequest(controller, work);
      if (current.current === controller && !controller.signal.aborted) commit(result);
    } catch (e) {
      if (current.current === controller) setError(e instanceof Error ? e.message : 'Kunne ikke hente mål. Prøv igjen.');
    } finally {
      if (current.current === controller) { current.current = null; setLoading(null); }
    }
  }
  return { loading, error, run, cancel };
}
