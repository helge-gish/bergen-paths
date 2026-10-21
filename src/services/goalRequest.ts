/** Bound the entire user operation, including native GPS/geocoding and a fetch
 * implementation that ignores abort. Callers commit results only on success. */
export async function goalRequest<T>(controller: AbortController, work: (signal: AbortSignal) => Promise<T>, timeoutMs = 30000): Promise<T> {
  const { signal } = controller;
  let timeoutError: Error | null = null;
  let rejectAbort!: (reason: unknown) => void;
  const stopped = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const onAbort = () => rejectAbort(timeoutError ?? signal.reason ?? Object.assign(new Error('Avbrutt'), { name: 'AbortError' }));
  signal.addEventListener('abort', onAbort, { once: true });
  // React Native's abort-controller polyfill does not implement signal.reason.
  const timer = setTimeout(() => {
    timeoutError = new Error('Målsøket tok for lang tid. Prøv igjen når du har nett. Lagrede mål er beholdt.');
    controller.abort();
  }, timeoutMs);
  try {
    if (signal.aborted) { onAbort(); return await stopped; }
    return await Promise.race([work(signal), stopped]);
  } finally { clearTimeout(timer); signal.removeEventListener('abort', onAbort); }
}
