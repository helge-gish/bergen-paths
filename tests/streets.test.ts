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
  assert.equal(forward.collected, true); assert.equal(forward.firstVisit, p(9).timestamp);
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

test('named footway fragments form one whole street; walking five percent cannot award it', () => {
  const parts = Array.from({ length: 20 }, (_, i) => way(100+i, [p(i*5),p((i+1)*5)], { highway: 'footway', name: 'Gutenbergsveien' }));
  const grouped = parseStreets({ elements: parts }, 1, 'Bergen');
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].kind, 'street');
  const partial = streetProgress(grouped[0], [trip(full.slice(0,6))]);
  assert.equal(partial.collected, false);
  assert.ok(partial.fraction < .06);
  assert.equal(parseStreets({ elements: [way(300, full, { highway: 'footway', footway: 'sidewalk' })] }, 1).length, 0);
});

test('walking on the sidewalk counts toward the street rather than a separate trail', () => {
  const sidewalk = full.map(f => ({ ...f, longitude: f.longitude + .0001 }));
  assert.equal(streetProgress(street, [trip(sidewalk)]).collected, true);
});

test('independent named stair flights group as stairs; a street with a stair section stays one street', () => {
  const stairs = parseStreets({ elements: [way(1,[p(0),p(5)],{highway:'steps',name:'Testtrappen'}),way(2,[p(5),p(10)],{highway:'steps',name:'Testtrappen'})] },1,'area');
  assert.equal(stairs.length,1); assert.equal(stairs[0].kind,'steps');
  assert.equal(streetProgress(stairs[0],[trip(full)]).collected,true);
  assert.equal(streetProgress(stairs[0],[trip(full.slice(0,3))]).collected,false);
  const mixed = parseStreets({ elements: [way(1,[p(0),p(5)],{highway:'residential'}),way(2,[p(5),p(10)],{highway:'steps'})] },1,'area');
  assert.equal(mixed.length,1);assert.equal(mixed[0].kind,'street');
});

test('a pause retains observed coverage without inventing a GPS edge across the pause', () => {
  const points = [...full.slice(0, 6), ...full.slice(5).map(f => ({ ...f, timestamp: f.timestamp + 120000 }))];
  assert.equal(streetProgress(street, [trip(points)]).collected, true);
  const missing = [...full.slice(0, 3), ...full.slice(8).map(f => ({ ...f, timestamp: f.timestamp + 120000 }))];
  const partial = streetProgress(street, [trip(missing)]);
  assert.equal(partial.collected, false);
  assert.ok(partial.fraction < .6);
});

test('one poor fix does not erase earlier walking when the same location is confirmed again', () => {
  const points = [...full.slice(0, 6), { ...p(5), timestamp: p(5).timestamp + 1000, accuracy: 80 },
    ...full.slice(5).map(f => ({ ...f, timestamp: f.timestamp + 3000 }))];
  assert.equal(streetProgress(street, [trip(points)]).collected, true);
});

test('leaving and returning during one walk retains confirmed sections, but separate trips stay separate', () => {
  const outside = { ...p(5), longitude: 5.35, timestamp: 70000 };
  const points = [...full.slice(0, 6), outside, ...full.slice(5).map(f => ({ ...f, timestamp: f.timestamp + 100000 }))];
  assert.equal(streetProgress(street, [trip(points)]).collected, true);
});

test('sidewalk endpoints use the same 15 metre tolerance as the rest of the street', () => {
  const sidewalk = full.map(f => ({ ...f, longitude: f.longitude + .00024 }));
  assert.equal(streetProgress(street, [trip(sidewalk)]).collected, true);
});

test('passing an endpoint between GPS fixes counts, without counting a perpendicular crossing', () => {
  const sidewalk = Array.from({ length: 8 }, (_, i) => ({ ...p(-2 + i * 2), longitude: 5.34023 }));
  assert.equal(streetProgress(street, [trip(sidewalk)]).collected, true);
});

test('turning on the sidewalk at junctions does not require walking into the carriageway', () => {
  // About nine metres short of each centreline junction, six metres to the side.
  const corners = Array.from({ length: 11 }, (_, i) => ({ ...p(.8 + i * .84), longitude: 5.3401 }));
  assert.equal(streetProgress(street, [trip(corners)]).collected, true);
  const tooShort = Array.from({ length: 8 }, (_, i) => p(1.5 + i));
  assert.equal(streetProgress(street, [trip(tooShort)]).collected, false);
});

test('end tolerance cannot turn a small middle portion or perpendicular crossing into a whole short street', () => {
  const short = parseStreets({ elements: [way(1, [p(0), p(2)])] }, 1)[0];
  assert.equal(streetProgress(short, [trip([p(.9), p(1.1)])]).collected, false);
  assert.equal(streetProgress(short, [trip(full.map((f, i) => ({ ...f, latitude: p(1).latitude, longitude: 5.339 + i * .0002 })))]).collected, false);
});
