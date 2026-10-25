import type { Store } from '../data/store';
import { namedNature, trailActivity, timingReferences, type TrailPersonalization } from '../domain/trailActivity';
import { tourResult } from '../domain/tourMedals';
import type { Discovery } from '../domain/discoveries';

const jobs = new WeakMap<Store, Promise<void>>();
/** Complete missing awards after a finish or interrupted finalization. Existing
 * results are immutable: later map downloads, names and records cannot demote them. */
export function finalizeTourMedals(store: Store): Promise<void> {
  const running = jobs.get(store); if (running) return running;
  const job = (async () => {
    const history = store.tourResults();
    const ids = new Set(history.map(h => h.tripId));
    const missing = store.trips().filter(t => !ids.has(t.id)).sort((a, b) => a.endedAt! - b.endedAt! || a.id.localeCompare(b.id));
    if (!missing.length) return;
    const items = namedNature(store.setting<Discovery[]>('natureDiscoveries', []), store.setting<TrailPersonalization>('trailPersonalization', {}));
    const refs = timingReferences(items, store.trails());
    // Process only unfinalized tours; the matcher yields between geometry work.
    for (const trip of missing) {
      const report = await trailActivity(refs, [trip], null, trip.endedAt!);
      if (!report) throw new Error('Kunne ikke beregne turmedaljene.');
      const result = tourResult(trip, report.log, history);
      if (result && store.saveTourResult(result)) history.push(result);
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
  })().finally(() => jobs.delete(store));
  jobs.set(store, job); return job;
}
