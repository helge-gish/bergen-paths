import type { HomeArea } from './areas';
import type { Discovery, Progress } from './discoveries';
import { needsDiscoveryName } from './discoveryGroups';
import { distance, project } from './geo';
import { tripMetrics } from './metrics';
import type { Coordinate, Trip } from './types';

const title = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, 80);
const unique = (names: string[]) => [...new Map(names.filter(Boolean).map(n => [title(n).toLocaleLowerCase('nb-NO'), title(n)])).values()].slice(0, 4);
const named = (item: Discovery) => !!item.name.trim() && !needsDiscoveryName(item) && (!item.unnamed || !!item.localName);
export function defaultTripName(time: number) {
  const date = new Date(time), hour = date.getHours();
  const period = hour >= 5 && hour < 10 ? 'Morgentur' : hour < 17 && hour >= 10 ? 'Dagstur' : hour >= 17 && hour < 23 ? 'Kveldstur' : 'Nattur';
  return `${period} · ${date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' })}`;
}
function inside(area: HomeArea | null, points: Coordinate[]) {
  return area && area.name.trim() && points.length > 0 && points.every(p => distance(p, area) <= area.radius);
}

/** Cached map data only. Yield while scanning large areas; never delay GPS startup. */
export async function startTripNames({ time, position, items, area, reference }: { time: number; position: Coordinate | null; items: Discovery[]; area: HomeArea | null; reference: Trip | null }, cancelled: () => boolean = () => false): Promise<string[] | null> {
  let closest: Discovery | null = null, best = 40, work = 0;
  if (position) for (const item of items) {
    if (++work % 128 === 0) { await new Promise(r => setTimeout(r, 0)); if (cancelled()) return null; }
    if (!named(item)) continue;
    const paths = item.streetPaths ?? [item.geometry];
    let d = paths.some(path => path.length > 1) ? Infinity : distance(position, item);
    for (const path of paths) for (let i = 1; i < path.length; i++) {
      if (++work % 128 === 0) { await new Promise(r => setTimeout(r, 0)); if (cancelled()) return null; }
      d = Math.min(d, project(position, path[i - 1], path[i]).distance);
    }
    if (d < best) { closest = item; best = d; }
  }
  if (cancelled()) return null;
  return unique([
    reference ? `På nytt: ${reference.name.replace(/^På nytt: /, '')}` : '',
    closest ? `Tur fra ${closest.name}` : '',
    position && inside(area, [position]) ? `Tur ved ${area!.name}` : '',
    defaultTripName(time),
  ]);
}

/** Progress must come from this trip alone, including places visited on earlier trips. */
export function completedTripNames(trip: Trip, items: Discovery[], progress: Record<string, Progress>, area: HomeArea | null): string[] {
  const meaningful = items.filter(item => {
    if (!named(item)) return false;
    const p = progress[item.id];
    return p?.collected || (item.kind === 'street' && p?.fraction >= .5 && (p.streetCheck?.coveredMeters ?? 0) >= 20);
  });
  // One logical name even if OSM split the route into multiple objects.
  const sorted = [...meaningful].sort((a, b) => {
    const weight = (i: Discovery) => ({ peak: 6, hut: 5, viewpoint: 4, landmark: 3, trail: 2, steps: 1, street: 0, water: 1, picnic: 1 }[i.kind]);
    return weight(b) - weight(a) || (progress[b.id]?.streetCheck?.coveredMeters ?? 0) - (progress[a.id]?.streetCheck?.coveredMeters ?? 0) || a.name.localeCompare(b.name, 'nb-NO');
  });
  const seen = new Set<string>(), places = sorted.filter(i => { const key = i.name.trim().toLocaleLowerCase('nb-NO'); if (seen.has(key)) return false; seen.add(key); return true; });
  const first = places[0], second = places[1];
  const metrics = tripMetrics(trip);
  const names: string[] = [];
  if (first) {
    const route = ['street', 'trail', 'steps'].includes(first.kind);
    if (!route) names.push(`Tur til ${first.name}`);
    if (second && `${first.name} og ${second.name}`.length <= 80) names.push(`${first.name} og ${second.name}`);
    if (route) names.push(`Langs ${first.name}`);
  }
  if (inside(area, metrics.points)) names.push(`Tur ved ${area!.name}`);
  if (metrics.meters >= 100) names.push(`${(metrics.meters / 1000).toLocaleString('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km til fots`);
  names.push(defaultTripName(trip.startedAt));
  return unique(names);
}
