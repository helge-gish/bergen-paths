import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaGoals, goalProgress, bergenGoal } from '../src/domain/goals';
import { tripTiles, mergeDiscoveries, inArea } from '../src/domain/areas';
import { achievements } from '../src/domain/achievements';
import { parseStreets } from '../src/domain/streets';
import { collectionProgress, type Discovery } from '../src/domain/discoveries';
import type { Trip, Fix } from '../src/domain/types';
const p: Fix = { latitude: 48.85, longitude: 2.35, timestamp: 10000, accuracy: 3, altitude: 10, altitudeAccuracy: 2, speed: 1 };
const trip: Trip = { id: 'one', name: 'Tur', startedAt: 10000, endedAt: 40000, ghostId: null, audioEnabled: false, lastCueAt: 0, points: [p, { ...p, timestamp: 25000 }] };
const item: Discovery = { id: 'node/1', name: 'Utsikt', kind: 'viewpoint', latitude: p.latitude, longitude: p.longitude, geometry: [], sourceUrl: '', fetchedAt: 1 };
const area = { ...p, name: 'Paris', radius: 3000 };
test('one trip awards every visited category, with identical results in normal and ghost mode', () => {
  const items = ['peak', 'hut', 'landmark', 'viewpoint', 'picnic', 'water'].map((kind, n) => ({ ...item, id: String(n), kind } as Discovery));
  const normal = collectionProgress(items, [trip]);
  const ghost = collectionProgress(items, [{ ...trip, mode: 'ghost', ghostId: 'friend' }]);
  assert.deepEqual(normal, ghost);
  assert.equal(Object.values(normal).filter(p => p.collected).length, 6);
});
test('goal activation does not gate retroactive awards; goal IDs and membership stay stable', () => {
  const goals = areaGoals(area, [item], 1);
  assert.equal(goalProgress(goals[0], [trip]).complete, true);
  assert.equal(goals[0].id, areaGoals({ ...area, name: 'Nytt visningsnavn' }, [item], 2)[0].id);
  const expanded = areaGoals(area, [item, { ...item, id: 'node/2' }], 3);
  assert.notEqual(goals[0].id, expanded[0].id);
  assert.equal(goals[0].targets.length, 1);
  assert.equal(goalProgress(goals[0], []).complete, false);
});
test('foreign peaks with a Bergen name cannot satisfy the curated goal', () => {
  assert.equal(bergenGoal([{ ...item, kind: 'peak', name: 'Ulriken' }]), null);
});
test('a line crossing the selected area belongs even with both endpoints outside', () => {
  assert.equal(inArea({ ...item, latitude: 0, longitude: 0, geometry: [{ latitude: 48.85, longitude: 2 }, { latitude: 48.85, longitude: 3 }] }, area), true);
});
test('same street names in different areas retain different identities', () => {
  const data = { elements: [{ type: 'way', id: 1, tags: { name: 'Storgata', highway: 'residential' }, geometry: [{ lat: 48.85, lon: 2.35 }, { lat: 48.851, lon: 2.35 }] }] };
  const one = parseStreets(data, 1, 'area1'), two = parseStreets(data, 1, 'area2');
  assert.notEqual(one[0].id, two[0].id);
  assert.equal(mergeDiscoveries(one, two).length, 2);
  assert.equal(mergeDiscoveries(parseStreets(data, 1), one).length, 1);
});
test('automatic survey covers all finished trips across countries, including ghosts', () => {
  const second = { ...trip, id: 'two', ghostId: 'friend', points: trip.points.map(p => ({ ...p, latitude: -33.86, longitude: 151.2 })) };
  assert.equal(tripTiles([trip, second]).length, 2);
  assert.equal(tripTiles([{ ...trip, endedAt: null }]).length, 0);
});
test('avatar milestones are deterministic and recalculate when evidence is deleted', () => {
  const first = achievements([], 5), again = achievements([], 5);
  assert.deepEqual(first, again);
  assert.equal(first.xp, 300); assert.equal(first.level, 2);
  assert.equal(achievements([], 0).level, 1);
  assert.equal(achievements([{ ...trip, endedAt: null }], 0).totals.meters, 0);
  assert.equal(achievements([], 50).equipment.filter(e => e.level <= achievements([], 50).level).some(e => e.name === 'Ryggsekk'), true);
});
test('distance and ascent totals unlock milestones across trips but exclude unfinished tracks', () => {
  const points = Array.from({ length: 121 }, (_, i) => ({ ...p, latitude: p.latitude + i * .0001, timestamp: p.timestamp + i * 10000, altitude: 10 + i * 2 }));
  const walk = { ...trip, points, endedAt: points.at(-1)!.timestamp };
  const result = achievements([walk], 0);
  assert.ok(result.totals.meters > 1000);
  assert.ok(result.totals.ascent >= 100);
  assert.ok(result.milestones.find(m => m.id === 'distance-1')?.earned);
  assert.ok(result.milestones.find(m => m.id === 'ascent-100')?.earned);
  assert.equal(achievements([{ ...walk, endedAt: null }], 0).xp, 0);
});
