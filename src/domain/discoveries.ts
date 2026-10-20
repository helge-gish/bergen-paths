import { streetProgressSteps } from './streets';
import type { Coordinate, Fix, Trip } from './types';
import { cleanPoints, distance, MAX_GAP_MS, project } from './geo';
export type DiscoveryKind = 'street' | 'trail' | 'steps' | 'peak' | 'viewpoint' | 'hut' | 'landmark' | 'water' | 'picnic';
export type Discovery = Coordinate & {
  id: string;
  name: string;
  kind: DiscoveryKind;
  geometry: Coordinate[];
  streetPaths?: Coordinate[][];
  streetEnds?: Coordinate[];
  sourceUrl: string;
  fetchedAt: number;
  osmHighway?: string;
  sacScale?: string;
  unnamed?: boolean;
  localName?: string;
  osmName?: string;
};
export type Progress = { fraction: number; collected: boolean; firstVisit: number | null; earnedTripId?: string; streetCheck?: { coveredMeters: number; totalMeters: number; endsVisited: number; endsTotal: number } };
export const kindLabels: Record<DiscoveryKind, string> = { street: 'Gater', trail: 'Stier', steps: 'Trapper', peak: 'Topper', viewpoint: 'Utsiktspunkter', hut: 'Hytter og ly', landmark: 'Landemerker', water: 'Vann og kilder', picnic: 'Rasteplasser' };
function sampleLine(points: Coordinate[], spacing = 20): Coordinate[] {
  const result: Coordinate[] = points.length ? [points[0]] : [];
  let traveled = 0, next = spacing;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = distance(a, b);
    if (length === 0) continue;
    while (next <= traveled + length) {
      const f = (next - traveled) / length;
      result.push({ latitude: a.latitude + (b.latitude - a.latitude) * f, longitude: a.longitude + (b.longitude - a.longitude) * f });
      next += spacing;
    }
    traveled += length;
  }
  if (points.length > 1 && distance(result.at(-1)!, points.at(-1)!) > 1) result.push(points.at(-1)!);
  return result;
}
export function collectionProgress(items: Discovery[], trips: Trip[]): Record<string, Progress> {
  const work = collectionProgressSteps(items, trips);
  let step = work.next();
  while (!step.done) step = work.next();
  return step.value;
}
export type CollectionUpdate = { processed: number; total: number; progress: Record<string, Progress> };
export async function collectionProgressAsync(items: Discovery[], trips: Trip[], cancelled: () => boolean = () => false, onProgress?: (update: CollectionUpdate) => void): Promise<Record<string, Progress> | null> {
  const work = collectionProgressSteps(items, trips);
  let latest: CollectionUpdate | undefined, reported = 0;
  // Yield before starting, including on launch and when switching tabs.
  while (!cancelled()) {
    await new Promise<void>(resolve => setTimeout(resolve, 16));
    if (cancelled()) return null;
    const until = Date.now() + 8;
    do {
      const step = work.next();
      if (step.done) return cancelled() ? null : step.value;
      if (step.value) latest = step.value;
    } while (Date.now() < until && !cancelled());
    if (latest && Date.now() - reported >= 200 && !cancelled()) { onProgress?.({ ...latest, progress: { ...latest.progress } }); reported = Date.now(); }
  }
  return null;
}
function* collectionProgressSteps(items: Discovery[], trips: Trip[]): Generator<void | CollectionUpdate, Record<string, Progress>> {
  let work = 0;
  const result: Record<string, Progress> = {};
  const ordered = trips.filter(t => t.endedAt !== null).sort((a, b) => a.startedAt - b.startedAt).map(t => ({ ...t, points: [...t.points].sort((a, b) => a.timestamp - b.timestamp) }));
  const tracks = ordered.map(trip => ({ trip, points: cleanPoints(trip.points) }));
  const envelopes = ordered.map(trip => ({ trip, bounds: envelope(trip.points) }));
  yield;
  // A spatial grid keeps collection checks local even as the turlogg grows.
  const grid = new Map<string, { a: Coordinate; b: Coordinate; time: number; tripId: string }[]>();
  const key = (x: number, y: number) => `${x}:${y}`;
  for (const { trip, points } of tracks) for (let i = 1; i < points.length; i++) {
    if (++work % 128 === 0) yield;
    const a = points[i - 1], b = points[i];
    if (a.accuracy > 15 || b.accuracy > 15 || b.timestamp - a.timestamp > MAX_GAP_MS || distance(a, b) > 60) continue;
    const minX = Math.floor(Math.min(a.longitude, b.longitude) / 0.002), maxX = Math.floor(Math.max(a.longitude, b.longitude) / 0.002);
    const minY = Math.floor(Math.min(a.latitude, b.latitude) / 0.001), maxY = Math.floor(Math.max(a.latitude, b.latitude) / 0.001);
    for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) {
      const k = key(x, y), list = grid.get(k) ?? []; list.push({ a, b, time: b.timestamp, tripId: trip.id }); grid.set(k, list);
    }
  }
  let processed = 0;
  for (const item of items) {
    if (processed) yield { processed, total: items.length, progress: result };
    processed++;
    const bounds = envelope((item.streetPaths ?? [item.geometry]).flat().concat([item]));
    const candidates = envelopes.filter(track => overlaps(bounds, track.bounds)).map(track => track.trip);
    if (!candidates.length) { result[item.id] = { fraction: 0, collected: false, firstVisit: null }; continue; }
    if (item.kind === 'street' || item.kind === 'steps') { result[item.id] = yield* streetProgressSteps(item, candidates, true); continue; }
    if (item.kind !== 'trail') {
      let firstVisit: number | null = null;
      let earnedTripId: string | undefined;
      for (const { trip, points } of tracks) {
        if (!candidates.includes(trip)) continue;
        const near: Fix[] = [];
        for (const p of points) {
          if (++work % 128 === 0) yield;
          if (p.accuracy <= 25 && distance(p, item) <= 40) near.push(p);
        }
        if (near.length >= 2 && near.at(-1)!.timestamp - near[0].timestamp >= 10_000) { firstVisit = near.find(p => p.timestamp - near[0].timestamp >= 10_000)!.timestamp; earnedTripId = trip.id; break; }
      }
      result[item.id] = { fraction: firstVisit === null ? 0 : 1, collected: firstVisit !== null, firstVisit, ...(earnedTripId ? { earnedTripId } : {}) };
      continue;
    }
    const samples = sampleLine(item.geometry);
    const visits: { time: number; tripId: string }[] = [];
    for (const p of samples) {
      if (++work % 64 === 0) yield;
      const gx = Math.floor(p.longitude / 0.002), gy = Math.floor(p.latitude / 0.001);
      let earliest = Infinity, tripId = "";
      for (let x = gx - 1; x <= gx + 1; x++) for (let y = gy - 1; y <= gy + 1; y++) for (const edge of grid.get(key(x, y)) ?? []) {
        if (++work % 128 === 0) yield;
        if (edge.time < earliest && project(p, edge.a, edge.b).distance <= 15) { earliest = edge.time; tripId = edge.tripId; }
      }
      if (earliest !== Infinity) visits.push({ time: earliest, tripId });
    }
    const fraction = samples.length >= 2 ? visits.length / samples.length : 0;
    visits.sort((a, b) => a.time - b.time);
    const earned = fraction >= .85 ? visits[Math.ceil(samples.length * .85) - 1] : undefined;
    result[item.id] = { fraction, collected: !!earned, firstVisit: earned?.time ?? visits[0]?.time ?? null, ...(earned ? { earnedTripId: earned.tripId } : {}) };
  }
  return result;
}
// Broad-phase rejection only: keep a generous margin, including latitude-aware
// longitude expansion. Exact GPS matching still decides collection.
function envelope(points: Coordinate[]) {
  const b = { south: Infinity, north: -Infinity, west: Infinity, east: -Infinity };
  for (const p of points) if (Number.isFinite(p.latitude) && Number.isFinite(p.longitude)) {
    b.south = Math.min(b.south, p.latitude); b.north = Math.max(b.north, p.latitude);
    b.west = Math.min(b.west, p.longitude); b.east = Math.max(b.east, p.longitude);
  }
  return b;
}
function overlaps(a: ReturnType<typeof envelope>, b: ReturnType<typeof envelope>) {
  const margin = .001 / Math.max(.001, Math.cos(Math.max(Math.abs(a.south), Math.abs(a.north)) * Math.PI / 180));
  return a.south <= b.north + .001 && a.north >= b.south - .001 && a.west <= b.east + margin && a.east >= b.west - margin;
}
type OsmElement = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; geometry?: { lat: number; lon: number }[]; tags?: Record<string, string> };
export function parseOsm(data: unknown, fetchedAt: number): Discovery[] {
  if (!data || typeof data !== 'object' || !('elements' in data) || !Array.isArray(data.elements)) throw new Error('Uventet svar fra kartkilden. Prøv igjen senere.');
  const items: Discovery[] = [];
  for (const e of (data.elements as OsmElement[])) {
    if (!e || !['node', 'way', 'relation'].includes(e.type) || !Number.isSafeInteger(e.id)) continue;
    const t = e.tags ?? {};
    if (t.access === 'private' || t.access === 'no' || t.foot === 'no' || t.foot === 'private') continue;
    let kind: DiscoveryKind | null = null;
    // Named pedestrian ways belong to the whole-street query, not one award
    // per OSM fragment. Sidewalks/crossings never become separate trail awards.
    if (['path', 'footway', 'steps'].includes(t.highway)) {
      if (['sidewalk', 'crossing'].includes(t.footway)) continue;
      if (t.highway !== 'path' && (t.name ?? t['name:nb'])?.trim()) continue;
      kind = t.highway === 'steps' ? 'steps' : 'trail';
    }
    else if (t.natural === 'peak') kind = 'peak';
    else if (t.tourism === 'viewpoint') kind = 'viewpoint';
    else if (['alpine_hut', 'wilderness_hut'].includes(t.tourism) || t.amenity === 'shelter') kind = 'hut';
    else if (t.historic || t.tourism === 'attraction') kind = 'landmark';
    else if (t.natural === 'spring' || t.natural === 'water') kind = 'water';
    else if (t.tourism === 'picnic_site' || t.leisure === 'picnic_table') kind = 'picnic';
    if (!kind) continue;
    const geometry = (e.geometry ?? []).slice(0, 10_000).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180).map(p => ({ latitude: p.lat, longitude: p.lon }));
    if ((kind === 'trail' || kind === 'steps') && geometry.length < 2) continue;
    // Area centroids can be in lakes/buildings, unreachable from paths. Collect at mapped nodes only for these categories.
    if (kind === 'water' && e.type !== 'node') continue;
    const latitude = e.lat ?? e.center?.lat ?? geometry[0]?.latitude;
    const longitude = e.lon ?? e.center?.lon ?? geometry[0]?.longitude;
    if (latitude === undefined || longitude === undefined || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
    const fallback: Record<DiscoveryKind, string> = { street: 'Gate uten navn', trail: 'Sti uten navn', steps: 'Trapp', peak: 'Topp uten navn', viewpoint: 'Utsiktspunkt', hut: 'Hytte eller ly', landmark: 'Landemerke', water: 'Kilde / vann', picnic: 'Rasteplass' };
    const mappedName = t['name:nb']?.trim() || t.name?.trim();
    items.push({ id: `${e.type}/${e.id}`, name: (mappedName || fallback[kind]).slice(0, 100), unnamed: !mappedName, kind, latitude, longitude, geometry, sourceUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`, fetchedAt, osmHighway: t.highway, sacScale: t.sac_scale, ...(kind === 'steps' ? { streetPaths: [geometry], streetEnds: [geometry[0], geometry.at(-1)!] } : {}) });
  }
  return items;
}
