import type { Feature, FeatureCollection } from 'geojson';
import type { Discovery } from './discoveries';
import type { Coordinate } from './types';
import { distance, project } from './geo';

const validCoordinate = (p: Coordinate) => Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180;
/** Nearest mapped part, without joining separate paths or skipping bad vertices. */
export function distanceToMapItem(position: Coordinate | null | undefined, item: Discovery): number | null {
  if (!position || !validCoordinate(position)) return null;
  let nearest = Infinity;
  const paths = item.streetPaths ?? [item.geometry];
  for (const path of paths) for (let i = 0; i < path.length; i++) {
    if (!validCoordinate(path[i])) continue;
    nearest = Math.min(nearest, distance(position, path[i]));
    if (i && validCoordinate(path[i - 1])) nearest = Math.min(nearest, project(position, path[i - 1], path[i]).distance);
  }
  // POIs have a location; an unmapped line's centre is not its nearest point.
  if (nearest === Infinity && !['street', 'trail', 'steps'].includes(item.kind) && validCoordinate(item)) nearest = distance(position, item);
  return Number.isFinite(nearest) ? nearest : null;
}

// Track colours describe recorded movement, never collection/achievement state.
export const mapInk = { track: '#1565E8', history: '#79539C', path: '#80532F', footway: '#80532F', selected: '#BF644A' };
export function mapTrailKind(item: Discovery) {
  return item.kind === 'steps' ? 'steps' : item.osmHighway === 'footway' ? 'footway' : 'path';
}
export function mapItems(items: Discovery[]) {
  // Roads and POIs already exist in the base map. Extra collection dots and
  // coloured street lines obscured paths and looked like walking guidance.
  return items.filter(item => item.kind === 'trail' || item.kind === 'steps');
}
export function mapFeatures(items: Discovery[], selected?: Discovery | null): FeatureCollection {
  return { type: 'FeatureCollection', features: items.flatMap<Feature>(item => {
    const properties = { targetId: item.id, name: item.name, selected: item.id === selected?.id, kind: mapTrailKind(item) };
    if (['trail', 'steps', 'street'].includes(item.kind)) return (item.streetPaths ?? [item.geometry]).filter(path => path.length > 1).map((path, i) => ({ type: 'Feature', id: `${item.id}/${i}`, properties, geometry: { type: 'LineString', coordinates: path.map(p => [p.longitude, p.latitude]) } }));
    return [{ type: 'Feature', id: item.id, properties, geometry: { type: 'Point', coordinates: [item.longitude, item.latitude] } }];
  }) };
}
/** Several lines can share the finger hitbox. Select the nearest geometry,
 * not the longest route, its centroid, or the native feature return order. */
export function pickedMapTrail(features: Feature[], items: Discovery[], coordinate: Coordinate): Discovery | null {
  const ids = new Set(features.map(feature => feature.properties?.targetId));
  let picked: Discovery | null = null, nearest = Infinity;
  for (const item of items) {
    if (!ids.has(item.id) || !['trail', 'steps'].includes(item.kind)) continue;
    for (const path of item.streetPaths ?? [item.geometry]) for (let i = 1; i < path.length; i++) {
      const meters = project(coordinate, path[i - 1], path[i]).distance;
      if (meters < nearest) { nearest = meters; picked = item; }
    }
  }
  return picked;
}
