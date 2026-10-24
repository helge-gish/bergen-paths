import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLOEYVARDEN_AREA, floeyenPresence } from '../apps/arena/region';
import { firstGame, gamesNear } from '../apps/arena/catalogue';

const now = 100_000;
const north = (meters: number) => ({
  latitude: FLOEYVARDEN_AREA.center.latitude + meters / 6371000 * 180 / Math.PI,
  longitude: FLOEYVARDEN_AREA.center.longitude, timestamp: now, accuracy: 10,
});

test('Fløyvarden universe includes the former 3–5 km gap and excludes points beyond 5 km', () => {
  assert.equal(firstGame.discoveryRadius, 5000);
  assert.equal(floeyenPresence(north(4000), now).state, 'inside');
  assert.equal(floeyenPresence(north(4980), now).state, 'inside');
  assert.equal(floeyenPresence(north(5020), now).state, 'outside');
  assert.equal(gamesNear([firstGame], north(4000), true).length, 1);
  assert.equal(gamesNear([firstGame], north(5020), true).length, 0);
  assert.equal(gamesNear([firstGame], north(4000)).length, 0);
});

test('boundary noise, stale GPS and malformed fixes do not assert an entry or exit', () => {
  for (const meters of [4995, 5000, 5005]) assert.equal(floeyenPresence(north(meters), now).state, 'uncertain');
  for (const fix of [null, { ...north(0), accuracy: 51 }, { ...north(0), accuracy: -1 },
    { ...north(0), accuracy: NaN }, { ...north(0), timestamp: now - 30_001 },
    { ...north(0), timestamp: now + 1 }, { ...north(0), latitude: 91 },
    { ...north(0), longitude: Infinity }]) {
    assert.deepEqual(floeyenPresence(fix, now), { state: 'uncertain', meters: null });
  }
  assert.equal(floeyenPresence(north(0), NaN).state, 'uncertain');
  assert.equal(floeyenPresence({ ...north(0), timestamp: now - 30_000 }, now).state, 'inside');
});
