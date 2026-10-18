/** Integration check: public map data only; no user tracks or credentials. */
import { fetchDiscoveries, fetchPeaks, fetchStreets, streetRegion, searchPlaces } from '../src/services/osm';
import { bergenGoal } from '../src/domain/goals';
import assert from 'node:assert/strict';
async function main() {
  const center = { latitude: 60.63, longitude: 6.42 };
  const places = await searchPlaces('Voss');
  assert.ok(places.some(p => Math.abs(p.latitude - center.latitude) < .1 && Math.abs(p.longitude - center.longitude) < .1), 'Voss place search');
  const discoveries = await fetchDiscoveries(center, 1000);
  assert.ok(discoveries.length > 0, 'Discoveries outside former Bergen bounds');
  const region = await streetRegion(center);
  const streets = await fetchStreets(region);
  assert.ok(streets.length > 0 && streets.every(s => s.id.startsWith(`street/${region.id}/`)), 'Scoped complete streets outside Bergen');
  const peaks = await fetchPeaks({ latitude: 60.383, longitude: 5.32 }, 6500);
  const goal = bergenGoal(peaks);
  assert.ok(goal?.targets.length === 7, `Expected seven curated peaks; found: ${peaks.map(p => p.name).join(', ')}`);
  console.log(`PASS: Voss search, ${discoveries.length} discoveries outside Bergen, ${streets.length} streets in ${region.name}, all seven curated peaks`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
