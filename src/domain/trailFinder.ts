import { trailFacts, type TrailFacts } from './trailFacts';
import { freshPosition, usablePosition } from './position';
import { streetRows } from './neighborhood';
import type { Discovery } from './discoveries';
import { discoveryRows } from './discoveryRows';
import { needsDiscoveryName } from './discoveryGroups';
import { bearing, cleanPoints, distance, project, relativeBearing, segments } from './geo';
import type { Coordinate, Fix, Trail } from './types';

export type TrailChoice = { id: string; name: string; item: Discovery; saved?: Trail; facts: TrailFacts };
export type NearbyTrail = TrailChoice & { coordinate: Coordinate; meters: number; bearing: number };
export type CameraHeading = { bearing: number; pitch: number; reliable: boolean; timestamp: number; quality?: 'precise' | 'approximate' | 'unreliable'; source?: 'rotation' | 'magnetic'; accuracy?: number; errorDegrees?: number | null; magneticAccuracy?: number; magneticMicrotesla?: number | null };
const outlines = new WeakMap<Discovery, { paths: Coordinate[][]; south: number; north: number; west: number; east: number }>();
export function trailChoices(items: Discovery[], saved: Trail[]): TrailChoice[] {
  return [
    ...saved.map(trail => {
      const points = cleanPoints(trail.points), paths = segments(points);
      const item: Discovery = { id: `saved:${trail.id}`, name: trail.name, kind: 'trail', latitude: points[0]?.latitude ?? 0, longitude: points[0]?.longitude ?? 0, geometry: points, streetPaths: paths, sourceUrl: '', fetchedAt: trail.createdAt };
      return { id: item.id, name: trail.name, item, saved: trail, facts: trailFacts([], trail) };
    }),
    ...discoveryRows(items.filter(item => item.kind === 'trail' || item.kind === 'steps')).map(row => ({ id: row.id, name: needsDiscoveryName(row.item) ? '' : row.item.name, item: row.item, facts: trailFacts(row.members) })),
  ];
}
export function cameraStreetChoices(items: Discovery[]): TrailChoice[] {
  return streetRows(items).map(row => ({ id: row.id, name: row.item.name, item: row.item, facts: trailFacts(row.members) }));
}
// Reserve room for nearby street names as orientation landmarks, while keeping
// paths, stairs and saved segments as the main choices. Input is distance-sorted.
export function cameraChoicesNear(nearby: NearbyTrail[], selectedId: string | null = null): NearbyTrail[] {
  const walks = nearby.filter(target => target.item.kind !== 'street');
  const streets = nearby.filter(target => target.item.kind === 'street');
  const result = [...walks.slice(0, 9), ...streets.slice(0, 3)];
  const selected = nearby.find(target => target.id === selectedId);
  if (selected && !result.some(target => target.id === selected.id)) {
    if (result.length >= 12) result.pop();
    result.push(selected);
  }
  return result;
}
export function cameraPlaceType(target: NearbyTrail): string {
  return target.saved ? 'Ditt strekk' : target.item.kind === 'street' ? 'Gate · orienteringspunkt' : target.item.kind === 'steps' ? 'Trapp' : 'Sti';
}
function outline(item: Discovery) {
  const cached = outlines.get(item);
  if (cached) return cached;
  const paths = (item.streetPaths ?? [item.geometry]).filter(path => path.length > 1);
  let south = Infinity, north = -Infinity, west = Infinity, east = -Infinity;
  for (const path of paths) for (const p of path) {
    south = Math.min(south, p.latitude); north = Math.max(north, p.latitude);
    west = Math.min(west, p.longitude); east = Math.max(east, p.longitude);
  }
  const result = { paths, south, north, west, east };
  outlines.set(item, result); return result;
}
export function nearbyTrails(choices: TrailChoice[], position: Fix, radius = 3000): NearbyTrail[] {
  if (!usablePosition(position) || !Number.isFinite(radius) || radius <= 0) return [];
  const dy = radius / 110000, dx = dy / Math.max(.01, Math.cos(position.latitude * Math.PI / 180));
  const result: NearbyTrail[] = [];
  for (const choice of choices) {
    const bounds = outline(choice.item);
    if (position.latitude < bounds.south - dy || position.latitude > bounds.north + dy || position.longitude < bounds.west - dx || position.longitude > bounds.east + dx) continue;
    let nearest: { coordinate: Coordinate; distance: number } | null = null;
    for (const path of bounds.paths) for (let i = 1; i < path.length; i++) {
      const hit = project(position, path[i - 1], path[i]);
      if (!nearest || hit.distance < nearest.distance) nearest = hit;
    }
    if (!nearest || nearest.distance > radius) continue;
    const angle = bearing(position, nearest.coordinate);
    const direction = ['nord', 'nordøst', 'øst', 'sørøst', 'sør', 'sørvest', 'vest', 'nordvest'][Math.round(angle / 45) % 8];
    result.push({ ...choice, name: choice.name || `${choice.item.kind === 'steps' ? 'Trapp' : 'Sti'} mot ${direction}`, coordinate: nearest.coordinate, meters: nearest.distance, bearing: angle });
  }
  return result.sort((a, b) => a.meters - b.meters || a.id.localeCompare(b.id));
}
export function cameraPositionReady(position: Fix | null, now: number): position is Fix {
  return freshPosition(position, now) && position!.accuracy <= 25;
}
export function cameraHeadingFresh(heading: CameraHeading | null, now: number): heading is CameraHeading {
  return !!heading && Number.isFinite(heading.timestamp) && Number.isFinite(heading.bearing) && Number.isFinite(heading.pitch)
    && now - heading.timestamp <= 2500 && heading.timestamp <= now + 1000;
}
export function cameraTarget(target: NearbyTrail, heading: CameraHeading | null, position: Fix | null, now: number) {
  if (!cameraHeadingFresh(heading, now) || !heading.reliable || !Number.isFinite(target.bearing) || !Number.isFinite(target.meters)
    || !cameraPositionReady(position, now)) return null;
  // A nearby line can lie anywhere within the GPS uncertainty. Show it in the
  // proximity list rather than inventing a camera direction from near-zero range.
  if (Math.abs(heading.pitch) > 55 || target.meters < Math.max(8, position.accuracy)) return null;
  const delta = relativeBearing(target.bearing, heading.bearing);
  // Directional HUD with an approximate field of view, not terrain registration.
  return { delta, visible: Math.abs(delta) <= 30, fraction: .5 + Math.tan(delta * Math.PI / 180) / (2 * Math.tan(Math.PI / 6)) };
}

// Map ways can be split at arbitrary nodes. This is a proposed start, not a
// verified public entrance. Saved segments retain their original start.
export function trailStart(target: Pick<NearbyTrail, 'saved' | 'item' | 'coordinate'>): Coordinate | undefined {
  if (target.saved) return cleanPoints(target.saved.points)[0];
  const endpoints = (target.item.streetPaths ?? [target.item.geometry]).flatMap(path => path.length > 1 ? [path[0], path[path.length - 1]] : []);
  return endpoints.sort((a, b) => distance(a, target.coordinate) - distance(b, target.coordinate))[0];
}
