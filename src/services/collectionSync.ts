import type { Store } from '../data/store';
import type { Discovery } from '../domain/discoveries';
import type { Coordinate } from '../domain/types';
import { mergeDiscoveries, tripTiles } from '../domain/areas';
import { fetchDiscoveries, fetchStreets, streetRegion, type StreetRegion } from './osm';

type Cache = { points: Record<string, number>; regions: Record<string, StreetRegion>; streets: Record<string, number>; retryAfter?: Record<string, number> };
const emptyCache = (): Cache => ({ points: {}, regions: {}, streets: {} });
const WEEK = 7 * 24 * 3600_000;
export const syncDependencies = { fetchDiscoveries, fetchStreets, streetRegion };
export function mergeIntoStore(store: Store, items: Discovery[]) {
  store.setSetting('osmDiscoveries', mergeDiscoveries(store.setting<Discovery[]>('osmDiscoveries', []), items));
}
export function pendingSurveys(store: Store, now = Date.now()) {
  const cache = store.setting<Cache>('surveyCache', emptyCache());
  return tripTiles(store.trips()).filter(tile => !cache.points[tile.id] || now - cache.points[tile.id] > WEEK || !cache.regions[tile.id] || !cache.streets[cache.regions[tile.id].id] || now - cache.streets[cache.regions[tile.id].id] > WEEK);
}
let running: Promise<void> | null = null;
/** Serialized, resumable batches. GPS recording never waits for this job. */
export async function syncCollections(store: Store, deps = syncDependencies) {
  if (running) return running;
  running = (async () => {
    const now = Date.now(), cache = store.setting<Cache>('surveyCache', emptyCache());
    const pending = pendingSurveys(store, now).filter(t => (cache.retryAfter?.[t.id] ?? 0) <= now).slice(0, 4);
    if (!pending.length) return;
    let error: string | null = null;
    for (const tile of pending) {
      // Separate checkpoints let point discoveries succeed when street boundaries are missing.
      try {
        if (!cache.points[tile.id] || now - cache.points[tile.id] > WEEK) {
          mergeIntoStore(store, await deps.fetchDiscoveries(tile));
          cache.points[tile.id] = now;
          store.setSetting('surveyCache', cache);
        }
        const region = cache.regions[tile.id] ?? await deps.streetRegion(tile);
        cache.regions[tile.id] = region;
        if (!cache.streets[region.id] || now - cache.streets[region.id] > WEEK) {
          mergeIntoStore(store, await deps.fetchStreets(region));
          cache.streets[region.id] = now;
        }
        store.setSetting('surveyCache', cache);
      } catch (e) { error = e instanceof Error ? e.message : String(e); cache.retryAfter = { ...cache.retryAfter, [tile.id]: now + 300000 }; store.setSetting('surveyCache', cache); }
    }
    store.setSetting('collectionSyncError', error);
  })().finally(() => { running = null; });
  return running;
}
export async function loadArea(store: Store, center: Coordinate, radius: number) {
  const points = await fetchDiscoveries(center, radius);
  mergeIntoStore(store, points);
  try {
    const region = await streetRegion(center);
    const cache = store.setting<Cache>('surveyCache', emptyCache());
    if (!cache.streets[region.id] || Date.now() - cache.streets[region.id] > WEEK) {
      mergeIntoStore(store, await fetchStreets(region));
      // Read latest cache after network I/O to preserve another completed tile's checkpoints.
    const latest = store.setting<Cache>('surveyCache', emptyCache()); latest.streets[region.id] = Date.now(); store.setSetting('surveyCache', latest);
    }
    return null;
  } catch (e) { return e instanceof Error ? e.message : String(e); }
}
