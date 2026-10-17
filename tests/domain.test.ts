import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bearing, cleanPoints, distance, relativeBearing, segments } from '../src/domain/geo';
import { elapsedMs, energyEstimate, tripMetrics } from '../src/domain/metrics';
import { ghostComparison, voiceCue } from '../src/domain/ghost';
import { matchRoute } from '../src/domain/routeMatch';
import { PEAKS, visitedPeaks } from '../src/domain/collections';
import type { Fix, Trip } from '../src/domain/types';

const start = 1_000_000;
function fix(i: number, timestamp = start + i * 10_000, overrides: Partial<Fix> = {}): Fix {
  return { latitude: 60.39 + i * 0.0001, longitude: 5.34, timestamp, accuracy: 4, altitude: 100, altitudeAccuracy: 3, speed: 1.11, ...overrides };
}
function trip(points: Fix[], overrides: Partial<Trip> = {}): Trip {
  return { id: 'trip', name: 'Testtur', startedAt: start, endedAt: null, ghostId: null, audioEnabled: true, lastCueAt: start, points, ...overrides };
}
test('elapsed time includes a long break and survives a missing GPS interval', () => {
  const t = trip([fix(0), fix(1)], { endedAt: start + 3_600_000 });
  assert.equal(elapsedMs(t, start + 9_000_000), 3_600_000);
  assert.equal(tripMetrics(t).elapsed, 3_600_000);
});
test('average speed uses total duration, including stationary time', () => {
  const t = trip([fix(0), fix(1), fix(1, start + 20_000), fix(1, start + 30_000)], { endedAt: start + 30_000 });
  const m = tripMetrics(t);
  assert.ok(m.meters > 10 && m.meters < 12);
  assert.ok(m.averageKmh > 1.2 && m.averageKmh < 1.5);
});
test('bad accuracy, duplicates and impossible teleportation do not add distance', () => {
  const points = [fix(0), fix(0), fix(100, start + 1000), fix(1, start + 10_000, { accuracy: 500 }), fix(2, start + 20_000)];
  assert.equal(cleanPoints(points).length, 2);
  assert.ok(tripMetrics(trip(points), start + 20_000).meters < 25);
});
test('standing GPS jitter does not create a walk or vertical climb', () => {
  const points = Array.from({ length: 20 }, (_, i) => fix(0, start + i * 3000, { latitude: 60.39 + (i % 2 ? 0.000005 : 0), altitude: 100 + i % 3, speed: 0 }));
  const m = tripMetrics(trip(points), start + 60_000);
  assert.equal(m.meters, 0); assert.equal(m.ascent, 0); assert.equal(m.descent, 0);
});
test('missing altitude remains unknown rather than zero elevation gain', () => {
  const m = tripMetrics(trip([fix(0, start, { altitude: null }), fix(1, start + 10_000, { altitudeAccuracy: 100 })]));
  assert.equal(m.hasElevation, false);
});
test('smoothed elevation still records sustained ascent and descent', () => {
  const points = Array.from({ length: 31 }, (_, i) => fix(i, start + i * 10_000, { altitude: 100 + (i <= 15 ? i * 2 : (30 - i) * 2) }));
  const m = tripMetrics(trip(points));
  assert.ok(m.ascent >= 24 && m.ascent <= 30);
  assert.ok(m.descent >= 20 && m.descent <= 30);
});
test('GPS gaps are not connected by invented straight paths or elevation', () => {
  const points = [fix(0), fix(1), fix(100, start + 300_000, { altitude: 400 }), fix(101, start + 310_000, { altitude: 400 })];
  const m = tripMetrics(trip(points), start + 310_000);
  assert.ok(m.meters < 30); assert.equal(m.ascent, 0); assert.equal(segments(m.points).length, 2); assert.equal(m.gapsMs, 290_000);
});
test('negative native speed and stale fixes are not displayed as live speed', () => {
  assert.equal(tripMetrics(trip([fix(0, start, { speed: -1 })]), start + 20_000).speedKmh, null);
});
test('a ghost waits through the original recorded break', () => {
  const ref = trip([fix(0), fix(1), fix(1, start + 40_000), fix(2, start + 50_000)], { endedAt: start + 50_000 });
  const current = trip([fix(0), fix(1), fix(1, start + 20_000)]);
  const comparison = ghostComparison(current, ref, start + 25_000);
  assert.ok(comparison.position);
  assert.ok(distance(comparison.position!, fix(1)) < 0.1);
});
test('same path at faster pace gives a positive gap', () => {
  const ref = trip(Array.from({ length: 10 }, (_, i) => fix(i, start + i * 15_000)), { endedAt: start + 135_000 });
  const current = trip(Array.from({ length: 7 }, (_, i) => fix(i)));
  const comparison = ghostComparison(current, ref, start + 60_000);
  assert.ok(comparison.gapSeconds !== null);
  assert.ok(Math.abs(comparison.gapSeconds! - 30) < 0.5);
});
test('no ghost time advantage is reported for a different start', () => {
  const ref = trip([fix(0), fix(1), fix(2)], { endedAt: start + 20_000 });
  assert.equal(ghostComparison(trip([fix(50), fix(51)]), ref, start + 10_000).gapSeconds, null);
});
test('a single GPS excursion does not create a new route segment', () => {
  const ref = trip(Array.from({ length: 20 }, (_, i) => fix(i)), { endedAt: start + 190_000 });
  const current = trip([fix(0), fix(1), fix(2, start + 20_000, { longitude: 5.341 }), fix(3), fix(4)]);
  assert.equal(matchRoute(current, ref, start + 40_000).deviated, false);
});
test('a sustained detour is recognized, and rejoining cannot erase it', () => {
  const ref = trip(Array.from({ length: 25 }, (_, i) => fix(i)), { endedAt: start + 240_000 });
  const points = Array.from({ length: 11 }, (_, i) => fix(i, start + i * 10_000, { longitude: i >= 3 && i <= 7 ? 5.341 : 5.34 }));
  const current = trip(points);
  const match = matchRoute(current, ref, start + 100_000);
  assert.equal(match.deviated, true); assert.equal(match.state, 'rejoined'); assert.equal(match.newSegments.length, 1);
  assert.ok(match.newSegments[0].endedAt);
  assert.equal(ghostComparison(current, ref, start + 100_000).gapSeconds, null);
});
test('a missing route interval disables whole-trip comparisons after GPS returns', () => {
  const ref = trip(Array.from({ length: 30 }, (_, i) => fix(i)), { endedAt: start + 290_000 });
  const current = trip([fix(0), fix(1), fix(20, start + 200_000), fix(21, start + 210_000)]);
  assert.equal(matchRoute(current, ref, start + 210_000).deviated, true);
  assert.equal(ghostComparison(current, ref, start + 210_000).gapSeconds, null);
});
test('voice updates are opt-in, rate-limited and suppressed for uncertain matches', () => {
  const c = { position: null, gapSeconds: 40, reason: null };
  assert.equal(voiceCue(c, 60_000, 1, true), null);
  assert.equal(voiceCue(c, 61_000, 1, false), null);
  assert.equal(voiceCue({ ...c, gapSeconds: null }, 61_000, 1, true), null);
  assert.match(voiceCue(c, 61_000, 1, true)!, /40 sekunder foran/);
  assert.match(voiceCue({ ...c, gapSeconds: -40 }, 61_000, 1, true)!, /40 sekunder bak/);
});
test('a single point cannot award a summit; accurate sustained visits can', () => {
  const p = PEAKS[0];
  const one = fix(0, start, { latitude: p.latitude, longitude: p.longitude });
  assert.equal(Object.keys(visitedPeaks([trip([one], { endedAt: start + 10_000 })])).length, 0);
  assert.ok(visitedPeaks([trip([one, { ...one, timestamp: start + 15_000 }], { endedAt: start + 15_000 })])[p.id]);
  assert.equal(Object.keys(visitedPeaks([trip([one, { ...one, timestamp: start + 15_000 }])])).length, 0);
});
test('compass bearings wrap correctly across north', () => {
  assert.equal(relativeBearing(5, 355), 10); assert.equal(relativeBearing(355, 5), -10);
  assert.ok(bearing(fix(0), fix(1)) < 0.01);
});
test('energy is unavailable without weight or adequate tracking coverage', () => {
  const t = trip([fix(0), fix(1)], { endedAt: start + 60_000 });
  assert.equal(energyEstimate(t, null), null); assert.equal(energyEstimate(t, 75), null);
});
test('energy includes a lower resting estimate for pauses instead of deleting them', () => {
  const resting = trip(Array.from({ length: 61 }, (_, i) => fix(0, start + i * 10_000, { speed: 0 })), { endedAt: start + 600_000 });
  const moving = trip(Array.from({ length: 61 }, (_, i) => fix(i, start + i * 10_000, { speed: 1.5 })), { endedAt: start + 600_000 });
  const rest = energyEstimate(resting, 75)!, walk = energyEstimate(moving, 75)!;
  assert.ok(rest.low > 0); assert.ok(walk.low > rest.low); assert.ok(walk.high > walk.low);
});
