import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trailReference } from '../src/domain/trailReference';
import { ghostComparison } from '../src/domain/ghost';
import type { Fix, Trail } from '../src/domain/types';
const p = (timestamp: number, latitude: number): Fix => ({ timestamp, latitude, longitude: 5.34, accuracy: 5, altitude: 100, altitudeAccuracy: 3, speed: 1 });
const trail: Trail = { id: 'saved', tripId: 'parent', name: 'Min sti', createdAt: 999000, points: [p(100000, 60.39), p(120000, 60.3902), p(150000, 60.3902), p(170000, 60.3904)] };
test('saved segment clock starts at its first fix and the ghost keeps its pause', () => {
  const reference = trailReference(trail);
  const live = { ...reference, id: 'new', startedAt: 1000000, endedAt: null, points: [p(1000000, 60.39)] };
  const position = ghostComparison(live, reference, 1035000).position!;
  assert.ok(Math.abs(position.latitude - 60.3902) < 0.000001);
  assert.equal(reference.startedAt, 100000); assert.equal(reference.endedAt, 170000);
  assert.equal(reference.id, 'trail:saved'); assert.deepEqual(trail.points, reference.points);
});
test('a different starting place cannot earn a time advantage against a saved segment', () => {
  const reference = trailReference(trail);
  const live = { ...reference, id: 'new', startedAt: 1000000, endedAt: null, points: [p(1000000, 60.4)] };
  assert.equal(ghostComparison(live, reference, 1035000).gapSeconds, null);
  assert.match(ghostComparison(live, reference, 1035000).reason!, /Start nær samme sted/);
});
