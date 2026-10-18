import { parseStreets } from '../domain/streets';
import type { Coordinate } from '../domain/types';
import { parseOsm } from '../domain/discoveries';

export function validCenter(center: Coordinate) {
  if (!Number.isFinite(center.latitude) || !Number.isFinite(center.longitude) || Math.abs(center.latitude) > 90 || Math.abs(center.longitude) > 180) throw new Error('Velg en gyldig posisjon.');
}
export async function overpass(query: string): Promise<{ elements: any[] }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 75_000);
    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Trakk/0.3.0 (https://github.com/helge-gish/bergen-paths)' }, body: `data=${encodeURIComponent(query)}`, signal: controller.signal });
      if (!response.ok) {
        if ([429, 502, 503, 504].includes(response.status) && attempt < 2) { await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 5000)); continue; }
        throw new Error(`Kartdata kunne ikke hentes (HTTP ${response.status}). Prøv igjen senere.`);
      }
      const text = await response.text();
      if (text.length > 25_000_000) throw new Error('Kartsvaret er for stort. Velg et mindre område.');
      const data = JSON.parse(text);
      if (data.remark) throw new Error('Karttjenesten fikk ikke fullført hele gatekartet / områdesøket. Prøv igjen senere.');
      if (!Array.isArray(data.elements)) throw new Error('Uventet svar fra kartkilden.');
      return data;
    } finally { clearTimeout(timer); }
  }
  throw new Error('Karttjenesten svarer ikke.');
}
export async function fetchDiscoveries(center: Coordinate, radius = 3000) {
  validCenter(center);
  if (!Number.isFinite(radius) || radius < 100 || radius > 15000) throw new Error('Velg et område mellom 100 m og 15 km.');
  const area = `(around:${Math.round(radius)},${center.latitude.toFixed(5)},${center.longitude.toFixed(5)})`;
  const data = await overpass(`[out:json][timeout:60];(
way[highway~"^(path|footway|steps)$"]${area};
nwr[natural=peak]${area};
nwr[tourism~"^(viewpoint|alpine_hut|wilderness_hut|picnic_site|attraction)$"]${area};
nwr[amenity=shelter]${area};
nwr[historic~"^(monument|memorial|ruins)$"]${area};
node[natural~"^(spring|water)$"]${area};
);out center geom;`);
  return parseOsm(data, Date.now());
}
export async function fetchPeaks(center: Coordinate, radius: number) {
  validCenter(center);
  if (!Number.isFinite(radius) || radius < 100 || radius > 15000) throw new Error('Ugyldig søkeradius.');
  return parseOsm(await overpass(`[out:json][timeout:30];nwr[natural=peak](around:${Math.round(radius)},${center.latitude.toFixed(5)},${center.longitude.toFixed(5)});out center geom;`), Date.now());
}
export type StreetRegion = { id: number; name: string };
export async function streetRegion(center: Coordinate): Promise<StreetRegion> {
  validCenter(center);
  const data = await overpass(`[out:json][timeout:30];is_in(${center.latitude.toFixed(5)},${center.longitude.toFixed(5)})->.a;area.a[boundary=administrative][admin_level~"^(6|7|8)$"];out tags;`);
  const candidates = data.elements.filter(e => e.type === 'area' && Number.isSafeInteger(e.id) && e.id > 0 && /^[678]$/.test(e.tags?.admin_level)).sort((a, b) => Number(b.tags.admin_level) - Number(a.tags.admin_level) || a.id - b.id);
  if (!candidates.length) throw new Error('Fant ingen egnet områdegrense for hele gater her. Stier og steder kan fortsatt samles.');
  return { id: candidates[0].id, name: candidates[0].tags.name ?? 'Lokalt område' };
}
/** Whole ways across an administrative area. Never turn a radius-clipped street into a completion target. */
export async function fetchStreets(region: StreetRegion) {
  if (!Number.isSafeInteger(region.id) || region.id <= 0) throw new Error('Ugyldig gateområde.');
  const data = await overpass(`[out:json][timeout:60];way(area:${region.id})[highway~"^(residential|living_street|pedestrian|footway|steps|unclassified|service|tertiary|secondary|primary)$"][name];out geom;`);
  return parseStreets(data, Date.now(), String(region.id));
}
export type Place = Coordinate & { id: string; name: string; label: string };
export async function searchPlaces(name: string): Promise<Place[]> {
  const value = name.trim();
  if (value.length < 2 || value.length > 80) throw new Error('Skriv et stedsnavn på 2–80 tegn.');
  const quoted = JSON.stringify(value);
  const alias = JSON.stringify(`(^|;)${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(;|$)`);
  const places = '[place~"^(city|town|village|hamlet|suburb|neighbourhood)$"]';
  const data = await overpass(`[out:json][timeout:30];(node${places}[name=${quoted}];node${places}["name:nb"=${quoted}];node${places}[alt_name~${alias},i];rel[boundary=administrative][admin_level~"^(6|7|8)$"][name=${quoted}];);out center 30;`);
  return data.elements.flatMap(e => {
    const latitude = e.lat ?? e.center?.lat, longitude = e.lon ?? e.center?.lon;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    return [{ id: `${e.type}/${e.id}`, name: e.tags?.name ?? value, label: [e.tags?.name ?? value, e.tags?.['is_in:country'], e.tags?.is_in, `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`].filter(Boolean).join(' · '), latitude, longitude }];
  });
}
