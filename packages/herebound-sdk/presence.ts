import { metersBetween, validPoint } from './geo';
import type { GamePack, PositionFix } from './types';

export const DISCOVERY_RADIUS_METERS = 5000;
export function freshPosition(fix: PositionFix | null, now: number): fix is PositionFix {
  return !!fix && validPoint(fix) && Number.isFinite(now) && Number.isFinite(fix.timestamp) && fix.timestamp <= now && now - fix.timestamp <= 30_000 &&
    Number.isFinite(fix.accuracy) && fix.accuracy >= 0 && fix.accuracy <= 50 && ['gps', 'simulation'].includes(fix.source);
}
/** Discovery is a platform rule; an individual game's entrance is separate. */
export function gamesNearby(registry: ReadonlyMap<string, GamePack>, fix: PositionFix | null, now: number): GamePack[] {
  if (!freshPosition(fix, now)) return [];
  return [...registry.values()].filter(pack => metersBetween(fix, pack.area.center) + fix.accuracy <= DISCOVERY_RADIUS_METERS)
    .sort((a, b) => metersBetween(fix, a.area.center) - metersBetween(fix, b.area.center));
}
export function canEnter(pack: GamePack, fix: PositionFix | null, now: number, started: boolean): boolean {
  if (!freshPosition(fix, now)) return false;
  const target = started ? pack.area.center : pack.start.position;
  const radius = started ? pack.area.radiusMeters : pack.start.radiusMeters;
  return metersBetween(fix, target) + fix.accuracy <= radius;
}
