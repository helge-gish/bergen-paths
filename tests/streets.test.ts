import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStreets, streetLength, streetProgress } from '../src/domain/streets';
import type { Fix, Trip } from '../src/domain/types';
const p = (i: number): Fix => ({ latitude: 60.39 + i * 0.0001, longitude: 5.34, timestamp: 1000 + i * 10000, accuracy: 5, speed: 1, altitude: null, altitudeAccuracy: null });
const way = (id: number, points: Fix[], tags = {}) => ({ type: 'way', id, tags: { highway: 'residential', name: 'Testgaten', ...tags }, geometry: points.map(p => ({ lat: p.latitude, lon: p.longitude })) });
const street = parseStreets({ elements: [way(1, [p(0), p(5)]), way(2, [p(5), p(10)])] }, 1)[0];
const trip = (points: Fix[]): Trip => ({ id: 'trip', name: 'Tur', startedAt: 0, endedAt: 500000, points, ghostId: null, audioEnabled: false, lastCueAt: 0 });
const full = Array.from({ length: 11 }, (_, i) => p(i));
test('named fragments become one street with true ends and no duplicate edges', () => {
  assert.equal(street.streetPaths?.length, 1); assert.equal(street.streetEnds?.length, 2);
  assert.ok(streetLength(street) > 110 && streetLength(street) < 112);
  const duplicate = parseStreets({ elements: [way(1, [p(0), p(5)]), way(2, [p(5), p(0)])] }, 1)[0];
  assert.ok(streetLength(duplicate) < 56);
});
test('end-to-end walking counts in either direction, with completion time', () => {
  const forward = streetProgress(street, [trip(full)]);
  assert.equal(forward.collected, true); assert.equal(forward.firstVisit, p(10).timestamp);
  assert.equal(streetProgress(street, [trip([...full].reverse().map((p, i) => ({ ...p, timestamp: 1000 + i * 10000 })))]).collected, true);
});
test('partial walks and multiple separate trips do not collect a whole street', () => {
  assert.equal(streetProgress(street, [trip(full.slice(0, 6)), trip(full.slice(5))]).collected, false);
});
test('perpendicular crossing and distant parallel walks do not count', () => {
  const cross = full.map((f, i) => ({ ...f, latitude: p(5).latitude, longitude: 5.339 + i * 0.0002 }));
  assert.equal(streetProgress(street, [trip(cross)]).fraction, 0);
  assert.equal(streetProgress(street, [trip(full.map(f => ({ ...f, longitude: 5.341 })))]).fraction, 0);
});
test('GPS holes, poor accuracy and driving cannot bridge unwalked street', () => {
  for (const points of [full.map((f, i) => ({ ...f, timestamp: f.timestamp + (i >= 5 ? 100000 : 0) })), full.map((f, i) => ({ ...f, accuracy: i === 5 ? 80 : 5 })), full.map(f => ({ ...f, speed: 15 }))]) assert.equal(streetProgress(street, [trip(points)]).collected, false);
});
test('unfinished trips cannot award streets', () => { assert.equal(streetProgress(street, [{ ...trip(full), endedAt: null }]).collected, false); });
test('branches and disconnected pieces remain visible and must also be walked', () => {
  const branch = { ...p(5), longitude: 5.341 };
  const s = parseStreets({ elements: [way(1, [p(0), p(5), p(10)]), way(2, [p(5), branch]), way(3, [{ ...p(0), longitude: 5.35 }, { ...p(1), longitude: 5.35 }])] }, 1)[0];
  assert.equal(s.streetEnds?.length, 5); assert.equal(s.streetPaths?.length, 4);
  assert.equal(streetProgress(s, [trip(full)]).collected, false);
});
test('bad geometry and inaccessible roads are excluded without joining over missing nodes', () => {
  const s = parseStreets({ elements: [way(1, full, { access: 'private' }), way(2, full, { foot: 'no' }), way(3, full, { area: 'yes' }), way(4, full, { name: '' }), { ...way(5, full), geometry: [{ lat: 60, lon: 5 }, null, { lat: 61, lon: 5 }] }] }, 1);
  assert.equal(s.length, 0); assert.throws(() => parseStreets({}, 1));
});
