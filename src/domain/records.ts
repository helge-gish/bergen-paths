import { cleanPoints, distance } from './geo';
import type { StretchResult } from './stretchRuns';
import type { Coordinate, Trip } from './types';

export type RecordMedal = { id: string; kind: 'stretch' | 'route'; name: string; seconds: number; previousSeconds: number };
const elapsed = (t: Trip) => (t.endedAt! - t.startedAt) / 1000;
const cache = new WeakMap<Trip, WeakMap<Trip, boolean>>();
function path(points: Coordinate[]) {
  const samples: Coordinate[] = [points[0]];
  let length = 0, next = 8;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], n = distance(a, b);
    while (n > 0 && next <= length + n) {
      const f = (next - length) / n;
      samples.push({ latitude: a.latitude + f * (b.latitude - a.latitude), longitude: a.longitude + f * (b.longitude - a.longitude) });
      next += 8;
    }
    length += n;
  }
  samples.push(points.at(-1)!);
  return { samples, length };
}
/** Discrete Frechet reachability: every part of both routes must be covered in
 * the same order. Unlike the live matcher, this can resolve overlapping passes
 * using the entire finished route. Spatial cells avoid an all-pairs scan. */
function followInOrder(a: Coordinate[], b: Coordinate[]) {
  const grid = new Map<string, number[]>();
  // Scale local longitude cells to stay conservative at high latitudes.
  const scale = Math.max(.001, Math.cos(a[0].latitude * Math.PI / 180));
  const cell = (p: Coordinate) => [Math.floor(p.longitude * scale / .0003), Math.floor(p.latitude / .0003)];
  b.forEach((p, i) => { const key = cell(p).join(':'); const indices = grid.get(key) ?? []; indices.push(i); grid.set(key, indices); });
  let previous = new Set<number>();
  for (let i = 0; i < a.length; i++) {
    const [x, y] = cell(a[i]), candidates: number[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) candidates.push(...(grid.get(`${x + dx}:${y + dy}`) ?? []));
    candidates.sort((x, y) => x - y);
    const current = new Set<number>();
    for (const j of candidates) {
      if (!(i === 0 && j === 0) && !previous.has(j) && !previous.has(j - 1) && !current.has(j - 1)) continue;
      if (distance(a[i], b[j]) <= 25) current.add(j);
    }
    if (!current.size) return false;
    previous = current;
  }
  return previous.has(b.length - 1);
}
/** Both complete tracks must follow each other in order, including the finish.
 * A live "same route" status alone does not prove a completed comparable walk. */
export function sameCompletedRoute(a: Trip, b: Trip): boolean {
  if (a.endedAt === null || b.endedAt === null) return false;
  const cached = cache.get(a)?.get(b);
  if (cached !== undefined) return cached;
  const check = () => {
    const ap = cleanPoints(a.points), bp = cleanPoints(b.points);
    for (const [trip, points] of [[a, ap], [b, bp]] as const) {
      if (points.length < 3 || elapsed(trip) <= 0) return false;
      if (points[0].timestamp - trip.startedAt > 30000 || trip.endedAt! - points.at(-1)!.timestamp > 30000) return false;
      if (points.some((p, i) => i > 0 && p.timestamp - points[i - 1].timestamp > 30000)) return false;
    }
    if (distance(ap[0], bp[0]) > 25 || distance(ap.at(-1)!, bp.at(-1)!) > 25) return false;
    const pa = path(ap), pb = path(bp), ratio = pa.length / pb.length;
    return Math.min(pa.length, pb.length) >= 100 && ratio >= .9 && ratio <= 1 / .9 && followInOrder(pa.samples, pb.samples);
  };
  const result = check();
  const pairs = cache.get(a) ?? new WeakMap<Trip, boolean>(); pairs.set(b, result); cache.set(a, pairs);
  return result;
}

export function routeRecord(trip: Trip, history: Trip[]): RecordMedal | null {
  if (trip.endedAt === null) return null;
  const earlier = history.filter(t => t.id !== trip.id && t.endedAt !== null && t.endedAt <= trip.startedAt && sameCompletedRoute(trip, t));
  if (!earlier.length) return null;
  const best = earlier.reduce((a, b) => elapsed(a) <= elapsed(b) ? a : b);
  const seconds = elapsed(trip), previousSeconds = elapsed(best);
  return previousSeconds - seconds >= 5 ? { id: `route:${trip.id}`, kind: 'route', name: best.name, seconds, previousSeconds } : null;
}

export function recordMedals(trip: Trip, stretches: StretchResult[], history: Trip[]): RecordMedal[] {
  if (trip.endedAt === null) return [];
  // One medal per stretch on this walk; show the fastest record-breaking lap.
  const medals = new Map<string, RecordMedal>();
  for (const run of stretches) {
    if (run.bestSeconds === null || run.bestSeconds - run.seconds < 5) continue;
    const id = `stretch:${run.trailId}`, old = medals.get(id);
    if (!old || run.seconds < old.seconds) medals.set(id, { id, kind: 'stretch', name: run.name, seconds: run.seconds, previousSeconds: old?.previousSeconds ?? run.bestSeconds });
  }
  const full = routeRecord(trip, history);
  return [...(full ? [full] : []), ...medals.values()];
}
