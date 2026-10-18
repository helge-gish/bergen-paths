import type { Discovery, Progress } from './discoveries';
import type { Coordinate, Fix, Trip } from './types';
import { distance, project } from './geo';

const key = (p: Coordinate) => `${p.latitude.toFixed(7)},${p.longitude.toFixed(7)}`;
const allowed = new Set(['residential', 'living_street', 'pedestrian', 'unclassified', 'service', 'tertiary', 'secondary', 'primary']);
/** Whole OSM ways, grouped by street name. Separate branches remain separate lines. */
export function parseStreets(data: unknown, fetchedAt: number, scope?: string): Discovery[] {
  if (!data || typeof data !== 'object' || !('elements' in data) || !Array.isArray(data.elements)) throw new Error('Uventet svar fra gatekartet.');
  const groups = new Map<string, { name: string; paths: Coordinate[][]; id: number }>();
  for (const e of data.elements) {
    if (!e || e.type !== 'way' || !Number.isSafeInteger(e.id) || !allowed.has(e.tags?.highway)) continue;
    const t = e.tags;
    if (['private', 'no'].includes(t.access) || ['private', 'no'].includes(t.foot) || t.area === 'yes' || typeof t.name !== 'string' || !t.name.trim()) continue;
    if (!Array.isArray(e.geometry) || e.geometry.length < 2 || e.geometry.some((p: { lat: number; lon: number }) => !p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180)) continue;
    const name = t.name.trim().normalize('NFC'), id = name.toLocaleLowerCase('nb');
    const group: { name: string; paths: Coordinate[][]; id: number } = groups.get(id) ?? { name, paths: [], id: e.id };
    group.paths.push(e.geometry.map((p: { lat: number; lon: number }) => ({ latitude: p.lat, longitude: p.lon })));
    groups.set(id, group);
  }
  return [...groups].flatMap(([id, g]) => {
    const edges = new Map<string, Coordinate[]>(), neighbors = new Map<string, Set<string>>(), coords = new Map<string, Coordinate>();
    for (const path of g.paths) for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], ka = key(a), kb = key(b);
      if (ka === kb || distance(a, b) < 0.1) continue;
      edges.set([ka, kb].sort().join('|'), [a, b]);
      for (const [p, q, c] of [[ka, kb, a], [kb, ka, b]] as const) {
        const set = neighbors.get(p) ?? new Set<string>(); set.add(q); neighbors.set(p, set); coords.set(p, c);
      }
    }
    const paths: Coordinate[][] = [], used = new Set<string>();
    const edgeKey = (a: string, b: string) => [a, b].sort().join('|');
    const follow = (start: string, next: string) => {
      const path = [coords.get(start)!]; let a = start, b = next;
      while (!used.has(edgeKey(a, b))) {
        used.add(edgeKey(a, b)); path.push(coords.get(b)!);
        if (neighbors.get(b)!.size !== 2) break;
        const c = [...neighbors.get(b)!].find(n => n !== a)!; a = b; b = c;
      }
      if (path.length > 1) paths.push(path);
    };
    for (const [a, ns] of neighbors) if (ns.size !== 2) for (const b of ns) follow(a, b);
    for (const [a, ns] of neighbors) for (const b of ns) follow(a, b);
    if (!paths.length) return [];
    const ends = [...neighbors].filter(([, n]) => n.size === 1).map(([k]) => coords.get(k)!);
    // Every disconnected component needs an anchor, including closed loops.
    const seen = new Set<string>();
    for (const k of neighbors.keys()) {
      if (seen.has(k)) continue;
      const stack = [k], component: string[] = [];
      while (stack.length) { const n = stack.pop()!; if (seen.has(n)) continue; seen.add(n); component.push(n); stack.push(...neighbors.get(n)!); }
      if (!component.some(n => neighbors.get(n)!.size === 1)) ends.push(coords.get(k)!);
    }
    return [{ id: `street/${scope ? `${scope}/` : ''}${encodeURIComponent(id)}`, name: g.name, kind: 'street' as const, ...paths[0][0], geometry: paths[0], streetPaths: paths, streetEnds: ends, sourceUrl: `https://www.openstreetmap.org/way/${g.id}`, fetchedAt }];
  });
}
export function streetLength(item: Discovery): number {
  return (item.streetPaths ?? [item.geometry]).reduce((sum, path) => sum + path.slice(1).reduce((n, p, i) => n + distance(path[i], p), 0), 0);
}
type Sample = { p: Coordinate; a: Coordinate; b: Coordinate; weight: number };
export function streetProgress(item: Discovery, trips: Trip[]): Progress {
  const work = streetProgressSteps(item, trips);
  let step = work.next();
  while (!step.done) step = work.next();
  return step.value;
}
/** Cooperative checkpoints let the UI process touches even for a long street. */
export function* streetProgressSteps(item: Discovery, trips: Trip[], ordered = false): Generator<void, Progress> {
  let work = 0;
  const coordinates = (item.streetPaths ?? [item.geometry]).flat();
  if (!coordinates.length) return { fraction: 0, collected: false, firstVisit: null };
  let south = Infinity, north = -Infinity, west = Infinity, east = -Infinity;
  for (const p of coordinates) { south = Math.min(south, p.latitude); north = Math.max(north, p.latitude); west = Math.min(west, p.longitude); east = Math.max(east, p.longitude); }
  const lonMargin = 0.0005 / Math.max(0.01, Math.cos((south + north) / 2 * Math.PI / 180));
  const samples: Sample[] = [];
  for (const path of item.streetPaths ?? [item.geometry]) for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], length = distance(a, b), n = Math.ceil(length / 8);
    for (let j = 0; j < n; j++) { if (++work % 256 === 0) yield; const f = (j + 0.5) / n; samples.push({ p: { latitude: a.latitude + (b.latitude - a.latitude) * f, longitude: a.longitude + (b.longitude - a.longitude) * f }, a, b, weight: length / n }); }
  }
  const grid = new Map<string, number[]>();
  const cell = (p: Coordinate) => [Math.floor(p.longitude / 0.001), Math.floor(p.latitude / 0.0005)];
  samples.forEach((s, i) => { const [x, y] = cell(s.p), k = `${x}:${y}`, list = grid.get(k) ?? []; list.push(i); grid.set(k, list); });
  const total = samples.reduce((n, s) => n + s.weight, 0);
  let best = 0;
  if (!total) return { fraction: 0, collected: false, firstVisit: null };
  for (const trip of (ordered ? trips : trips.filter(t => t.endedAt !== null).sort((a, b) => a.startedAt - b.startedAt))) {
    let previous: Fix | null = null;
    let covered = new Set<number>(), ends = new Set<number>();
    const reset = () => { covered = new Set(); ends = new Set(); };
    for (const b of (ordered ? trip.points : [...trip.points].sort((a, b) => a.timestamp - b.timestamp))) {
      if (++work % 128 === 0) yield;
      if (!Number.isFinite(b.latitude) || !Number.isFinite(b.longitude) || !Number.isFinite(b.timestamp) || !Number.isFinite(b.accuracy) || b.accuracy < 0 || b.accuracy > 15 || b.timestamp < trip.startedAt || b.timestamp > trip.endedAt! || (b.speed !== null && b.speed > 3.3)) { previous = null; reset(); continue; }
      if (b.latitude < south - 0.0005 || b.latitude > north + 0.0005 || b.longitude < west - lonMargin || b.longitude > east + lonMargin) { previous = null; reset(); continue; }
      const a = previous; previous = b;
      if (!a) continue;
      const length = distance(a, b), dt = b.timestamp - a.timestamp;
      if (dt <= 0) continue;
      if (dt > 20_000 || length > 50 || length / (dt / 1000) > 3.3) { reset(); continue; }
      if (length < 1) continue;
      const dx = (b.longitude - a.longitude) * Math.cos(a.latitude * Math.PI / 180), dy = b.latitude - a.latitude;
      const along = (p: Coordinate) => { const x = (p.longitude - a.longitude) * Math.cos(a.latitude * Math.PI / 180), y = p.latitude - a.latitude; return (x * dx + y * dy) / (dx * dx + dy * dy); };
      const [x1, y1] = cell(a), [x2, y2] = cell(b);
      const candidates: number[] = [];
      for (let x = Math.min(x1, x2) - 1; x <= Math.max(x1, x2) + 1; x++) for (let y = Math.min(y1, y2) - 1; y <= Math.max(y1, y2) + 1; y++) candidates.push(...grid.get(`${x}:${y}`) ?? []);
      candidates.forEach(i => { const s = samples[i];
        if (covered.has(i)) return;
        const sx = (s.b.longitude - s.a.longitude) * Math.cos(a.latitude * Math.PI / 180), sy = s.b.latitude - s.a.latitude;
        const alignment = Math.abs(dx * sx + dy * sy) / Math.hypot(dx, dy) / Math.hypot(sx, sy), f = along(s.p);
        if (alignment >= Math.SQRT1_2 && f >= -2 / length && f <= 1 + 2 / length && project(s.p, a, b).distance <= 15) { covered.add(i); }
      });
      (item.streetEnds ?? []).forEach((p, i) => { if (Math.min(distance(a, p), distance(b, p)) <= 12) ends.add(i); });
      const fraction = [...covered].reduce((n, i) => n + samples[i].weight, 0) / total;
      best = Math.max(best, fraction);
      if (fraction >= 0.95 && ends.size === (item.streetEnds ?? []).length) return { fraction, collected: true, firstVisit: b.timestamp };
    }
  }
  return { fraction: best, collected: false, firstVisit: null };
}
