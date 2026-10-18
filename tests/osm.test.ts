import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchStreets, fetchDiscoveries, streetRegion, searchPlaces } from '../src/services/osm';
const data = { elements: [{ type: 'way', id: 1, tags: { highway: 'residential', name: 'Testgaten' }, geometry: [{ lat: 60.39, lon: 5.34 }, { lat: 60.391, lon: 5.34 }] }] };
test('a temporary Overpass refusal retries and returns a complete street', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return calls === 1 ? new Response('', { status: 429 }) : Response.json(data); });
  const pending = fetchStreets({ id: 3600000001, name: 'Testområde' });
  await new Promise(resolve => setImmediate(resolve));
  t.mock.timers.tick(5000);
  const streets = await pending;
  assert.equal(calls, 2); assert.equal(streets[0].name, 'Testgaten'); assert.equal(streets[0].streetEnds?.length, 2);
});
test('a partial Overpass response cannot become a truncated collectible street', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ...data, remark: 'runtime error: Query timed out' }));
  await assert.rejects(fetchStreets({ id: 3600000001, name: 'Testområde' }), /ikke fullført hele gatekartet/);
});
test('an area without named streets is valid and does not erase other areas', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ elements: [] }));
  assert.deepEqual(await fetchStreets({ id: 3600000001, name: 'Testområde' }), []);
});
test('a permanent server error reports the HTTP code without automatic repeat', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('', { status: 400 }); });
  await assert.rejects(fetchStreets({ id: 3600000001, name: 'Testområde' }), /HTTP 400/); assert.equal(calls, 1);
});

test('discoveries work outside Bergen and reject invalid coordinates before any request', async t => {
  let query = '';
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => { query = decodeURIComponent(String(init.body)); return Response.json({ elements: [] }); });
  await fetchDiscoveries({ latitude: -33.86, longitude: 151.2 });
  assert.match(query, /-33.86000,151.20000/);
  await assert.rejects(fetchDiscoveries({ latitude: NaN, longitude: 0 }), /gyldig/);
});
test('street boundary resolution selects a local administrative area without a city name', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ elements: [
    { type: 'area', id: 3600000001, tags: { admin_level: '6', name: 'Region' } },
    { type: 'area', id: 3600000002, tags: { admin_level: '8', name: 'Village' } },
  ] }));
  assert.deepEqual(await streetRegion({ latitude: 45, longitude: 7 }), { id: 3600000002, name: 'Village' });
});
test('place names are quoted as literal Overpass values', async t => {
  let query = '';
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => { query = new URLSearchParams(String(init.body)).get('data')!; return Response.json({ elements: [] }); });
  await searchPlaces('City";out;');
  assert.ok(query.includes('[name=' + JSON.stringify('City";out;') + ']'));
});
