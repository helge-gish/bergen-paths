import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionProgress, parseOsm, type Discovery } from '../src/domain/discoveries';
import type { Fix, Trip } from '../src/domain/types';
const point = (i: number): Fix => ({ latitude: 60.39 + i * 0.0001, longitude: 5.34, timestamp: 1000 + i * 10_000, accuracy: 5, altitude: 100, altitudeAccuracy: 3, speed: 1 });
const trip = (points: Fix[], id = 'a'): Trip => ({ id, name: id, startedAt: 1000, endedAt: 150_000, points, ghostId: null, audioEnabled: false, lastCueAt: 0 });
const trail: Discovery = { id: 'way/1', kind: 'trail', name: 'Teststi', latitude: 60.39, longitude: 5.34, geometry: [point(0), point(10)], sourceUrl: 'https://www.openstreetmap.org/way/1', fetchedAt: 1 };
test('walking a small part of a mapped trail does not collect the whole trail', () => {
  const progress = collectionProgress([trail], [trip([point(0), point(1), point(2)])])[trail.id];
  assert.equal(progress.collected, false); assert.ok(progress.fraction < 0.5);
});
test('trail coverage accumulates over multiple hikes', () => {
  const first = trip(Array.from({ length: 6 }, (_, i) => point(i)));
  const second = trip(Array.from({ length: 6 }, (_, i) => point(i + 5)), 'b');
  assert.equal(collectionProgress([trail], [first])[trail.id].collected, false);
  assert.equal(collectionProgress([trail], [first, second])[trail.id].collected, true);
});
test('parallel trails are not collected from a distant GPS track', () => {
  const points = Array.from({ length: 11 }, (_, i) => ({ ...point(i), longitude: 5.341 }));
  assert.equal(collectionProgress([trail], [trip(points)])[trail.id].fraction, 0);
});
test('dense OSM nodes do not exaggerate the walked fraction of a trail', () => {
  const dense = { ...trail, geometry: [...Array.from({ length: 100 }, (_, i) => ({ ...point(0), latitude: point(0).latitude + i * 0.000001 })), point(20)] };
  const partial = trip([point(0), point(1), point(2)]);
  const result = collectionProgress([dense], [partial])[trail.id];
  assert.equal(result.collected, false);
  assert.ok(result.fraction < 0.3);
});
test('a GPS gap cannot award an unwalked connecting trail', () => {
  const points = [point(0), { ...point(10), timestamp: 200_000 }];
  assert.equal(collectionProgress([trail], [trip(points)])[trail.id].collected, false);
});
test('OSM landmarks require a sustained visit', () => {
  const target: Discovery = { ...trail, id: 'node/2', kind: 'viewpoint' };
  assert.equal(collectionProgress([target], [trip([point(0)])])[target.id].collected, false);
  assert.equal(collectionProgress([target], [trip([point(0), point(1)])])[target.id].collected, true);
});
test('OSM parsing preserves identity and source, skips private access and invalid data', () => {
  const result = parseOsm({ elements: [
    { type: 'node', id: 1, lat: 60.39, lon: 5.34, tags: { tourism: 'viewpoint', name: 'Utsikten' } },
    { type: 'node', id: 2, lat: 60.39, lon: 5.34, tags: { tourism: 'wilderness_hut', access: 'private' } },
    { type: 'way', id: 3, geometry: [{ lat: 60.39, lon: 5.34 }, { lat: 60.391, lon: 5.34 }], tags: { highway: 'path', name: 'Stien' } },
    { type: 'node', id: 4, tags: { natural: 'peak' } },
  ] }, 100);
  assert.equal(result.length, 2); assert.equal(result[0].id, 'node/1'); assert.equal(result[0].sourceUrl, 'https://www.openstreetmap.org/node/1');
  assert.equal(result[1].geometry.length, 2); assert.equal(result[1].kind, 'trail');
});

test('named pedestrian streets and sidewalks do not become duplicate trail awards', () => {
  const way = (id: number, tags: Record<string,string>) => ({ type: 'way', id, tags, geometry: [{ lat: 60.39, lon: 5.34 }, { lat: 60.391, lon: 5.34 }] });
  const result = parseOsm({ elements: [
    way(10, { highway: 'footway', name: 'Gutenbergsveien' }),
    way(11, { highway: 'steps', name: 'Gutenbergsveien' }),
    way(12, { highway: 'footway', footway: 'sidewalk' }),
    way(13, { highway: 'footway', footway: 'crossing' }),
    way(14, { highway: 'path', name: 'Skogsstien' }),
  ] }, 1);
  assert.deepEqual(result.map(i => i.id), ['way/14']);
  assert.equal(result[0].osmHighway, 'path');
});

test('an unnamed stair flight is a stair target and requires full traversal', () => {
  const items = parseOsm({ elements: [{type:'way',id:77,tags:{highway:'steps'},geometry:[{lat:point(0).latitude,lon:point(0).longitude},{lat:point(10).latitude,lon:point(10).longitude}]}] },1);
  assert.equal(items[0].kind,'steps');
  assert.equal(collectionProgress(items,[trip([point(0),point(1)])])[items[0].id].collected,false);
  assert.equal(collectionProgress(items,[trip(Array.from({length:11},(_,i)=>point(i)))])[items[0].id].collected,true);
});
