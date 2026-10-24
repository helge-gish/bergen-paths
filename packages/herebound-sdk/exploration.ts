import type { Account, GamePack, GameProgress, Point } from './types';
import { metersBetween } from './geo';
export const CELL_METERS = 20;
export const REVEAL_METERS = 40;
export function progressFor(account: Account, gameId = account.currentGame): GameProgress | undefined {
  return gameId ? (account.activeMode === 'field' ? account.fieldGames : account.games)?.[gameId] : undefined;
}
function scale(pack: GamePack) { return { lat: 111195, lon: 111195 * Math.cos(pack.area.center.latitude * Math.PI / 180) }; }
export function cellAt(pack: GamePack, point: Point) {
  const s = scale(pack); return { x: Math.floor((point.longitude - pack.area.center.longitude) * s.lon / CELL_METERS), y: Math.floor((point.latitude - pack.area.center.latitude) * s.lat / CELL_METERS) };
}
export function cellPoint(pack: GamePack, x: number, y: number): Point {
  const s = scale(pack); return { latitude: pack.area.center.latitude + y * CELL_METERS / s.lat, longitude: pack.area.center.longitude + x * CELL_METERS / s.lon };
}
export function revealAt(pack: GamePack, progress: GameProgress, point: Point) {
  const center = cellAt(pack, point), revealed = { ...progress.revealed };
  for (let x = center.x - 3; x <= center.x + 3; x++) for (let y = center.y - 3; y <= center.y + 3; y++) {
    const p = cellPoint(pack, x + .5, y + .5);
    if (metersBetween(p, point) <= REVEAL_METERS && metersBetween(p, pack.area.center) <= pack.area.radiusMeters) revealed[`${x},${y}`] = true;
  }
  return revealed;
}
export function isRevealed(pack: GamePack, progress: GameProgress, point: Point) {
  const c = cellAt(pack, point); return !!progress.revealed?.[`${c.x},${c.y}`];
}
/** Disjoint holes avoid ambiguous touching rings. 2 cm borders are imperceptible at walking zoom. */
export function fogFeature(pack: GamePack, revealed: Record<string, true> = {}) {
  const holes = Object.keys(revealed).map(key => {
    const [x, y] = key.split(',').map(Number);
    return [[x+.001,y+.001],[x+.001,y+.999],[x+.999,y+.999],[x+.999,y+.001],[x+.001,y+.001]].map(([cx,cy]) => { const p=cellPoint(pack,cx,cy); return [p.longitude,p.latitude]; });
  });
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [[[-180,-85],[180,-85],[180,85],[-180,85],[-180,-85]], ...holes] } };
}
