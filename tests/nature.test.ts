import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNatureTrail, timingReferences } from '../src/domain/nature';
import { natureResults, walkingParts } from '../src/domain/natureTiming';
import { parseNatureMap } from '../src/services/natureMap';
import type { Discovery } from '../src/domain/discoveries';
import type { Fix, Trip } from '../src/domain/types';
const geometry = Array.from({ length: 41 }, (_, i) => ({ latitude: 60 + i * .0001, longitude: 5 }));
const trail: Discovery = { ...geometry[0], id: 'way/1', name: 'Skogstien', kind: 'trail', osmHighway: 'path', surface: 'ground', geometry, fetchedAt: 1, sourceUrl: '' };
const points: Fix[] = geometry.map((p, i) => ({ ...p, timestamp: 100000 + i * 10000, accuracy: 3, altitude: null, altitudeAccuracy: null, speed: 1.1 }));
const trip: Trip = { id: 'walk', name: '', startedAt: 100000, endedAt: 500000, points, ghostId: null, audioEnabled: false, lastCueAt: 0 };
test('nature filter excludes paved paths, city footways, stairs and unknown surfaces without context', () => {
  assert.ok(isNatureTrail(trail));
  for (const surface of ['asphalt', 'paved', 'concrete', 'paving_stones']) assert.equal(isNatureTrail({ ...trail, surface, natureContext: true, sacScale: 'hiking' }), false);
  assert.equal(isNatureTrail({ ...trail, surface: undefined }), false);
  assert.equal(isNatureTrail({ ...trail, surface: undefined, natureContext: true }), true);
  assert.equal(isNatureTrail({ ...trail, osmHighway: 'footway', surface: 'gravel' }), false);
  assert.equal(isNatureTrail({ ...trail, osmHighway: 'footway', surface: 'gravel', natureContext: true }), true);
  assert.equal(isNatureTrail({ ...trail, kind: 'steps', natureContext: true }), false);
});
test('forest context supports named unpaved footways, while asphalt and unrelated city paths remain excluded', () => {
  const ring = [{ lat: 59.99, lon: 4.99 }, { lat: 59.99, lon: 5.01 }, { lat: 60.01, lon: 5.01 }, { lat: 60.01, lon: 4.99 }, { lat: 59.99, lon: 4.99 }];
  const way = (id: number, surface: string) => ({ type: 'way', id, tags: { highway: 'footway', name: 'Skogveien', surface }, geometry: geometry.map(p => ({ lat: p.latitude, lon: p.longitude })) });
  const result = parseNatureMap({ elements: [{ type: 'way', id: 10, tags: { landuse: 'forest' }, geometry: ring }, way(1, 'gravel'), way(2, 'asphalt')] }, 100);
  assert.equal(result.length, 1); assert.equal(result[0].name, 'Skogveien'); assert.equal(result[0].natureContext, true);
});
test('automatic mapped-part timings distinguish directions and reject partial, poor-GPS and fast traversals', async () => {
  const refs = timingReferences([trail], []);
  const result = await natureResults(refs, [trip]);
  assert.equal(result!.length, 1); assert.equal(result![0].direction, 'forward'); assert.ok(result![0].seconds > 370 && result![0].seconds < 400);
  const reverse = { ...trip, id: 'reverse', points: [...points].reverse().map((p, i) => ({ ...p, timestamp: 600000 + i * 10000 })), startedAt: 600000, endedAt: 1000000 };
  const both = await natureResults(refs, [trip, reverse]); assert.equal(both!.length, 2); assert.equal(both![0].direction, 'reverse'); assert.equal(both![0].previousSeconds, null);
  const bad = { ...trip, points: points.map((p, i) => i === 20 ? { ...p, accuracy: 80 } : p) };
  assert.equal(walkingParts(bad).length, 2); assert.equal((await natureResults(refs, [bad]))!.length, 0);
  assert.equal((await natureResults(refs, [{ ...trip, points: points.slice(5) }]))!.length, 0);
  assert.equal((await natureResults(refs, [{ ...trip, points: points.map(p => ({ ...p, speed: 15 })) }]))!.length, 0);
  const changed = timingReferences([{ ...trail, geometry: geometry.map(p => ({ ...p, longitude: p.longitude + .00001 })) }], []);
  assert.notEqual(changed[0].id, refs[0].id);
});
