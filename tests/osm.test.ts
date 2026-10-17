import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchStreets } from '../src/services/osm';
const data = { elements: [{ type: 'way', id: 1, tags: { highway: 'residential', name: 'Testgaten' }, geometry: [{ lat: 60.39, lon: 5.34 }, { lat: 60.391, lon: 5.34 }] }] };
test('a temporary Overpass refusal retries and returns a complete street', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return calls === 1 ? new Response('', { status: 429 }) : Response.json(data); });
  const pending = fetchStreets();
  await new Promise(resolve => setImmediate(resolve));
  t.mock.timers.tick(5000);
  const streets = await pending;
  assert.equal(calls, 2); assert.equal(streets[0].name, 'Testgaten'); assert.equal(streets[0].streetEnds?.length, 2);
});
test('a partial Overpass response cannot become a truncated collectible street', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ...data, remark: 'runtime error: Query timed out' }));
  await assert.rejects(fetchStreets(), /ikke fullført hele gatekartet/);
});
test('empty municipality results cannot replace the saved street map', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ elements: [] }));
  await assert.rejects(fetchStreets(), /ingen komplette gater/);
});
test('a permanent server error reports the HTTP code without automatic repeat', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('', { status: 400 }); });
  await assert.rejects(fetchStreets(), /HTTP 400/); assert.equal(calls, 1);
});
