import type { Point } from './types';

export const validPoint = (p: unknown): p is Point => !!p && typeof p === 'object' && Number.isFinite((p as Point).latitude) && Math.abs((p as Point).latitude) <= 90 && Number.isFinite((p as Point).longitude) && Math.abs((p as Point).longitude) <= 180;
export function metersBetween(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
