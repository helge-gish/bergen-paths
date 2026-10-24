import { test } from 'node:test';
import assert from 'node:assert/strict';
import { natureProgress } from '../src/domain/natureProgress';
import type { Discovery } from '../src/domain/discoveries';
import type { Fix, Trip } from '../src/domain/types';
const points: Fix[] = Array.from({ length: 31 }, (_, i) => ({ latitude: 60 + i * .0001, longitude: 5, timestamp: 100000 + i * 10000, accuracy: 3, altitude: null, altitudeAccuracy: null, speed: 1.1 }));
const item: Discovery = { ...points[0], id: 'forest', name: 'Skogsti', kind: 'trail', osmHighway: 'path', surface: 'ground', geometry: points, fetchedAt: 1, sourceUrl: '' };
const trip: Trip = { id: 'one', name: '', startedAt: 100000, endedAt: 400000, points, ghostId: null, audioEnabled: false, lastCueAt: 0 };
test('trail coverage includes active visits and partial visits across recordings without requiring a timed full traverse', async () => {
  const first = { ...trip, points: points.slice(0, 15) };
  const partial = (await natureProgress([item], [first], null))![item.id];
  assert.equal(partial.collected, false); assert.ok(partial.fraction > .3);
  const later = { ...trip, id: 'two', endedAt: null, points: points.slice(14) };
  assert.equal((await natureProgress([item], [first], later))![item.id].collected, true);
  const short = { ...item, geometry: points.slice(0, 3) };
  assert.equal((await natureProgress([short], [], { ...trip, endedAt: null }))![item.id].collected, true);
});
test('coverage does not credit driving, poor GPS, disconnected missing parts or canceled work', async () => {
  for (const track of [{ ...trip, points: points.map(p => ({ ...p, speed: 20 })) }, { ...trip, points: points.map(p => ({ ...p, accuracy: 90 })) }]) {
    assert.equal((await natureProgress([item], [track], null))![item.id].collected, false);
  }
  const split = { ...item, streetPaths: [points, points.map(p => ({ ...p, longitude: 5.01 }))] };
  assert.equal((await natureProgress([split], [trip], null))![item.id].collected, false);
  assert.equal(await natureProgress([item], [trip], null, () => true), null);
});
