import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activePeg, pegPlace, pegRelation } from '../src/domain/activePeg';
import type { Fix } from '../src/domain/types';
const point = (timestamp: number, latitude = 60): Fix => ({ timestamp, latitude, longitude: 5, accuracy: 4, altitude: null, altitudeAccuracy: null, speed: null });
test('every trip has a peg from start, even while waiting for first GPS', () => {
  assert.deepEqual(activePeg(1000, undefined, []), { from: 1000, atTripStart: true, point: null });
  const first = point(2000);
  assert.equal(activePeg(1000, undefined, [first, point(4000, 60.001)]).point, first);
  assert.equal(activePeg(1000, 1000, [first]).atTripStart, true);
});
test('a moved peg remains at its original GPS point as the walk continues', () => {
  const marked = point(10000, 60.001);
  const points = [point(1000), marked, point(20000, 60.002)];
  assert.equal(activePeg(1000, 10000, points).point, marked);
  assert.equal(activePeg(1000, 10000, [...points, point(30000, 60.003)]).point, marked);
  assert.equal(activePeg(1000, 10000, points).atTripStart, false);
});
test('location labels remain approximate and stale positions never imply current distance', () => {
  const p = point(10000);
  assert.equal(pegRelation(p, point(10000, 60.001), 10000), 'Ca. 110 m sør for deg');
  assert.equal(pegRelation(p, point(10000), 10000), 'Rett ved deg');
  assert.equal(pegRelation(p, point(10000), 50000), null);
  assert.equal(pegPlace(p, [{ ...p, id: '1', name: 'Fjellhytten', kind: 'hut', geometry: [], sourceUrl: '', fetchedAt: 1 }]), 'Nær Fjellhytten');
  assert.equal(pegPlace(p, [{ ...p, latitude: 61, id: '1', name: 'Fjellhytten', kind: 'hut', geometry: [], sourceUrl: '', fetchedAt: 1 }]), null);
});
