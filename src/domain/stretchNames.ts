import type { Discovery } from './discoveries';
import { needsDiscoveryName } from './discoveryGroups';
import { cleanPoints, distance, MAX_GAP_MS, project } from './geo';
import type { Coordinate, Fix } from './types';

const tidy = (name: string) => name.normalize('NFC').trim().replace(/\s+/g, ' ');
const key = (name: string) => tidy(name).toLocaleLowerCase('nb');
const isRoute = (item: Discovery) => ['street', 'trail', 'steps'].includes(item.kind);
type Place = { name: string; key: string; route: boolean; item: Discovery; paths: Coordinate[][]; south: number; north: number; west: number; east: number };
const catalogCache = new WeakMap<Discovery[], Place[]>();
function catalog(items: Discovery[]) {
  const cached = catalogCache.get(items);
  if (cached) return cached;
  const places = items.filter(item => item.name.trim() && !needsDiscoveryName(item) && (!item.unnamed || item.localName)).map(item => {
    const route = isRoute(item), paths = route ? item.streetPaths ?? [item.geometry] : [[item]];
    let south = Infinity, north = -Infinity, west = Infinity, east = -Infinity;
    for (const path of paths) for (const p of path) {
      if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) continue;
      south = Math.min(south, p.latitude); north = Math.max(north, p.latitude);
      west = Math.min(west, p.longitude); east = Math.max(east, p.longitude);
    }
    return { name: tidy(item.name), key: key(item.name), route, item, paths, south, north, west, east };
  });
  catalogCache.set(items, places);
  return places;
}
function near(p: Coordinate, place: Place, meters: number) {
  const dy = meters / 110000, dx = dy / Math.max(.01, Math.cos(p.latitude * Math.PI / 180));
  return p.latitude >= place.south - dy && p.latitude <= place.north + dy && p.longitude >= place.west - dx && p.longitude <= place.east + dx;
}
function separation(p: Coordinate, place: Place, limit: number) {
  if (!near(p, place, limit)) return Infinity;
  if (!place.route) return distance(p, place.item);
  let best = Infinity;
  const dy = limit / 110000, dx = dy / Math.max(.01, Math.cos(p.latitude * Math.PI / 180));
  for (const path of place.paths) for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    if (p.latitude < Math.min(a.latitude, b.latitude) - dy || p.latitude > Math.max(a.latitude, b.latitude) + dy
      || p.longitude < Math.min(a.longitude, b.longitude) - dx || p.longitude > Math.max(a.longitude, b.longitude) + dx) continue;
    best = Math.min(best, project(p, a, b).distance);
  }
  return best;
}
function endpoint(p: Fix, places: Place[]) {
  if (p.accuracy > 25) return null;
  let winner: Place | null = null, score = Infinity;
  for (const place of places) {
    const limit = place.route ? 30 : 50;
    const d = separation(p, place, limit);
    // Nearby named landmarks are more descriptive than the road beneath them,
    // but a distant landmark must not displace a much closer street.
    const candidate = d + (place.route ? 20 : 0);
    if (d <= limit && (candidate < score || (candidate === score && place.key < (winner?.key ?? '')))) { winner = place; score = candidate; }
  }
  return winner;
}
type Sample = { point: Fix; meters: number; section: number };
function samples(points: Fix[]) {
  let meters = 0, section = 0;
  const track: Sample[] = points.map((point, i) => {
    if (i) {
      const step = distance(points[i - 1], point);
      if (point.timestamp - points[i - 1].timestamp > MAX_GAP_MS || step > 60) section++;
      else meters += step;
    }
    return { point, meters, section };
  });
  // At most 41 real GPS fixes. Never interpolate a point into a GPS outage.
  const selected: Sample[] = [];
  let index = 0;
  for (let n = 0; n <= 40 && track.length; n++) {
    const target = meters * n / 40;
    while (index < track.length - 1 && track[index].meters < target) index++;
    if (selected.at(-1) !== track[index]) selected.push(track[index]);
  }
  return { selected: selected.filter(s => s.meters >= meters * .15 && s.meters <= meters * .85), meters };
}
function viaPlace(points: Fix[], places: Place[], excluded: Set<string>) {
  const { selected, meters } = samples(points);
  if (meters < 150) return null;
  const hits = new Map<string, { place: Place; distances: number[] }>();
  for (const place of places) {
    if (excluded.has(place.key)) continue;
    const distances = selected.map(s => s.point.accuracy <= 20 ? separation(s.point, place, place.route ? 20 : 25) : Infinity);
    const previous = hits.get(place.key);
    // One named route can consist of many OSM ways, including stairs.
    if (previous && previous.place.route === place.route) distances.forEach((d, i) => previous.distances[i] = Math.min(previous.distances[i], d));
    else if (!previous) hits.set(place.key, { place, distances });
  }
  let winner: Place | null = null, best = Infinity;
  for (const { place, distances } of hits.values()) {
    let score = Infinity;
    if (!place.route) {
      const closest = Math.min(...distances);
      const middle = distance(points[0], place.item) >= 80 && distance(points.at(-1)!, place.item) >= 80;
      if (middle && closest <= 25) score = closest;
    } else {
      let start = -1, longest = 0;
      distances.forEach((d, i) => {
        if (d > 20) { start = -1; return; }
        if (start < 0 || selected[i].section !== selected[start].section) start = i;
        if (i - start >= 2) longest = Math.max(longest, selected[i].meters - selected[start].meters);
      });
      if (longest >= 80) score = 100 + 1 / longest;
    }
    if (Number.isFinite(score) && (score < best || (score === best && place.key < (winner?.key ?? '')))) { winner = place; best = score; }
  }
  return winner;
}
const shorten = (name: string, length: number) => name.length <= length ? name : name.slice(0, length - 1).trimEnd() + '…';
function title(start: Place | null, end: Place | null, via: Place | null, loop: boolean) {
  if (start && end && start.key !== end.key) {
    const base = `${shorten(start.name, 38)} – ${shorten(end.name, 38)}`;
    return via && `${base} via ${via.name}`.length <= 80 ? `${base} via ${via.name}` : base;
  }
  const place = start ?? end;
  if (!place) return via ? shorten(`${via.route ? 'Langs' : 'Via'} ${via.name}`, 80) : null;
  const prefix = loop && start && end ? 'Runde fra' : start && end && place.route ? 'Langs' : start ? 'Fra' : 'Til';
  const base = shorten(`${prefix} ${place.name}`, 80);
  return via && `${base} via ${via.name}`.length <= 80 ? `${base} via ${via.name}` : base;
}

/** Cached map data only, computed on save/explicit range changes, never on GPS ticks. */
export function stretchName(raw: Fix[], items: Discovery[]): string | null {
  const points = cleanPoints(raw);
  if (points.length < 2) return null;
  const places = catalog(items);
  const start = endpoint(points[0], places), end = endpoint(points.at(-1)!, places);
  const via = viaPlace(points, places, new Set([start?.key ?? '', end?.key ?? '']));
  // A short out-and-back is not enough evidence to call something a round.
  const loop = distance(points[0], points.at(-1)!) <= 50 && points.some(p => distance(points[0], p) >= 100);
  return title(start, end, via, loop);
}

export function fallbackStretchName(time: number) {
  return `Strekk · ${new Date(time).toLocaleDateString('nb-NO')}`;
}
