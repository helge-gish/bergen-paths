import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tourResult, type TourResult } from '../src/domain/tourMedals';
import { trailActivity, timingReferences, type TrailActivity } from '../src/domain/trailActivity';
import type { Trip, Fix } from '../src/domain/types';

const fix = (i: number, start: number): Fix => ({ latitude: 60 + i * .0001, longitude: 5, timestamp: start + i * 10000, accuracy: 3, speed: 1.1, altitude: i * 2, altitudeAccuracy: 3 });
const trip = (id: string, length = 40, start = 1000): Trip => ({ id, name: id, points: Array.from({ length: length + 1 }, (_, i) => fix(i, start)), startedAt: start, endedAt: start + length * 10000, ghostId: null, audioEnabled: true, lastCueAt: 0 });
const event = (t: Trip, seconds = 120, change: Partial<TrailActivity> = {}): TrailActivity => ({ id: `${t.id}:path`, tripId: t.id, itemId: 'path', referenceId: 'path:hash:forward', source: 'nature', direction: 'forward', name: 'Skogsti', status: 'completed', startedAt: t.startedAt, timestamp: t.startedAt + seconds * 1000, seconds, ...change });

test('tour medals rank top three at finish, reject ties and keep earned medals after later PBs', () => {
  const history: TourResult[] = [];
  for (const [i, size] of [50, 40, 30, 20, 60, 60].entries()) {
    const t = trip(String(i), size, 1000 + i * 1000000);
    const result = tourResult(t, [], history)!;
    const m = result.medals.find(m => m.category === 'meters');
    assert.equal(m?.color, ['gold', 'silver', 'bronze', undefined, 'gold', undefined][i]);
    if (i === 0) assert.equal(m?.first, true);
    if (i === 4) { assert.equal(m?.first, false); assert.equal(m?.previousBest, history[0].totals.meters); }
    history.push(result);
  }
  assert.equal(history[0].medals.find(m => m.category === 'meters')?.color, 'gold');
  assert.equal(tourResult({ ...trip('active'), endedAt: null }, [], history), null);
});

test('count distinct completed trails and stretches; partial visits and duplicate events cannot inflate awards', () => {
  const t = trip('a');
  const one = event(t);
  const result = tourResult(t, [one, one, event(t, 140, { id: 'again' }), event(t, 130, { id: 's', itemId: 'saved', referenceId: 'saved:hash:forward', source: 'personal' }), event(t, 10, { id: 'partial', itemId: 'partial', status: 'visited' }), event(t, 130, { id: 'other-trip', tripId: 'missing' })], [])!;
  assert.equal(result.totals.trails, 1); assert.equal(result.totals.stretches, 1);
  assert.equal(result.passages.length, 3);
  assert.equal(result.medals.filter(m => m.category === 'trail-time').length, 1);
  assert.equal(result.medals.find(m => m.category === 'trail-time')?.value, 120);
  assert.equal(result.medals.find(m => m.category === 'stretch-time')?.color, 'gold');
});

test('faster passage earns gold, top-three times earn silver/bronze, and direction/geometry have separate records', () => {
  const history: TourResult[] = [];
  for (const [i, seconds] of [120, 140, 160, 180, 100, 100.2].entries()) {
    const t = trip(String(i), 40, 1000 + i * 1000000);
    const r = tourResult(t, [event(t, seconds)], history)!;
    assert.equal(r.medals.find(m => m.category === 'trail-time')?.color, ['gold', 'silver', 'bronze', undefined, 'gold', undefined][i]);
    history.push(r);
  }
  const t = trip('reverse', 40, 8000000);
  for (const referenceId of ['path:hash:reverse', 'path:changed:forward']) {
    const r = tourResult(t, [event(t, 220, { referenceId, direction: referenceId.endsWith('reverse') ? 'reverse' : 'forward' })], history)!;
    assert.equal(r.medals.find(m => m.category === 'trail-time')?.first, true);
  }
});

test('movement, not stationary wall time, earns duration medals; missing altitude and rejected transport earn none', async () => {
  const t = trip('a');
  const normal = tourResult(t, [], [])!;
  const sitting = tourResult({ ...t, endedAt: t.endedAt! + 3600000 }, [], [])!;
  assert.equal(sitting.totals.moving, normal.totals.moving);
  assert.equal(sitting.totals.elapsed, normal.totals.elapsed + 3600000);
  assert.ok(normal.medals.some(m => m.category === 'ascent'));
  const noHeights = tourResult({ ...t, points: t.points.map(p => ({ ...p, altitude: null, altitudeAccuracy: null })) }, [], [])!;
  assert.equal(noHeights.totals.hasElevation, false); assert.ok(!noHeights.medals.some(m => m.category === 'ascent'));
  const refs = timingReferences([{ id: 'nature', name: 'Skogsti', kind: 'trail', osmHighway: 'path', surface: 'ground', latitude: 60, longitude: 5, geometry: t.points, sourceUrl: '', fetchedAt: 1 }], []);
  for (const bad of [t.points.map(p => ({ ...p, speed: 20 })), t.points.map(p => ({ ...p, accuracy: 80 })), []]) {
    const badTrip = { ...t, points: bad };
    const activity = (await trailActivity(refs, [badTrip], null, badTrip.endedAt!))!;
    assert.deepEqual(tourResult(badTrip, activity.log, [])!.medals, []);
  }
  const future = tourResult(t, [event(t, 120, { timestamp: t.endedAt! + 1 })], [])!;
  assert.equal(future.totals.trails, 0);
});
