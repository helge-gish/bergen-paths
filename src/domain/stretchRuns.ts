import { cleanPoints, distance, project } from './geo';
import type { Fix, Trail, Trip } from './types';

export type StretchRun = { trailId: string; startedAt: number; endedAt: number; seconds: number };
export type StretchResult = StretchRun & { name: string; previousSeconds: number | null; bestSeconds: number | null; ghostSeconds: number | null };
/** Directional, continuous traversal. Small timing gates inside both ends make
 * GPS timing comparable without requiring walkers to overshoot an intersection. */
export function stretchRuns(trip: Trip, trail: Trail): StretchRun[] {
  const ref = cleanPoints(trail.points), live = cleanPoints(trip.id === trail.tripId ? trail.points : trip.points);
  if (ref.length < 2 || live.length < 2) return [];
  if (!live.some(p => distance(p, ref[0]) <= 35)) return [];
  const edges: { a: Fix; b: Fix; along: number; length: number }[] = [];
  let length = 0;
  for (let i = 1; i < ref.length; i++) {
    if (ref[i].timestamp - ref[i - 1].timestamp > 30_000) return [];
    const n = distance(ref[i - 1], ref[i]);
    if (n > .2) edges.push({ a: ref[i - 1], b: ref[i], along: length, length: n });
    length += n;
  }
  if (length < 15) return [];
  const gate = Math.min(8, length * .1), finish = length - gate;
  const runs: StretchRun[] = [];
  let previous: { along: number; point: Fix } | null = null, startedAt: number | null = null;
  let missingSince: number | null = null;
  for (const point of live) {
    if (previous && point.timestamp - previous.point.timestamp > 30_000) { previous = null; startedAt = null; }
    const step = previous ? distance(previous.point, point) : 0;
    let best: { along: number; error: number; score: number } | null = null;
    for (const edge of edges) {
      const p = project(point, edge.a, edge.b), along = edge.along + p.fraction * edge.length;
      if (!previous && along > gate) continue;
      const penalty: number = previous ? Math.abs(along - previous.along - step) * .35 : along * .1;
      const candidate: { along: number; error: number; score: number } = { along, error: p.distance, score: p.distance + penalty };
      if (!best || candidate.score < best.score) best = candidate;
    }
    if (!best || best.error > 25 || (previous && (best.along < previous.along - 15 || best.along - previous.along > Math.max(35, step * 2.5)))) {
      missingSince ??= point.timestamp;
      if (point.timestamp - missingSince >= 15_000) { previous = null; startedAt = null; }
      continue;
    }
    missingSince = null;
    if (best.along <= gate) startedAt = null;
    if (previous) {
      const crossing = (target: number) => previous!.point.timestamp + (target - previous!.along) / (best!.along - previous!.along) * (point.timestamp - previous!.point.timestamp);
      if (startedAt === null && previous.along <= gate && best.along > gate && best.error <= 12) startedAt = crossing(gate);
      if (startedAt !== null && previous.along < finish && best.along >= finish) {
        const endedAt = crossing(finish);
        if (endedAt > startedAt) runs.push({ trailId: trail.id, startedAt, endedAt, seconds: (endedAt - startedAt) / 1000 });
        previous = null; startedAt = null; continue;
      }
    }
    previous = { along: best.along, point };
  }
  return runs;
}

// Finished tracks are immutable; keep repeated live/background reads inexpensive.
const cache = new WeakMap<Trip, Map<string, { points: Fix[]; runs: StretchRun[] }>>();
function cachedRuns(trip: Trip, trail: Trail) {
  const entries = cache.get(trip) ?? new Map<string, { points: Fix[]; runs: StretchRun[] }>(); cache.set(trip, entries);
  const old = entries.get(trail.id);
  if (old?.points === trail.points) return old.runs;
  const runs = stretchRuns(trip, trail); entries.set(trail.id, { points: trail.points, runs }); return runs;
}
export function stretchResults(trip: Trip, trails: Trail[], history: Trip[], ghost: Trip | null = null): StretchResult[] {
  return trails.flatMap(trail => {
    // Later-created stretches do not rewrite trips that predate their source walk.
    const source = history.find(t => t.id === trail.tripId);
    if (source && trip.startedAt < source.startedAt) return [];
    const previous = history.filter(t => t.id !== trip.id && t.endedAt !== null && t.endedAt <= trip.startedAt).flatMap(t => cachedRuns(t, trail)).sort((a, b) => a.endedAt - b.endedAt);
    const ghostRun = ghost ? cachedRuns(ghost, trail)[0] : null;
    return cachedRuns(trip, trail).map(run => {
      const result = { ...run, name: trail.name,
      previousSeconds: previous.at(-1)?.seconds ?? null,
      bestSeconds: previous.length ? Math.min(...previous.map(r => r.seconds)) : null,
      ghostSeconds: ghostRun?.seconds ?? null,
      };
      previous.push(run);
      return result;
    });
  }).sort((a, b) => a.endedAt - b.endedAt);
}
export function stretchDelta(seconds: number, baseline: number) {
  const gap = Math.round(baseline - seconds);
  return Math.abs(gap) < 5 ? 'omtrent lik tid' : `${Math.abs(gap)} sek ${gap > 0 ? 'raskere' : 'saktere'}`;
}
