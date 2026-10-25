import { gatekampenCatalogue } from './rules';
import { overpass, streetRegion, type StreetRegion } from '../../src/services/osm';
import type { Discovery } from '../../src/domain/discoveries';
import type { Coordinate } from '../../src/domain/types';
export type Catalogue = { region: StreetRegion; fetchedAt: number; streets: Discovery[] };
export async function loadCatalogue(center: Coordinate): Promise<Catalogue> {
  const region=await streetRegion(center);
  const data=await overpass(`[out:json][timeout:60];way(area:${region.id})[highway~"^(residential|living_street|pedestrian|unclassified|service|tertiary|secondary|primary)$"][name];out geom;`);
  const fetchedAt=Date.now();
  const streets=gatekampenCatalogue(data,fetchedAt,String(region.id));
  if(!streets.length) throw new Error('Fant ingen navngitte gater. Det forrige gatekartet er beholdt.');
  return {region,fetchedAt,streets};
}
