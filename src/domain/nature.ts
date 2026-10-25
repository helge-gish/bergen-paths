import type { Discovery } from './discoveries';
import type { Coordinate, Fix, Trail } from './types';
import { distance } from './geo';
const hard = new Set(['asphalt', 'paved', 'concrete', 'concrete:plates', 'paving_stones', 'sett', 'cobblestone', 'metal', 'wood']);
const soft = new Set(['ground', 'dirt', 'earth', 'grass', 'sand', 'mud', 'rock', 'stone', 'gravel', 'fine_gravel', 'compacted', 'unpaved']);
/** Explicit hard surface wins over other hiking tags. Unknown urban footways
 * are never promoted to nature trails just because pedestrians use them. */
export function isNatureTrail(item: Discovery): boolean {
  if (item.kind !== 'trail' || !['path', 'footway'].includes(item.osmHighway ?? '') || item.geometry.length < 2) return false;
  const surface = item.surface?.toLowerCase().trim();
  if (surface && hard.has(surface)) return false;
  if (item.footway === 'sidewalk' || item.footway === 'crossing') return false;
  if (item.osmHighway === 'footway') return !!item.natureContext && !!surface && soft.has(surface);
  return (!!surface && soft.has(surface)) || !!item.sacScale || !!item.natureContext;
}
export function insideRing(point: Coordinate, ring: Coordinate[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.latitude > point.latitude) !== (b.latitude > point.latitude) && point.longitude < (b.longitude - a.longitude) * (point.latitude - a.latitude) / (b.latitude - a.latitude) + a.longitude) inside = !inside;
  }
  return inside;
}
export function geometryVersion(points: Coordinate[]) {
  let h = 2166136261;
  for (const p of points) for (const c of `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)};`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16);
}
// A synthetic walking reference describes geometry only; never claim its times
// or heights as a measured record. Densification respects the matcher's gap limit.
function referencePoints(path: Coordinate[]): Fix[] {
  const result: Fix[] = []; let traveled = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)], b = path[i], length = i ? distance(a, b) : 0;
    if (!Number.isFinite(length)) return [];
    const count = Math.max(1, Math.ceil(length / 20));
    if (result.length + count > 2000) return [];
    for (let j = 1; j <= count; j++) result.push({ latitude: a.latitude + (b.latitude - a.latitude) * j / count, longitude: a.longitude + (b.longitude - a.longitude) * j / count, timestamp: 1_000_000 + (traveled + length * j / count) * 1000, accuracy: 1, altitude: null, altitudeAccuracy: null, speed: null });
    traveled += length;
  }
  return traveled >= 30 ? result : [];
}
export type TimingReference = Trail & { source: 'nature' | 'personal'; direction: 'forward' | 'reverse'; itemId: string; validFrom?: number };
export function timingReferences(items: Discovery[], saved: Trail[]): TimingReference[] {
  const refs: TimingReference[] = [];
  const add = (id: string, name: string, path: Coordinate[], source: TimingReference['source'], itemId: string, tripId = '', createdAt = 0) => {
    for (const direction of ['forward', 'reverse'] as const) {
      const points = referencePoints(direction === 'forward' ? path : [...path].reverse());
      if (!points.length) continue;
      refs.push({ id: `${id}:${geometryVersion(path)}:${direction}`, name: `${name}${direction === 'reverse' ? ' · motsatt vei' : ''}`, points, tripId, createdAt, source, direction, itemId });
    }
  };
  for (const item of items.filter(isNatureTrail)) (item.streetPaths ?? [item.geometry]).forEach((path, i) => add(`nature:${item.id}:${i}`, item.name, path, 'nature', item.id));
  for (const trail of saved) {
    if (trail.points.some((p, i) => i > 0 && p.timestamp - trail.points[i - 1].timestamp > 30000)) continue;
    const before=refs.length;
    add(`personal:${trail.id}`, trail.name, trail.points, 'personal', trail.id, trail.tripId, trail.createdAt);
    for(const ref of refs.slice(before))ref.validFrom=trail.points[0]?.timestamp;
  }
  return refs;
}
