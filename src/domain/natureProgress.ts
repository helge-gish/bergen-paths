import { collectionProgressAsync, type Discovery, type Progress } from './discoveries';
import { walkingParts } from './natureTiming';
import type { Fix, Trip } from './types';
const walkingCache = new WeakMap<Fix[], Trip[]>();
function cachedWalkingParts(trip: Trip) {
  let parts = walkingCache.get(trip.points);
  if (!parts) { parts = walkingParts(trip); walkingCache.set(trip.points, parts); }
  return parts;
}
/** Accumulate walked coverage across visits. Only valid walking samples count;
 * partial visits stay visible but do not count as a completed trail. */
export async function natureProgress(items: Discovery[], trips: Trip[], active: Trip | null, cancelled = () => false): Promise<Record<string, Progress> | null> {
  const tracks = (active && !trips.some(t => t.id === active.id) ? [...trips, active] : trips).flatMap(cachedWalkingParts);
  const pieces = items.flatMap(item => (item.streetPaths ?? [item.geometry]).map((geometry, index) => ({ ...item, id: `${item.id}/path/${index}`, geometry })));
  const measured = await collectionProgressAsync(pieces, tracks, cancelled);
  if (cancelled() || !measured) return null;
  const progress: Record<string, Progress> = {};
  for (const item of items) {
    const parts = (item.streetPaths ?? [item.geometry]).map((_, index) => measured[`${item.id}/path/${index}`]);
    const dates = parts.flatMap(p => p?.firstVisit ? [p.firstVisit] : []);
    progress[item.id] = { fraction: parts.reduce((n, p) => n + (p?.fraction ?? 0), 0) / Math.max(1, parts.length), collected: parts.length > 0 && parts.every(p => p?.collected), firstVisit: dates.length ? Math.min(...dates) : null };
  }
  return progress;
}
