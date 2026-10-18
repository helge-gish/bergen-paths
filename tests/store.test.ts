import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { createStore, type Database } from '../src/data/store';
import type { Fix } from '../src/domain/types';
function database() {
  const raw = new DatabaseSync(':memory:');
  const db: Database = {
    execSync: sql => raw.exec(sql),
    runSync: (sql, ...params) => ({ changes: Number(raw.prepare(sql).run(...params as SQLInputValue[]).changes) }),
    getFirstSync: <T>(sql: string, ...params: SQLInputValue[]) => (raw.prepare(sql).get(...params) as T | undefined) ?? null,
    getAllSync: <T>(sql: string, ...params: SQLInputValue[]) => raw.prepare(sql).all(...params) as T[],
    withTransactionSync: fn => { raw.exec('BEGIN'); try { fn(); raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; } },
  };
  return { db, raw, store: createStore(db) };
}
const point: Fix = { timestamp: 1000, latitude: 60.39, longitude: 5.34, altitude: 100, altitudeAccuracy: 3, accuracy: 5, speed: 0 };
test('only one trip can record at a time', () => {
  const { store, raw } = database();
  store.begin(null, true, 1000);
  assert.throws(() => store.begin(null, true, 2000), /UNIQUE/);
  raw.close();
});
test('duplicate location delivery is idempotent and restart retains start time', () => {
  const { store, db, raw } = database();
  const t = store.begin(null, true, 1000);
  store.append(t.id, [point, point]);
  const reopened = createStore(db);
  assert.equal(reopened.active()?.startedAt, 1000); assert.equal(reopened.active()?.points.length, 1);
  raw.close();
});
test('finishing fixes the end time and prevents late background deliveries', () => {
  const { store, raw } = database();
  const t = store.begin(null, true, 1000);
  store.append(t.id, [point]); store.finish(t.id, 5000);
  store.append(t.id, [{ ...point, timestamp: 6000 }]); store.finish(t.id, 7000);
  assert.equal(store.active(), null); assert.equal(store.getTrip(t.id)?.endedAt, 5000); assert.equal(store.getTrip(t.id)?.points.length, 1);
  raw.close();
});
test('audio cue claims are atomic and obey the mute switch', () => {
  const { store, raw } = database(); const t = store.begin(null, true, 1000);
  assert.equal(store.claimCue(t.id, 61_000), true); assert.equal(store.claimCue(t.id, 61_000), false);
  store.setAudio(t.id, false); assert.equal(store.claimCue(t.id, 130_000), false); raw.close();
});
test('named trail selects only the requested part and preserves the original trip', () => {
  const { store, raw } = database(); const t = store.begin(null, false, 1000);
  const points = Array.from({ length: 6 }, (_, i) => ({ ...point, timestamp: 1000 + i * 10_000, latitude: point.latitude + i * 0.0001 }));
  store.append(t.id, points); store.finish(t.id, 51_000);
  const trail = store.saveTrail(t.id, '  Min snarvei  ', 11_000, 31_000);
  assert.equal(trail.name, 'Min snarvei'); assert.equal(trail.points.length, 3);
  assert.equal(store.getTrip(t.id)?.points.length, 6); assert.equal(store.trails().length, 1);
  assert.throws(() => store.saveTrail(t.id, 'Feil', 0, 100_000)); raw.close();
});
test('settings are local and can remove the optional weight', () => {
  const { store, raw } = database(); assert.equal(store.profile().weightKg, null);
  store.setSetting('profile', { weightKg: 75 }); assert.equal(store.profile().weightKg, 75);
  store.setSetting('profile', { weightKg: null }); assert.equal(store.profile().weightKg, null); raw.close();
});
test('deleting a saved trip removes its points and trails, clears ghost references and rebuilds stamps', () => {
  const { store, raw } = database(); const t = store.begin(null, false, 1000);
  store.append(t.id, [point, { ...point, timestamp: 11000, latitude: 60.3901 }]); store.finish(t.id, 20000);
  store.saveTrail(t.id, 'Min sti', 1000, 11000);
  const other = store.begin(t.id, true, 30000);
  store.setSetting('osmAwards', { 'street/test': 11000 }); store.setSetting('profile', { weightKg: 75 });
  assert.equal(store.deleteTrip(t.id), true);
  assert.equal(store.getTrip(t.id), null); assert.equal(store.trails().length, 0);
  assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM points WHERE tripId = ?').get(t.id)?.n, 0);
  assert.equal(store.active()?.id, other.id); assert.equal(store.active()?.ghostId, null);
  assert.deepEqual(store.setting('osmAwards', {}), {}); assert.equal(store.profile().weightKg, 75);
  assert.equal(store.deleteTrip(t.id), false); raw.close();
});
test('an active trip cannot be deleted and a failed deletion rolls back dependent changes', () => {
  const { store, raw } = database(); const t = store.begin(null, false, 1000);
  assert.throws(() => store.deleteTrip(t.id), /Avslutt turen/); assert.equal(store.active()?.id, t.id);
  store.append(t.id, [point, { ...point, timestamp: 11000, latitude: 60.3901 }]); store.finish(t.id, 20000);
  store.saveTrail(t.id, 'Behold meg', 1000, 11000);
  const other = store.begin(t.id, false, 30000);
  raw.exec("CREATE TRIGGER fail_delete BEFORE DELETE ON trips BEGIN SELECT RAISE(ABORT, 'test failure'); END");
  assert.throws(() => store.deleteTrip(t.id), /test failure/);
  assert.ok(store.getTrip(t.id)); assert.equal(store.trails().length, 1); assert.equal(store.active()?.ghostId, t.id);
  assert.equal(store.active()?.id, other.id); raw.close();
});
test('saved trail is a persistent ghost with its own start and pauses, and deletion clears trail references', () => {
  const { store, db, raw } = database(); const parent = store.begin(null, false, 1000);
  store.append(parent.id, [point, { ...point, timestamp: 21000, latitude: 60.3902 }, { ...point, timestamp: 51000, latitude: 60.3902 }, { ...point, timestamp: 71000, latitude: 60.3904 }]);
  store.finish(parent.id, 90000);
  const trail = store.saveTrail(parent.id, 'Segment med pause', 21000, 71000);
  const ref = `trail:${trail.id}`, reopened = createStore(db);
  const ghost = reopened.getReference(ref)!;
  assert.equal(ghost.name, 'Segment med pause'); assert.equal(ghost.startedAt, 21000); assert.equal(ghost.endedAt, 71000);
  assert.equal(ghost.points.length, 3); assert.equal(ghost.points[1].timestamp - ghost.points[0].timestamp, 30000);
  assert.equal(reopened.getReference(parent.id)?.id, parent.id); assert.equal(reopened.getReference('trail:missing'), null);
  const active = reopened.begin(ref, true, 100000);
  assert.equal(reopened.active()?.ghostId, ref);
  reopened.deleteTrip(parent.id);
  assert.equal(reopened.getReference(ref), null); assert.equal(reopened.getTrip(active.id)?.ghostId, null);
  raw.close();
});
test('normal recording saves consecutive segments with a shared boundary and survives restart', () => {
  const { store, db, raw } = database(); const trip = store.begin(null, false, 1000);
  const points = Array.from({ length: 5 }, (_, i) => ({ ...point, timestamp: 1000 + i * 10000, latitude: point.latitude + i * .0001 }));
  store.append(trip.id, points.slice(0, 3));
  const first = store.clipSegment(trip.id, 21000);
  const reopened = createStore(db);
  reopened.append(trip.id, points.slice(3));
  const second = reopened.clipSegment(trip.id, 41000);
  assert.equal(first.points.length, 3); assert.equal(second.points.length, 3);
  assert.deepEqual(first.points.at(-1), second.points[0]);
  assert.equal(reopened.active()?.id, trip.id); assert.equal(reopened.active()?.points.length, 5);
  assert.equal(reopened.segmentWindow(trip.id).from, 41000);
  assert.equal(reopened.segmentWindow(trip.id).lastTrailId, second.id);
  reopened.renameTrail(second.id, '  Skogsstien  '); assert.equal(reopened.trails().find(t => t.id === second.id)?.name, 'Skogsstien');
  assert.throws(() => reopened.clipSegment(trip.id, 41000), /lenger/);
  assert.equal(reopened.segmentWindow(trip.id).count, 2); raw.close();
});
test('setting a start skips transport and stale GPS or a failed insert cannot move the cut', () => {
  const { store, raw } = database(); const trip = store.begin(null, false, 1000);
  const points = Array.from({ length: 5 }, (_, i) => ({ ...point, timestamp: 1000 + i * 10000, latitude: point.latitude + i * .0001 }));
  store.append(trip.id, points.slice(0, 3)); store.setSegmentStart(trip.id, 21000);
  store.append(trip.id, points.slice(3));
  assert.throws(() => store.clipSegment(trip.id, 100000), /ferskt/);
  assert.equal(store.segmentWindow(trip.id).from, 21000);
  raw.exec("CREATE TRIGGER fail_clip BEFORE INSERT ON trails BEGIN SELECT RAISE(ABORT, 'test clip failure'); END");
  assert.throws(() => store.clipSegment(trip.id, 41000), /test clip failure/);
  assert.equal(store.segmentWindow(trip.id).count, 0); assert.equal(store.segmentWindow(trip.id).from, 21000);
  raw.exec('DROP TRIGGER fail_clip');
  const trail = store.clipSegment(trip.id, 41000);
  assert.equal(trail.points[0].timestamp, 21000); assert.equal(trail.points.at(-1)?.timestamp, 41000);
  raw.close();
});
test('ghost mode forbids cuts even when its reference has been deleted', () => {
  const { store, raw } = database(); const reference = store.begin(null, false, 1000); store.finish(reference.id, 2000);
  const trip = store.begin(reference.id, false, 3000);
  store.append(trip.id, [{ ...point, timestamp: 3000 }, { ...point, latitude: 60.3902, timestamp: 23000 }]);
  store.deleteTrip(reference.id);
  assert.equal(store.active()?.mode, 'ghost'); assert.equal(store.active()?.ghostId, null);
  assert.throws(() => store.clipSegment(trip.id, 23000), /vanlig tur/);
  assert.throws(() => store.setSegmentStart(trip.id, 23000), /vanlig tur/);
  store.finish(trip.id, 24000);
  assert.throws(() => store.saveTrail(trip.id, 'Ulovlig klipp', 3000, 23000), /skyggetur/);
  assert.equal(store.trails().length, 0); raw.close();
});

test('status refreshes reuse completed tracks and map input identities; finish/delete invalidate them', () => {
  const { store, raw } = database();
  const first = store.begin(null, false, 1000); store.append(first.id, [point]); store.finish(first.id, 11000);
  const trips = store.trips();
  store.setSetting('osmDiscoveries', [{ id: 'node/1' }]);
  const items = store.setting('osmDiscoveries', []);
  store.setSetting('collectionSyncError', 'offline'); store.setSetting('homeArea', { name: 'Sandviken' });
  assert.equal(store.trips(), trips);
  assert.equal(store.setting('osmDiscoveries', []), items);
  store.append(first.id, [{ ...point, timestamp: 20000 }]);
  assert.equal(store.trips()[0].points.length, 1);
  const second = store.begin(null, false, 30000); store.finish(second.id, 40000);
  assert.notEqual(store.trips(), trips); assert.equal(store.trips().length, 2);
  store.setSetting('osmDiscoveries', [{ id: 'node/2' }]);
  assert.notEqual(store.setting('osmDiscoveries', []), items);
  store.deleteTrip(first.id); assert.equal(store.trips().length, 1);
  raw.close();
});
