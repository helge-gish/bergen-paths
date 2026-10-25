import type { Discovery, Progress } from '../../src/domain/discoveries';
import { collectionProgressAsync } from '../../src/domain/discoveries';
import type { Coordinate, Trip } from '../../src/domain/types';
export type Area = { id: string; name: string; center: Coordinate; polygon: Coordinate[] };
const ring = (points: number[][]): Coordinate[] => points.map(([latitude, longitude]) => ({ latitude, longitude }));
/** Editorial test boundaries, not claims about official borough boundaries. */
export const areas: Area[] = [
  { id: 'nordnes-v1', name: 'Nordnes', center: { latitude: 60.399, longitude: 5.311 }, polygon: ring([[60.3946,5.3103],[60.4007,5.2985],[60.4061,5.3005],[60.405,5.3133],[60.3985,5.322],[60.3946,5.3103]]) },
  { id: 'sandviken-v1', name: 'Sandviken', center: { latitude: 60.407, longitude: 5.325 }, polygon: ring([[60.3995,5.318],[60.411,5.302],[60.422,5.308],[60.423,5.327],[60.409,5.342],[60.4,5.337],[60.3995,5.318]]) },
  { id: 'sentrum-v1', name: 'Bergen sentrum', center: { latitude: 60.391, longitude: 5.326 }, polygon: ring([[60.382,5.319],[60.3946,5.31],[60.3995,5.318],[60.4,5.337],[60.389,5.343],[60.382,5.332],[60.382,5.319]]) },
];
export function inside(p: Coordinate, polygon: Coordinate[]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.latitude > p.latitude) !== (b.latitude > p.latitude) && p.longitude < (b.longitude-a.longitude)*(p.latitude-a.latitude)/(b.latitude-a.latitude)+a.longitude) result = !result;
  }
  return result;
}
const cross = (a: Coordinate,b: Coordinate,c: Coordinate) => (b.longitude-a.longitude)*(c.latitude-a.latitude)-(b.latitude-a.latitude)*(c.longitude-a.longitude);
function intersects(a: Coordinate,b: Coordinate,c: Coordinate,d: Coordinate) {
  const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
  return abC*abD <= 0 && cdA*cdB <= 0 && Math.max(a.latitude,b.latitude)>=Math.min(c.latitude,d.latitude) && Math.max(c.latitude,d.latitude)>=Math.min(a.latitude,b.latitude) && Math.max(a.longitude,b.longitude)>=Math.min(c.longitude,d.longitude) && Math.max(c.longitude,d.longitude)>=Math.min(a.longitude,b.longitude);
}
/** Select, never clip. A street touching two areas can count in both. */
export function areaStreets(streets: Discovery[], area: Area) {
  return streets.filter(s => s.kind === 'street' && (s.streetPaths ?? [s.geometry]).some(path => path.some(p=>inside(p,area.polygon)) || path.slice(1).some((b,i)=>area.polygon.slice(1).some((d,j)=>intersects(path[i],b,area.polygon[j],d)))));
}
export function combineProgress(results: Record<string, Progress>[]): Record<string, Progress> {
  const combined: Record<string, Progress> = {};
  for (const result of results) for (const [id,p] of Object.entries(result)) {
    const old=combined[id];
    if (!old || (p.collected && (!old.collected || p.firstVisit! < old.firstVisit!)) || (!p.collected && !old.collected && p.fraction>old.fraction)) combined[id]=p;
  }
  return combined;
}
/** Closed walks are cached; only the active walk is rechecked. Cooperative
 * Tråkk analysis yields to touches. Never union partial coverage across walks. */
export class StreetAnalysis {
  private catalogue: Discovery[] | null = null;
  private cache = new Map<string, Record<string, Progress>>();
  async run(streets: Discovery[], trips: Trip[], cancelled: ()=>boolean) {
    if (this.catalogue !== streets) { this.cache.clear(); this.catalogue=streets; }
    const results: Record<string,Progress>[]=[];
    for (const trip of trips) {
      if(cancelled()) return null;
      const key=`${trip.id}:${trip.endedAt}:${trip.points.length}`;
      const snapshot=trip.endedAt===null ? {...trip,endedAt:trip.points.at(-1)?.timestamp ?? trip.startedAt} : trip;
      const result=this.cache.get(key) ?? await collectionProgressAsync(streets,[snapshot],cancelled);
      if(!result) return null;
      if(trip.endedAt!==null) this.cache.set(key,result);
      results.push(result);
    }
    return combineProgress(results);
  }
}
export type Hunt = { id: string; title: string; clue: string; hint: string; streetName: string; areaId: string };
/** Text pilot. Actual photos require a reviewed, licensed photo collection. */
export const hunts: Hunt[] = [
  {id:'nordnes-akvariet',title:'Mot fiskene',clue:'Finn gaten med navn etter byen, på halvøyen der Akvariet ligger.',hint:'Navnet begynner med Nordnes.',streetName:'Nordnesgaten',areaId:'nordnes-v1'},
  {id:'nordnes-verksted',title:'Håndverk i gatenavnet',clue:'Her skjuler et sted der ting blir laget eller reparert seg i navnet.',hint:'Begynner på Verft.',streetName:'Verftsgaten',areaId:'nordnes-v1'},
  {id:'nordnes-kloster',title:'Et gammelt kloster',clue:'Et religiøst fellesskap har satt spor i gatenavnet.',hint:'Kloster…',streetName:'Klostergaten',areaId:'nordnes-v1'},
  {id:'sandviken-gjeble',title:'Biskopens gate',clue:'Gaten bærer navnet til Bergens første lutherske biskop.',hint:'Fornavnet er Gjeble.',streetName:'Gjeble Pedersens gate',areaId:'sandviken-v1'},
  {id:'sandviken-absalon',title:'Forfatteren i Sandviken',clue:'En prest, lærer og forfatter fra 1500-tallet har gitt navn til denne gaten.',hint:'Absalon er fornavnet.',streetName:'Absalon Beyers gate',areaId:'sandviken-v1'},
];
export function huntSolved(hunt: Hunt, streets: Discovery[], progress: Record<string,Progress>, since: number) {
  // A previous walk doesn't solve a newly opened hunt. Caller evaluates only
  // eligible walks, so earlier collection awards cannot hide a new completion.
  return streets.some(s=>s.name.toLocaleLowerCase('nb')===hunt.streetName.toLocaleLowerCase('nb') && progress[s.id]?.collected && progress[s.id].firstVisit!>=since);
}
