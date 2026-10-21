import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraTarget, nearbyTrails, trailChoices, type CameraHeading } from '../src/domain/trailFinder';
import { trailFacts } from '../src/domain/trailFacts';
import { parseOsm, type Discovery } from '../src/domain/discoveries';
import type { Fix, Trail } from '../src/domain/types';
import { mapBackground, mapStyle } from '../src/domain/mapStyles';
const now = 1_000_000;
const fix = (i = 0, overrides: Partial<Fix> = {}): Fix => ({ latitude: 60 + i * .0001, longitude: 5, accuracy: 4, timestamp: now + i * 10000, altitude: 100 + i * 8, altitudeAccuracy: 3, speed: null, ...overrides });
const item = (id = 'a', overrides: Partial<Discovery> = {}): Discovery => ({ id, name: 'Skogstien', kind: 'trail', latitude: 60.001, longitude: 5, geometry: [fix(10), fix(20)], sourceUrl: '', fetchedAt: now, ...overrides });
const trail = (points: Fix[]): Trail => ({ id: 't', name: 'Mitt strekk', tripId: 'trip', createdAt: now, points });
test('finder groups connected named parts and measures unique edges', () => {
  const choices = trailChoices([item(), item('b', { geometry: [fix(20), fix(30)] }), item('road', { kind: 'street' })], []);
  assert.equal(choices.length, 1);
  assert.ok(choices[0].facts.length > 220 && choices[0].facts.length < 225);
  const targets = nearbyTrails(choices, fix());
  assert.equal(targets.length, 1); assert.ok(targets[0].meters > 110 && targets[0].meters < 113);
  assert.ok(targets[0].bearing < 1);
  assert.equal(nearbyTrails(choices, fix(0, { accuracy: NaN })).length, 0);
});
test('saved GPS gaps never invent a connecting path or inflate length', () => {
  const saved = trail([fix(0), fix(1), fix(30, { timestamp: now + 300000 }), fix(31, { timestamp: now + 310000 })]);
  const choices = trailChoices([], [saved]);
  assert.ok(choices[0].facts.length < 24); assert.equal(choices[0].facts.hasGaps, true);
  assert.equal(nearbyTrails(choices, fix(15), 50).length, 0);
});
test('AR wraps north, hides poor GPS, stale heading and camera aimed at ground', () => {
  const target = nearbyTrails(trailChoices([item()], []), fix())[0];
  const heading: CameraHeading = { bearing: 359, pitch: 0, reliable: true, timestamp: now };
  assert.equal(cameraTarget(target, heading, fix(), now)?.visible, true);
  assert.ok(Math.abs(cameraTarget(target, heading, fix(), now)!.delta - 1) < .1);
  for (const patch of [{ reliable: false }, { pitch: -90 }, { timestamp: now - 3000 }, { timestamp: NaN }]) assert.equal(cameraTarget(target, { ...heading, ...patch }, fix(), now), null);
  for (const patch of [{ accuracy: 80 }, { accuracy: NaN }, { accuracy: -1 }, { timestamp: now - 30001 }, { longitude: 200 }]) assert.equal(cameraTarget(target, heading, fix(0, patch), now), null);
  assert.equal(cameraTarget({ ...target, meters: 3 }, heading, fix(), now), null);
  assert.equal(cameraTarget(target, { ...heading, bearing: 180 }, fix(), now)?.visible, false);
});
test('mapped SAC grades survive parsing and incomplete groups stay explicitly partial', () => {
  const parsed = parseOsm({ elements: [{ type: 'way', id: 1, tags: { highway: 'path', name: 'Sti', sac_scale: 'demanding_mountain_hiking' }, geometry: [{ lat: 60, lon: 5 }, { lat: 60.001, lon: 5 }] }] }, now);
  assert.equal(trailFacts(parsed).grade, 'T3 · Krevende fjelltur');
  const mixed = trailFacts([...parsed, item('unknown')]);
  assert.equal(mixed.partialGrade, true); assert.equal(mixed.ascent, null);
  assert.equal(trailFacts([item()]).grade, null);
});
test('height needs good coverage, never turns missing altitude into flat terrain', () => {
  const points = Array.from({ length: 20 }, (_, i) => fix(i));
  assert.ok(trailFacts([], trail(points)).ascent! > 80);
  assert.equal(trailFacts([], trail(points.map(p => ({ ...p, altitude: null })))).ascent, null);
  assert.equal(trailFacts([], trail(points.map((p, i) => i > 4 ? { ...p, altitudeAccuracy: 100 } : p))).ascent, null);
  assert.equal(trailFacts([item(), item('duplicate')]).length, trailFacts([item()]).length);
});
test('satellite requires configured provider and missing key falls back to topo', () => {
  assert.equal(mapBackground('satellite', false), 'topo');
  assert.equal(mapBackground(null, true), 'satellite');
  assert.equal(typeof mapStyle('satellite', ''), 'object');
  assert.match(String(mapStyle('satellite', 'public-key')), /hybrid\/style.json\?key=public-key/);
});

test('camera includes named streets and does not place targets inside the GPS uncertainty', async () => {
  const { cameraStreetChoices, cameraPositionReady } = await import('../src/domain/trailFinder');
  const street = item('street', { kind: 'street', name: 'Gjeble Pedersens gate', geometry: [fix(0), fix(10)] });
  const choices = cameraStreetChoices([street, street, item()]);
  assert.equal(choices.length, 1);
  assert.equal(choices[0].name, 'Gjeble Pedersens gate');
  const target = nearbyTrails(choices, fix())[0];
  assert.equal(target.meters, 0);
  const heading = { bearing: 0, pitch: 0, reliable: true, timestamp: now };
  assert.equal(cameraTarget(target, heading, fix(), now), null);
  assert.equal(cameraTarget({ ...target, meters: 12 }, heading, fix(0, { accuracy: 20 }), now), null);
  assert.equal(cameraPositionReady(fix(), now + 30000), true);
  assert.equal(cameraPositionReady(fix(), now + 30001), false);
});

test('camera reserves street landmarks without excluding walks or an explicit distant selection', async () => {
  const { cameraChoicesNear, cameraPlaceType } = await import('../src/domain/trailFinder');
  const targets = Array.from({ length: 20 }, (_, i) => ({ ...nearbyTrails(trailChoices([item()], []), fix())[0], id: `${i}`, meters: i * 10, item: item(`${i}`, { kind: i < 10 ? 'street' : 'trail' }) }));
  const result = cameraChoicesNear(targets, '19');
  assert.equal(result.length, 12);
  assert.equal(result[0].item.kind, 'trail');
  assert.ok(result.some(x => x.id === '19'));
  assert.ok(result.some(x => x.item.kind === 'street'));
  assert.match(cameraPlaceType(targets[0]), /orienteringspunkt/);
  assert.equal(cameraPlaceType({ ...targets[0], saved: trail([fix(), fix(1)]) }), 'Ditt strekk');
});
test('finder starts at a mapped endpoint or the original saved start, never at an arbitrary middle projection', async () => {
  const { trailStart } = await import('../src/domain/trailFinder');
  const mapped = nearbyTrails(trailChoices([item()], []), fix(19))[0];
  assert.deepEqual(trailStart(mapped), fix(20));
  const saved = nearbyTrails(trailChoices([], [trail([fix(), fix(1), fix(2)])]), fix(2))[0];
  assert.deepEqual(trailStart(saved), fix());
});
