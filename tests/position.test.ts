import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshPosition, latestPosition, usablePosition } from '../src/domain/position';
const p = { latitude: 60.39, longitude: 5.34, timestamp: 100000, accuracy: 10 };
test('map position uses latest valid saved fix without inventing a default region', () => {
  assert.equal(latestPosition(null, undefined), null);
  assert.deepEqual(latestPosition(p, { ...p, timestamp: 90000 }), p);
  assert.deepEqual(latestPosition({ ...p, timestamp: 110000, accuracy: 999 }, p), p);
  assert.deepEqual(latestPosition({ ...p, timestamp: Date.now() + 60000 }, p), p);
  for (const bad of [{ ...p, latitude: NaN }, { ...p, latitude: 91 }, { ...p, accuracy: -1 }]) assert.equal(usablePosition(bad), false);
});
test('old saved positions remain useful for map framing but never count as fresh GPS', () => {
  assert.ok(usablePosition(p));
  assert.equal(freshPosition(p, 120000), true);
  assert.equal(freshPosition(p, 131000), false);
  assert.equal(freshPosition(p, 90000), false);
});
