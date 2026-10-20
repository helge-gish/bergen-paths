import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journeyContext, walkingCommentary } from '../src/domain/commentary';
import { tripMetrics } from '../src/domain/metrics';
import type { Trip } from '../src/domain/types';
const now = 1000000;
const trip: Trip = { id: 'mountain', name: 'Tur', startedAt: 1000, endedAt: null, ghostId: null, audioEnabled: true, lastCueAt: 0, points: [0, 1].map(i => ({ latitude: 60 + i * .0001, longitude: 5.3, timestamp: now - (1-i)*10000, accuracy: 5, altitude: null, altitudeAccuracy: null, speed: 1 })) };
test('commentary uses measured distance/time, varies by slot and omits unknown elevation', () => {
  const metrics = tripMetrics(trip, now);
  assert.match(journeyContext(metrics), /kilometer/);
  assert.doesNotMatch(journeyContext(metrics), /høydemeter/);
  const first = walkingCommentary(trip, metrics, now)!;
  assert.match(first, /16 minutter siden start/);
  assert.notEqual(walkingCommentary(trip, { ...metrics, elapsed: metrics.elapsed + 300000 }, now), first);
});
test('commentary does not fabricate progress without recent GPS or during a short walk', () => {
  const metrics = tripMetrics(trip, now);
  assert.equal(walkingCommentary(trip, metrics, now + 60000), null);
  assert.equal(walkingCommentary(trip, { ...metrics, elapsed: 1000 }, now), null);
  assert.equal(journeyContext({ ...metrics, points: [] }), '');
});
