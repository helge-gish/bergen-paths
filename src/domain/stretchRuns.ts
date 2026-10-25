import { cleanPoints, distance, project } from './geo';
import type { Fix, Trail, Trip } from './types';

export type StretchRun = { trailId: string; startedAt: number; endedAt: number; seconds: number };
export type StretchResult = StretchRun & { name: string; previousSeconds: number | null; bestSeconds: number | null; ghostSeconds: number | null };
/** Directional, continuous traversal. Small timing gates inside both ends make
 * GPS timing comparable without requiring walkers to overshoot an intersection. */
export type StretchAnalysis = { runs: StretchRun[]; starts: number[]; active: { startedAt: number; fraction: number; timestamp: number } | null };
export function analyzeStretch(trip: Trip, trail: Trail): StretchAnalysis {
  const empty: StretchAnalysis = { runs: [], starts: [], active: null };
  const ref = cleanPoints(trail.points), live = cleanPoints(trip.id === trail.tripId ? trail.points : trip.points);
  if (ref.length < 2 || live.length < 2) return empty;
  if (!live.some(p => distance(p, ref[0]) <= 35)) return empty;
  const edges: { a: Fix; b: Fix; along: number; length: number; south: number; north: number; west: number; east: number }[] = [];
  let length = 0;
  for (let i = 1; i < ref.length; i++) {
    if (ref[i].timestamp - ref[i - 1].timestamp > 30_000) return empty;
    const n = distance(ref[i - 1], ref[i]);
    if (n > .2) edges.push({ a: ref[i - 1], b: ref[i], along: length, length: n,
      south: Math.min(ref[i - 1].latitude, ref[i].latitude), north: Math.max(ref[i - 1].latitude, ref[i].latitude),
      west: Math.min(ref[i - 1].longitude, ref[i].longitude), east: Math.max(ref[i - 1].longitude, ref[i].longitude) });
    length += n;
  }
  if (length < 15) return empty;
  const gate = Math.min(8, length * .1), finish = length - gate;
  const runs: StretchRun[] = [], starts: number[] = [];
  let previous: { along: number; point: Fix } | null = null, startedAt: number | null = null;
  let missingSince: number | null = null;
  const latitude = ref.reduce((n, p) => Math.max(n, Math.abs(p.latitude)), 0);
  let lastEdge = 0;
  const after = (along: number) => {
    let lo = 0, hi = edges.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (edges[mid].along <= along) lo = mid + 1; else hi = mid; }
    return lo;
  };
  for (const point of live) {
    if (previous && point.timestamp - previous.point.timestamp > 30_000) { previous = null; startedAt = null; }
    const step = previous ? distance(previous.point, point) : 0;
    const match = { best: null as { along: number; error: number; score: number } | null };
    const longitudeScale = Math.cos(Math.max(latitude, Math.abs(point.latitude)) * Math.PI / 180);
    const consider = (edge: typeof edges[number], index: number) => {
      if (!previous && edge.along > gate) return;
      // Conservative lower bounds reject distant edges before trigonometric
      // projection. Seed with the preceding match, then preserve the original
      // score and tie order over all edges (including loops and turnarounds).
      const dy = Math.max(0, edge.south - point.latitude, point.latitude - edge.north);
      const dx = Math.max(0, edge.west - point.longitude, point.longitude - edge.east);
      const unwrapped = Math.max(Math.abs(edge.west - point.longitude), Math.abs(edge.east - point.longitude)) <= 180;
      const spatial = Math.max(dy * 110000, unwrapped ? dx * 70000 * longitudeScale : 0);
      const target = previous ? previous.along + step : 0;
      const penaltyBound = previous ? Math.max(0, edge.along - target, target - edge.along - edge.length) * .35 : edge.along * .1;
      if (match.best && spatial + penaltyBound > match.best.score + 1e-9) return;
      const p = project(point, edge.a, edge.b), along = edge.along + p.fraction * edge.length;
      if (!previous && along > gate) return;
      const penalty: number = previous ? Math.abs(along - previous.along - step) * .35 : along * .1;
      const candidate: { along: number; error: number; score: number } = { along, error: p.distance, score: p.distance + penalty };
      if (!match.best || candidate.score < match.best.score || (candidate.score === match.best.score && index < lastEdge)) { match.best = candidate; lastEdge = index; }
    };
    if (edges[lastEdge]) consider(edges[lastEdge], lastEdge);
    // The along-distance penalty alone bounds which edges can beat the seed.
    // Binary search keeps long, densely sampled stretches out of an n² scan.
    const budget = match.best ? (match.best.score + 1e-9) / .35 : Infinity;
    const target = previous ? previous.along + step : 0;
    const from = previous ? Math.max(0, after(target - budget) - 1) : 0;
    const to = previous ? after(target + budget) : after(gate);
    for (let i = from; i < to; i++) consider(edges[i], i);
    const best = match.best;
    if (!best || best.error > 25 || (previous && (best.along < previous.along - 15 || best.along - previous.along > Math.max(35, step * 2.5)))) {
      missingSince ??= point.timestamp;
      if (point.timestamp - missingSince >= 15_000) { previous = null; startedAt = null; }
      continue;
    }
    missingSince = null;
    if (best.along <= gate) startedAt = null;
    if (previous) {
      const crossing = (target: number) => previous!.point.timestamp + (target - previous!.along) / (best!.along - previous!.along) * (point.timestamp - previous!.point.timestamp);
      if (startedAt === null && previous.along <= gate && best.along > gate && best.error <= 12) { startedAt = crossing(gate); starts.push(startedAt); }
      if (startedAt !== null && previous.along < finish && best.along >= finish) {
        const endedAt = crossing(finish);
        if (endedAt > startedAt) runs.push({ trailId: trail.id, startedAt, endedAt, seconds: (endedAt - startedAt) / 1000 });
        previous = null; startedAt = null; continue;
      }
    }
    previous = { along: best.along, point };
  }
  return { runs, starts, active: startedAt !== null && previous && missingSince === null ? { startedAt, fraction: Math.min(1, previous.along / length), timestamp: previous.point.timestamp } : null };
}
export function stretchRuns(trip: Trip, trail: Trail): StretchRun[] { return analyzeStretch(trip, trail).runs; }

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
