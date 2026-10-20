import type { Coordinate } from './types';
export type MapPosition = Coordinate & { timestamp: number; accuracy: number };
export function usablePosition(p: MapPosition | null | undefined): p is MapPosition {
  return !!p && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180 && Number.isFinite(p.timestamp) && p.timestamp > 0 && Number.isFinite(p.accuracy) && p.accuracy >= 0 && p.accuracy <= 100;
}
export function latestPosition(...positions: (MapPosition | null | undefined)[]): MapPosition | null {
  return positions.filter(usablePosition).filter(p => p.timestamp <= Date.now() + 5000).sort((a, b) => b.timestamp - a.timestamp)[0] ?? null;
}
export const freshPosition = (p: MapPosition | null, now = Date.now()) => usablePosition(p) && p.timestamp <= now + 5000 && now - p.timestamp <= 30000;
