import type { HomeArea } from './areas';
import { inArea } from './areas';
import { distance } from './geo';
import { isNatureTrail } from './nature';
import { neighborhoodRouteRows } from './neighborhood';
import type { Discovery, Progress } from './discoveries';
import type { Coordinate } from './types';
export const NATURE_RADIUS = 5000;
/** Hold the activated area steady while exploring; a new location outside it
 * requires explicit approval before activating a new area. */
export function natureArea(previous: HomeArea | null, position: Coordinate | null): HomeArea | null {
  if (!position || !Number.isFinite(position.latitude) || !Number.isFinite(position.longitude) || Math.abs(position.latitude) > 90 || Math.abs(position.longitude) > 180) return previous;
  if (previous && previous.radius === NATURE_RADIUS) return previous;
  return { latitude: position.latitude, longitude: position.longitude, radius: NATURE_RADIUS, name: 'Nærområdet' };
}
export function areaNatureTrails(items: Discovery[], area: HomeArea | null): Discovery[] {
  return area ? [...new Map(items.filter(item => isNatureTrail(item) && inArea(item, area)).map(item => [item.id, item])).values()] : [];
}
export const AREA_CHANGE_DISTANCE = 25000;
export function needsAreaConsent(area: HomeArea | null, position: Coordinate): boolean {
  return !!area && Number.isFinite(position.latitude) && Number.isFinite(position.longitude) && distance(area, position) > AREA_CHANGE_DISTANCE;
}
export function natureVisitSummary(items: Discovery[], progress: Record<string, Progress>) {
  const rows = neighborhoodRouteRows(items.filter(isNatureTrail), 'trail');
  const visits = rows.map(row => ({ ...row, complete: row.members.every(item => progress[item.id]?.collected), visited: row.members.some(item => (progress[item.id]?.fraction ?? 0) > 0), firstVisit: Math.min(...row.members.flatMap(item => progress[item.id]?.firstVisit ? [progress[item.id].firstVisit!] : [])) }));
  return { walked: visits.filter(row => row.complete).length, total: visits.length, visits: visits.filter(row => row.visited).sort((a, b) => b.firstVisit - a.firstVisit) };
}
