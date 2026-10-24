import { isNatureTrail, insideRing } from '../domain/nature';
import { parseOsm, type Discovery } from '../domain/discoveries';
import type { Coordinate } from '../domain/types';
import { overpass, validCenter } from './osm';
export function parseNatureMap(data: { elements: any[] }, now = Date.now()): Discovery[] {
  const rings = data.elements.filter(e => e.type === 'way' && (['wood', 'heath', 'scrub'].includes(e.tags?.natural) || e.tags?.landuse === 'forest'))
    .map(e => (e.geometry ?? []).map((p: any) => ({ latitude: p.lat, longitude: p.lon })))
    .filter(ring => ring.length >= 4 && ring.every((p: Coordinate) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)) && ring[0].latitude === ring.at(-1).latitude && ring[0].longitude === ring.at(-1).longitude);
  // Named woodland footways belong here even though the legacy street parser
  // reserves named pedestrian ways for the city game. Preserve original names.
  const names = new Map(data.elements.map(e => [`${e.type}/${e.id}`, e.tags?.['name:nb'] || e.tags?.name]));
  const normalized = data.elements.map(e => e.tags?.highway === 'footway' ? { ...e, tags: { ...e.tags, name: undefined, 'name:nb': undefined } } : e);
  return parseOsm({ elements: normalized }, now).map(item => {
    const sample = [item.geometry[0], item.geometry[Math.floor(item.geometry.length / 2)], item.geometry.at(-1)].filter(Boolean);
    const natureContext = sample.length > 0 && sample.every(p => rings.some(ring => insideRing(p!, ring)));
    const name = names.get(item.id);
    return { ...item, natureContext, ...(name ? { name, unnamed: false } : {}) };
  }).filter(isNatureTrail);
}
export async function fetchNatureMap(center: Coordinate, radius: number, signal?: AbortSignal) {
  validCenter(center);
  if (![1000, 3000, 5000].includes(radius)) throw new Error('Velg 1, 3 eller 5 km radius.');
  const around = `(around:${radius},${center.latitude.toFixed(5)},${center.longitude.toFixed(5)})`;
  return parseNatureMap(await overpass(`[out:json][timeout:60];(way[highway~"^(path|footway)$"]${around};way[natural~"^(wood|heath|scrub)$"]${around};way[landuse=forest]${around};);out center geom;`, signal));
}
