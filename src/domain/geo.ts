import type { Coordinate, Fix } from './types';
const rad = (n: number) => n * Math.PI / 180;
export function distance(a: Coordinate, b: Coordinate): number {
  const dLat = rad(b.latitude - a.latitude), dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}
export function bearing(a: Coordinate, b: Coordinate): number {
  const dl = rad(b.longitude - a.longitude);
  return (Math.atan2(Math.sin(dl) * Math.cos(rad(b.latitude)), Math.cos(rad(a.latitude)) * Math.sin(rad(b.latitude)) - Math.sin(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.cos(dl)) * 180 / Math.PI + 360) % 360;
}
export const relativeBearing = (target: number, heading: number) => ((target - heading + 540) % 360) - 180;
export function validFix(p: Fix): boolean {
  return Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180 && Number.isFinite(p.timestamp) && Number.isFinite(p.accuracy) && p.accuracy >= 0 && p.accuracy <= 35;
}
export const MAX_GAP_MS = 90_000;
export function cleanPoints(points: Fix[]): Fix[] {
  const result: Fix[] = [];
  for (const p of [...points].sort((a, b) => a.timestamp - b.timestamp)) {
    if (!validFix(p)) continue;
    const prev = result.at(-1);
    if (prev && p.timestamp <= prev.timestamp) continue;
    if (prev && p.timestamp - prev.timestamp <= MAX_GAP_MS && distance(prev, p) / ((p.timestamp - prev.timestamp) / 1000) > 12) continue;
    result.push(p);
  }
  return result;
}
export function segments(points: Fix[]): Fix[][] {
  const parts: Fix[][] = [];
  for (const p of points) {
    const last = parts.at(-1);
    if (!last || p.timestamp - last.at(-1)!.timestamp > MAX_GAP_MS) parts.push([p]);
    else last.push(p);
  }
  return parts;
}
/** Local projection, appropriate for short hiking segments. */
export function project(point: Coordinate, a: Coordinate, b: Coordinate) {
  const scale = Math.cos(rad(point.latitude));
  const ax = (a.longitude - point.longitude) * scale, ay = a.latitude - point.latitude;
  const bx = (b.longitude - point.longitude) * scale, by = b.latitude - point.latitude;
  const dx = bx - ax, dy = by - ay;
  const fraction = dx * dx + dy * dy === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy)));
  const coordinate = { latitude: a.latitude + (b.latitude - a.latitude) * fraction, longitude: a.longitude + (b.longitude - a.longitude) * fraction };
  return { fraction, coordinate, distance: distance(point, coordinate) };
}
export function nearestOnTrail(point: Coordinate, points: Fix[]) {
  if (!points.length) return null;
  let best = { coordinate: points[0] as Coordinate, distance: distance(point, points[0]) };
  for (const part of segments(points)) for (let i = 1; i < part.length; i++) {
    const candidate = project(point, part[i - 1], part[i]);
    if (candidate.distance < best.distance) best = candidate;
  }
  return best;
}

/** Finite bounds with a minimum span for short or stationary recorded routes. */
export function coordinateBounds(points: Coordinate[]): [number, number, number, number] | null {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const p of points) {
    if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) || Math.abs(p.latitude) > 90 || Math.abs(p.longitude) > 180) continue;
    west = Math.min(west, p.longitude); east = Math.max(east, p.longitude);
    south = Math.min(south, p.latitude); north = Math.max(north, p.latitude);
  }
  if (west === Infinity) return null;
  const dx = Math.max(0, (0.0004 - (east - west)) / 2), dy = Math.max(0, (0.0002 - (north - south)) / 2);
  return [Math.max(-180, west - dx), Math.max(-90, south - dy), Math.min(180, east + dx), Math.min(90, north + dy)];
}
