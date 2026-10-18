import type { Discovery } from './discoveries';
export type MapBounds = [number, number, number, number];
const boxes = new WeakMap<Discovery, MapBounds>();
function box(item: Discovery): MapBounds {
  const cached = boxes.get(item);
  if (cached) return cached;
  let west = item.longitude, east = west, south = item.latitude, north = south;
  for (const path of item.streetPaths ?? [item.geometry]) for (const p of path) {
    west = Math.min(west, p.longitude); east = Math.max(east, p.longitude);
    south = Math.min(south, p.latitude); north = Math.max(north, p.latitude);
  }
  const result: MapBounds = [west, south, east, north]; boxes.set(item, result); return result;
}
/** Bound the native overlay, never the stored collection or achievement evidence. */
export function mapSelection(items: Discovery[], bounds: MapBounds, selected?: Discovery | null, limit = 500) {
  const [west, south, east, north] = bounds, x = (west + east) / 2, y = (south + north) / 2;
  const nearby = items.filter(item => {
    const b = box(item);
    const longitudeOverlaps = west <= east ? b[0] <= east && b[2] >= west : b[0] <= east || b[2] >= west;
    return b[1] <= north && b[3] >= south && longitudeOverlaps;
  });
  const scale = Math.cos(y * Math.PI / 180);
  const score = (item: Discovery) => (item.latitude - y) ** 2 + ((item.longitude - x) * scale) ** 2;
  nearby.sort((a, b) => score(a) - score(b));
  const visible: Discovery[] = selected ? [selected] : [];
  let vertices = selected ? (selected.streetPaths ?? [selected.geometry]).reduce((n, p) => n + p.length, 0) : 0;
  for (const item of nearby) {
    if (item.id === selected?.id) continue;
    const size = (item.streetPaths ?? [item.geometry]).reduce((n, p) => n + p.length, 0);
    if (visible.length >= limit || vertices + size > 30000) continue;
    visible.push(item); vertices += size;
  }
  return { items: visible, limited: nearby.length > visible.length };
}
