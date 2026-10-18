import { retainLocalName } from './discoveryNames';
import type { Coordinate, Trip } from './types';
import { cleanPoints, distance, project } from './geo';
import type { Discovery } from './discoveries';
export type HomeArea = Coordinate & { name: string; radius: number };
export type SurveyTile = Coordinate & { id: string };
/** Every cell fits within the 3 km query, including a margin for nearby targets. */
export function surveyTile(p: Coordinate): SurveyTile {
  const y = Math.min(8999, Math.floor((p.latitude + 90) / 0.02));
  const x = Math.min(8999, Math.floor((p.longitude + 180) / 0.04));
  return { id: `${y}:${x}`, latitude: -90 + (y + 0.5) * 0.02, longitude: -180 + (x + 0.5) * 0.04 };
}
export function tripTiles(trips: Trip[]): SurveyTile[] {
  const cells = new Map<string, SurveyTile>();
  for (const trip of trips.filter(t => t.endedAt !== null)) for (const point of cleanPoints(trip.points)) {
    const tile = surveyTile(point); cells.set(tile.id, tile);
  }
  return [...cells.values()];
}
export function inArea(item: Discovery, area: HomeArea) {
  return distance(item, area) <= area.radius || (item.streetPaths ?? [item.geometry]).some(path => path.some((p, i) => distance(p, area) <= area.radius || (i > 0 && project(area, path[i - 1], p).distance <= area.radius)));
}
export function mergeDiscoveries(existing: Discovery[], incoming: Discovery[]) {
  // Retire old unscoped street IDs when their same OSM source is imported with an area ID.
  const replacements = new Set(incoming.filter(i => i.kind === 'street').map(i => i.sourceUrl));
  const merged = new Map(existing.filter(i => !(i.kind === 'street' && i.id.split('/').length === 2 && replacements.has(i.sourceUrl))).map(i => [i.id, i]));
  for (const item of incoming) merged.set(item.id, retainLocalName(merged.get(item.id), item));
  return [...merged.values()];
}
