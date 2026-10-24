import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaNatureTrails, natureArea, natureVisitSummary, needsAreaConsent, NATURE_RADIUS } from '../src/domain/natureArea';
import type { Discovery } from '../src/domain/discoveries';
const a = { latitude: 60, longitude: 5 }, b = { latitude: 60.001, longitude: 5 }, c = { latitude: 60.002, longitude: 5 };
const first: Discovery = { ...a, id: 'one', name: 'Skogstien', kind: 'trail', osmHighway: 'path', surface: 'ground', geometry: [a, b], fetchedAt: 1, sourceUrl: '' };
const second: Discovery = { ...b, id: 'two', name: 'Skogstien', kind: 'trail', osmHighway: 'path', surface: 'ground', geometry: [b, c], fetchedAt: 1, sourceUrl: '' };
test('active area stays fixed at 5 km while exploring, requires approval before a distant move', () => {
  const initial = natureArea(null, a)!;
  assert.equal(initial.radius, NATURE_RADIUS); assert.equal(NATURE_RADIUS, 5000);
  assert.equal(natureArea(initial, b), initial);
  assert.equal(natureArea(initial, null), initial);
  const moved = natureArea(initial, { ...a, latitude: 61 })!;
  assert.equal(moved.latitude, 60); assert.equal(needsAreaConsent(initial, { ...a, latitude: 61 }), true); assert.equal(needsAreaConsent(initial, { ...a, latitude: 60.06 }), false); assert.equal(moved.radius, 5000);
  assert.equal(initial.latitude, 60);
  assert.equal(natureArea(null, { latitude: NaN, longitude: 5 }), null);
});
test('area excludes remote cache, paved paths and stairs; crossing geometry counts even with its center outside', () => {
  const area = natureArea(null, a)!;
  const far = { ...first, id: 'far', latitude: 61, geometry: [{ latitude: 61, longitude: 5 }, { latitude: 61.001, longitude: 5 }] };
  const crossing = { ...far, id: 'crossing', geometry: [{ latitude: 59.9, longitude: 5 }, { latitude: 60.1, longitude: 5 }] };
  const items = [first, first, far, crossing, { ...first, id: 'paved', surface: 'asphalt' }, { ...first, id: 'stairs', kind: 'steps' as const }];
  assert.deepEqual(areaNatureTrails(items, area).map(i => i.id), ['one', 'crossing']);
  assert.deepEqual(areaNatureTrails(items, null), []);
});
test('connected trails count once; partial, complete and remote visits stay distinct', () => {
  const items = [first, second];
  const visited = { fraction: .3, collected: false, firstVisit: 1000 };
  const complete = { fraction: 1, collected: true, firstVisit: 2000 };
  assert.equal(natureVisitSummary(items, {}).total, 1);
  const partial = natureVisitSummary(items, { one: complete, two: visited });
  assert.equal(partial.walked, 0); assert.equal(partial.visits.length, 1);
  assert.equal(partial.visits[0].firstVisit, 1000);
  assert.equal(natureVisitSummary(items, { one: complete, two: complete }).walked, 1);
  assert.equal(natureVisitSummary(items, { remote: complete }).walked, 0);
  assert.equal(natureVisitSummary([], { one: complete }).total, 0);
});
