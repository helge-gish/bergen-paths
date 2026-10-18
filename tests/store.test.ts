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
