import { cleanPoints, distance, MAX_GAP_MS, project } from './geo';
import type { Fix, Trip } from './types';
export type RouteMatch = {
  state: 'same' | 'uncertain' | 'off-route' | 'rejoined';
  label: string;
  deviated: boolean;
  newSegments: { startedAt: number; endedAt: number | null }[];
};
function sampled(points: Fix[], interval: number) {
  const output: Fix[] = [];
  for (const p of points) if (!output.length || p.timestamp - output.at(-1)!.timestamp >= interval) output.push(p);
  if (points.length && output.at(-1) !== points.at(-1)) output.push(points.at(-1)!);
  return output;
}
export function matchRoute(current: Trip, reference: Trip, now = Date.now()): RouteMatch {
  const live = sampled(cleanPoints(current.points), 10_000), ref = sampled(cleanPoints(reference.points), 5_000);
  const result: RouteMatch = { state: 'uncertain', label: 'Venter på et tydelig GPS-spor', deviated: false, newSegments: [] };
  if (live.length < 2 || ref.length < 2 || distance(live[0], ref[0]) > 60) return result;
  const path: { a: Fix; b: Fix; length: number; along: number }[] = [];
  let along = 0;
  for (let i = 1; i < ref.length; i++) {
    const length = distance(ref[i - 1], ref[i]);
    if (ref[i].timestamp - ref[i - 1].timestamp <= MAX_GAP_MS && length > 1) path.push({ a: ref[i - 1], b: ref[i], length, along });
    along += length;
  }
  const grid = new Map<string, typeof path>();
  for (const edge of path) {
    // Nearby cells avoid rescanning an entire multi-hour reference for each fix.
    const x0 = Math.floor(Math.min(edge.a.longitude, edge.b.longitude) / 0.002), x1 = Math.floor(Math.max(edge.a.longitude, edge.b.longitude) / 0.002);
    const y0 = Math.floor(Math.min(edge.a.latitude, edge.b.latitude) / 0.001), y1 = Math.floor(Math.max(edge.a.latitude, edge.b.latitude) / 0.001);
    if (x1 - x0 > 30 || y1 - y0 > 30) continue;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      const key = `${x}:${y}`, edges = grid.get(key) ?? []; edges.push(edge); grid.set(key, edges);
    }
  }
  let progress = 0, badSince: number | null = null, badCount = 0, off = false;
  let previous = live[0];
  for (const p of live) {
    const step = distance(previous, p);
    const continuity = p.timestamp - previous.timestamp <= MAX_GAP_MS;
    let best: { error: number; progress: number; score: number } | null = null;
    const x = Math.floor(p.longitude / 0.002), y = Math.floor(p.latitude / 0.001);
    const local = new Set<typeof path[number]>();
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const edge of grid.get(`${x + dx}:${y + dy}`) ?? []) local.add(edge);
    for (const edge of local) {
      const projected = project(p, edge.a, edge.b), next = edge.along + projected.fraction * edge.length;
      const penalty = off ? 0 : Math.abs(next - progress - step) * 0.15;
      const candidate = { error: projected.distance, progress: next, score: projected.distance + penalty };
      if (!best || candidate.score < best.score) best = candidate;
    }
    const same = best && best.error <= 30 && (off || (best.progress >= progress - 25 && best.progress - progress <= Math.max(75, step * 3)));
    if (!continuity) {
      // A missing interval could hide a shortcut. Keep whole-trip comparisons disabled.
      result.deviated = true;
      result.state = 'uncertain';
      result.label = 'GPS-opphold – ruten kan ikke bekreftes hele veien';
      badSince = null; badCount = 0;
    } else if (same && best) {
      if (off) result.newSegments.at(-1)!.endedAt = p.timestamp;
      off = false; badSince = null; badCount = 0; progress = best.progress;
      result.state = result.deviated ? 'rejoined' : 'same';
      result.label = result.deviated ? 'Tilbake på sporet · turen er endret' : 'På samme rute';
    } else {
      result.state = off ? 'off-route' : 'uncertain';
      result.label = off ? 'Du utforsker et nytt sporparti' : 'Sjekker om du følger samme rute';
      if (!best || best.error > 40 || best.progress < progress - 25 || best.progress - progress > Math.max(75, step * 3)) {
        badSince ??= p.timestamp;
        badCount++;
        if (!off && badCount >= 3 && p.timestamp - badSince >= 20_000) {
          off = true; result.deviated = true; result.state = 'off-route'; result.label = 'Du utforsker et nytt sporparti';
          result.newSegments.push({ startedAt: badSince, endedAt: null });
        }
      } else { badSince = null; badCount = 0; }
    }
    previous = p;
  }
  if (current.endedAt === null && now - live.at(-1)!.timestamp > 20_000) {
    result.state = 'uncertain'; result.label = 'Venter på en fersk GPS-posisjon';
  }
  return result;
}
