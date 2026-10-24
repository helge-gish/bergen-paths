import { cleanPoints, coordinateBounds, distance, validFix } from './geo';
import { stretchRuns, type StretchResult, type StretchRun } from './stretchRuns';
import type { TimingReference } from './nature';
import type { Fix, Trip } from './types';
export type NatureResult = StretchResult & { source: TimingReference['source']; direction: TimingReference['direction']; itemId: string };
/** Break at every bad/fast fix; filtering then connecting the survivors would
 * silently turn a GPS gap or car ride into a valid timed completion. */
export function walkingParts(trip: Trip): Trip[] {
  const parts: Fix[][] = []; let part: Fix[] = [];
  const end = () => { if (part.length > 1) parts.push(part); part = []; };
  for (const point of [...trip.points].sort((a, b) => a.timestamp - b.timestamp)) {
    if (point.timestamp < trip.startedAt || point.timestamp > (trip.endedAt ?? Date.now()) || !validFix(point) || point.accuracy > 15 || (point.speed !== null && (!Number.isFinite(point.speed) || point.speed > 6))) { end(); continue; }
    const prev = part.at(-1);
    if (prev && (point.timestamp - prev.timestamp > 30000 || point.timestamp <= prev.timestamp || distance(prev, point) / ((point.timestamp - prev.timestamp) / 1000) > 6)) end();
    part.push(point);
  }
  end();
  return parts.map((points, index) => ({ ...trip, id: `${trip.id}:part:${index}`, points, startedAt: points[0].timestamp, endedAt: points.at(-1)!.timestamp }));
}
const cache = new WeakMap<Fix[], WeakMap<TimingReference, StretchRun[]>>();
function measured(trip: Trip, reference: TimingReference): StretchRun[] {
  const cached = cache.get(trip.points) ?? new WeakMap<TimingReference, StretchRun[]>(); cache.set(trip.points, cached);
  const old = cached.get(reference); if (old) return old;
  const bounds = coordinateBounds(trip.points), ref = coordinateBounds(reference.points);
  if (!bounds || !ref || bounds[2] < ref[0] - .001 || bounds[0] > ref[2] + .001 || bounds[3] < ref[1] - .0005 || bounds[1] > ref[3] + .0005) { cached.set(reference, []); return []; }
  const runs = walkingParts(trip).flatMap(part => stretchRuns(part, reference));
  cached.set(reference, runs); return runs;
}
export async function natureResults(references: TimingReference[], trips: Trip[], cancelled = () => false): Promise<NatureResult[] | null> {
  const results: NatureResult[] = []; let budget = Date.now() + 8;
  for (const ref of references) {
    const runs: StretchRun[] = [];
    for (const trip of trips) {
      runs.push(...measured(trip, ref));
      if (Date.now() >= budget) { await new Promise<void>(resolve => setTimeout(resolve, 0)); if (cancelled()) return null; budget = Date.now() + 8; }
    }
    runs.sort((a, b) => a.startedAt - b.startedAt);
    let previous: number | null = null, best: number | null = null;
    for (const run of runs) {
      results.push({ ...run, name: ref.name, source: ref.source, direction: ref.direction, itemId: ref.itemId, previousSeconds: previous, bestSeconds: best, ghostSeconds: null });
      previous = run.seconds; best = best === null ? run.seconds : Math.min(best, run.seconds);
    }
    if (Date.now() >= budget) { await new Promise<void>(resolve => setTimeout(resolve, 0)); if (cancelled()) return null; budget = Date.now() + 8; }
  }
  return cancelled() ? null : results.sort((a, b) => b.endedAt - a.endedAt);
}
export function movementTime(trip: Trip): number {
  const points = cleanPoints(trip.points); let ms = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dt = b.timestamp - a.timestamp, meters = distance(a, b);
    if (dt <= 15000 && meters >= Math.max(2, (a.accuracy + b.accuracy) / 4) && meters / dt * 1000 <= 6) ms += dt;
  }
  return ms;
}
