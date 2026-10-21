import { inArea, type HomeArea } from './areas';
import type { Discovery, Progress } from './discoveries';
import { needsDiscoveryName } from './discoveryGroups';
import { discoveryRows, rowProgress, type DiscoveryRow } from './discoveryRows';

export function streetRows(items: Discovery[]) {
  const names = new Map<string, Discovery[]>();
  for (const item of new Map(items.map(item => [item.id, item])).values()) {
    if (item.kind !== 'street' || needsDiscoveryName(item)) continue;
    const name = item.name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('nb');
    const bucket = names.get(name) ?? []; bucket.push(item); names.set(name, bucket);
  }
  // Most streets are already whole, unique named groups from parseStreets.
  // Only build a junction graph when a name actually occurs more than once.
  return [...names.values()].flatMap(items => items.length === 1 ? [{ id: items[0].id, item: items[0], members: items }] : discoveryRows(items));
}
const boxes = new WeakMap<Discovery, number[]>();
function nearArea(item: Discovery, area: HomeArea) {
  if (Math.abs(area.latitude) > 85 || Math.abs(area.longitude) > 179) return true;
  let box = boxes.get(item);
  if (!box) {
    box = [item.longitude, item.latitude, item.longitude, item.latitude];
    for (const path of item.streetPaths ?? [item.geometry]) for (const p of path) {
      box[0] = Math.min(box[0], p.longitude); box[1] = Math.min(box[1], p.latitude);
      box[2] = Math.max(box[2], p.longitude); box[3] = Math.max(box[3], p.latitude);
    }
    boxes.set(item, box);
  }
  const dy = area.radius / 110000;
  const dx = dy / Math.cos((Math.abs(area.latitude) + dy) * Math.PI / 180);
  return box[0] <= area.longitude + dx && box[2] >= area.longitude - dx && box[1] <= area.latitude + dy && box[3] >= area.latitude - dy;
}
/** Whole named streets intersecting the radius. Never clip a street into a
 * smaller target or count a partial traverse as completed. */
export function neighborhoodStreets(rows: DiscoveryRow[], area: HomeArea | null, progress: Record<string, Progress>) {
  const local = area ? rows.filter(row => nearArea(row.item, area) && inArea(row.item, area)) : [];
  const complete: DiscoveryRow[] = [], partial: DiscoveryRow[] = [], remaining: DiscoveryRow[] = [];
  let checked = 0;
  for (const row of local) {
    const result = rowProgress(row, progress);
    if (row.members.every(item => progress[item.id] !== undefined)) checked++;
    (result.complete ? complete : result.visited ? partial : remaining).push(row);
  }
  const total = local.length;
  return { total, checked, complete, partial, remaining, percent: total ? Math.floor(100 * complete.length / total) : null };
}
export type NeighborhoodStreets = ReturnType<typeof neighborhoodStreets>;

export type NeighborhoodKind = 'street' | 'steps' | 'trail';
export type NeighborhoodResults = Record<NeighborhoodKind, NeighborhoodStreets>;
export const neighborhoodLabels: Record<NeighborhoodKind, string> = { street: 'gater', steps: 'trapper', trail: 'stier' };

/** Named connected routes are grouped within their category. Unnamed ways join
 * only across an unambiguous degree-two endpoint, never through a branching
 * path network. Full geometry and each source progress requirement survive. */
export function neighborhoodRouteRows(items: Discovery[], kind: 'steps' | 'trail'): DiscoveryRow[] {
  const unique = [...new Map(items.filter(item => item.kind === kind).map(item => [item.id, item])).values()];
  const named = discoveryRows(unique.filter(item => !needsDiscoveryName(item)));
  const unnamed = unique.filter(needsDiscoveryName);
  const key = (p: { latitude: number; longitude: number }) => `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`;
  const neighbors = new Map<string, Set<string>>();
  for (const item of unique) for (const path of item.streetPaths ?? [item.geometry]) for (let i = 1; i < path.length; i++) {
    const a = key(path[i - 1]), b = key(path[i]);
    if (a === b) continue;
    for (const [from, to] of [[a, b], [b, a]]) { const links = neighbors.get(from) ?? new Set<string>(); links.add(to); neighbors.set(from, links); }
  }
  const parents = unnamed.map((_, i) => i);
  const root = (i: number): number => { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; } return i; };
  const ends = new Map<string, number>();
  unnamed.forEach((item, i) => {
    const paths = item.streetPaths ?? [item.geometry];
    for (const path of paths) {
      if (path.length < 2) continue;
      for (const p of [path[0], path[path.length - 1]]) {
        const k = key(p);
        if (neighbors.get(k)?.size !== 2) continue;
        const previous = ends.get(k);
        if (previous !== undefined) parents[root(i)] = root(previous);
        else ends.set(k, i);
      }
    }
  });
  const groups = new Map<number, Discovery[]>();
  unnamed.forEach((item, i) => { const id = root(i), members = groups.get(id) ?? []; members.push(item); groups.set(id, members); });
  return [...named, ...[...groups.values()].map(members => {
    const first = members[0];
    if (members.length === 1) return { id: first.id, item: first, members };
    const id = `display-route:${members.map(item => item.id).sort()[0]}`;
    return { id, members, item: { ...first, id, streetPaths: members.flatMap(item => item.streetPaths ?? [item.geometry]), streetEnds: [] } };
  })];
}
