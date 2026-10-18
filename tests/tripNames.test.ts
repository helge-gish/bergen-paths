import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completedTripNames, defaultTripName, startTripNames } from '../src/domain/tripNames';
import { collectionProgress, type Discovery } from '../src/domain/discoveries';
import type { Fix, Trip } from '../src/domain/types';
const time = new Date(2026, 9, 18, 18).getTime();
const p = (i: number): Fix => ({ latitude: 60.39 + i * .0001, longitude: 5.34, timestamp: time + i * 10000, accuracy: 3, speed: 1, altitude: null, altitudeAccuracy: null });
const trip: Trip = { id: 'new', name: 'Turen min', startedAt: time, endedAt: time + 200000, ghostId: null, audioEnabled: false, lastCueAt: 0, points: Array.from({ length: 21 }, (_, i) => p(i)) };
const street: Discovery = { id: 'street', name: 'Martin Vahls gate', kind: 'street', ...p(0), geometry: [p(0), p(20)], streetPaths: [[p(0), p(20)]], streetEnds: [p(0), p(20)], sourceUrl: '', fetchedAt: time };
const area = { ...p(0), name: 'Sandviken', radius: 3000 };

test('start names use nearby geometry and never assume the home area is the current location', async () => {
  const base = { time, items: [street], area, reference: null };
  assert.deepEqual(await startTripNames({ ...base, position: p(5) }), ['Tur fra Martin Vahls gate', 'Tur ved Sandviken', defaultTripName(time)]);
  assert.deepEqual(await startTripNames({ ...base, position: null }), [defaultTripName(time)]);
  assert.deepEqual(await startTripNames({ ...base, position: { latitude: 59.9, longitude: 10.7 } }), [defaultTripName(time)]);
  const misleading = { ...street, geometry: [p(100), p(120)], streetPaths: [[p(100), p(120)]] };
  assert.ok(!(await startTripNames({ ...base, items: [misleading], position: p(0) }))!.some(n => n.includes(street.name)));
});
test('ghost start uses the selected route without stacking prefixes and scan can be cancelled', async () => {
  assert.equal((await startTripNames({ time, position: null, items: [], area, reference: { ...trip, name: 'På nytt: Utsiktsrunden' } }))![0], 'På nytt: Utsiktsrunden');
  assert.equal(await startTripNames({ time, position: p(0), items: Array(300).fill(street), area, reference: null }, () => true), null);
});
test('completed names use this trip on repeated walks, exclude crossings and prefer a visited peak', () => {
  const peak: Discovery = { ...street, id: 'peak', kind: 'peak', name: 'Fløyen', ...p(10), geometry: [], streetPaths: undefined, streetEnds: undefined };
  const items = [street, peak];
  const own = collectionProgress(items, [trip]);
  assert.equal(completedTripNames(trip, items, own, area)[0], 'Tur til Fløyen');
  assert.ok(completedTripNames(trip, items, own, area).includes('Fløyen og Martin Vahls gate'));
  const repeated = { ...trip, id: 'again', startedAt: time + 500000, endedAt: time + 700000, points: trip.points.map(p => ({ ...p, timestamp: p.timestamp + 500000 })) };
  assert.equal(completedTripNames(repeated, items, collectionProgress(items, [repeated]), area)[0], 'Tur til Fløyen');
  const short = { ...trip, endedAt: time + 10000, points: trip.points.slice(0, 2) };
  assert.ok(!completedTripNames(short, [street], collectionProgress([street], [short]), area).some(n => n.includes(street.name)));
});
test('unnamed places never become titles, local names do, duplicates and long names stay bounded', () => {
  const unnamed: Discovery = { ...street, id: 'u', kind: 'viewpoint', name: 'Utsiktspunkt' };
  const progress = { street: { fraction: 1, collected: true, firstVisit: time }, u: { fraction: 1, collected: true, firstVisit: time }, duplicate: { fraction: 1, collected: true, firstVisit: time } };
  assert.ok(!completedTripNames(trip, [unnamed], progress, area).some(n => n.includes('Utsiktspunkt')));
  assert.equal(completedTripNames(trip, [{ ...unnamed, localName: 'Nabolagsutsikten', name: 'Nabolagsutsikten' }], progress, area)[0], 'Tur til Nabolagsutsikten');
  assert.equal(completedTripNames(trip, [street, { ...street, id: 'duplicate' }], progress, area)[0], 'Langs Martin Vahls gate');
  assert.ok(completedTripNames(trip, [{ ...street, name: 'Langt gatenavn '.repeat(10) }], progress, area).every(n => n.length <= 80));
  const outside = { ...area, longitude: 10 };
  assert.ok(!completedTripNames(trip, [], {}, outside).some(n => n.includes('Sandviken')));
});
test('offline and empty tracks get readable time/date names without Bergen assumptions', () => {
  assert.equal(defaultTripName(time), 'Kveldstur · 18. oktober');
  assert.equal(completedTripNames({ ...trip, points: [] }, [], {}, area)[0], defaultTripName(time));
  assert.ok(completedTripNames(trip, [], {}, null)[0].endsWith('km til fots'));
});
