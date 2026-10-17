import type { Coordinate } from '../domain/types';
import { parseOsm } from '../domain/discoveries';
/** User-initiated, bounded Overpass read; results are retained locally. */
export async function fetchDiscoveries(center: Coordinate) {
  const { latitude: lat, longitude: lon } = center;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 60.2 || lat > 60.6 || lon < 5.1 || lon > 5.6) throw new Error('Denne første versjonen samler turmål i Bergen og Byfjellene.');
  const area = `(around:3000,${lat.toFixed(5)},${lon.toFixed(5)})`;
  const query = `[out:json][timeout:30];(
way[highway~"^(path|footway|steps)$"]${area};
nwr[natural=peak]${area};
nwr[tourism~"^(viewpoint|alpine_hut|wilderness_hut|picnic_site|attraction)$"]${area};
nwr[amenity=shelter]${area};
nwr[historic~"^(monument|memorial|ruins)$"]${area};
node[natural~"^(spring|water)$"]${area};
);out center geom;`;
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 40_000);
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(query)}`, signal: controller.signal });
    if (!response.ok) throw new Error(response.status === 429 || response.status === 504 ? 'Karttjenesten er opptatt. Prøv igjen litt senere.' : `Kartdata kunne ikke hentes (HTTP ${response.status}).`);
    const text = await response.text();
    if (text.length > 15_000_000) throw new Error('Kartsvaret var for stort. Prøv et mindre tett område.');
    const data = JSON.parse(text);
    if (data.remark) throw new Error('Karttjenesten fikk ikke fullført søket. Prøv igjen senere.');
    return parseOsm(data, Date.now());
  } finally { clearTimeout(timer); }
}
