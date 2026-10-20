import type { Coordinate, Fix } from './types';
import type { Discovery } from './discoveries';
import { bearing, distance, validFix } from './geo';
import { needsDiscoveryName } from './discoveryGroups';
import { shortDistance } from './metrics';
export type ActivePeg = { from: number; atTripStart: boolean; point: Fix | null };
export function activePeg(startedAt: number, from: number | undefined, points: Fix[]): ActivePeg {
  const timestamp = from ?? startedAt;
  return { from: timestamp, atTripStart: timestamp === startedAt, point: points.find(p => p.timestamp >= timestamp && validFix(p)) ?? null };
}
/** A conservative nearby label, looked up only when the fixed peg changes. */
export function pegPlace(point: Coordinate | null, discoveries: Discovery[]): string | null {
  if (!point) return null;
  let closest: Discovery | null = null, meters = 100;
  for (const item of discoveries) {
    if (needsDiscoveryName(item) || Math.abs(item.latitude - point.latitude) > .001 || Math.abs(item.longitude - point.longitude) > .003) continue;
    const d = distance(point, item);
    if (d < meters) { closest = item; meters = d; }
  }
  return closest ? `Nær ${closest.name}` : null;
}
export function pegRelation(point: Coordinate | null, current: Fix | null, now: number): string | null {
  if (!point || !current || !validFix(current) || now - current.timestamp > 30000 || current.timestamp > now + 5000) return null;
  const meters = distance(current, point);
  if (meters < 20) return 'Rett ved deg';
  const direction = ['nord', 'nordøst', 'øst', 'sørøst', 'sør', 'sørvest', 'vest', 'nordvest'][Math.round(bearing(current, point) / 45) % 8];
  return `Ca. ${shortDistance(meters)} ${direction} for deg`;
}
