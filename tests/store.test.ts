import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { createStore, type Database } from '../src/data/store';
import type { Fix } from '../src/domain/types';
import type { Discovery } from '../src/domain/discoveries';
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
test('live and retrospective stretches get local endpoint titles while chosen names survive reopening', () => {
  const { store, db, raw } = database();
  const points = Array.from({ length: 21 }, (_, i) => ({ ...point, latitude: point.latitude + i * .0001, timestamp: 1000 + i * 10000 }));
  const named = (name: string, index: number): Discovery => ({ ...points[index], id: name, name, kind: 'landmark', geometry: [], sourceUrl: '', fetchedAt: 1 });
  store.setSetting('osmDiscoveries', [named('Startsted', 0), named('Midtsted', 10), named('Sluttsted', 20)]);
  const trip = store.begin(null, false, 1000);
  store.append(trip.id, points.slice(0, 11));
  const live = store.clipSegment(trip.id, 101000);
  assert.equal(live.name, 'Startsted – Midtsted');
  store.renameTrail(live.id, 'Min favorittbakke');
  store.append(trip.id, points.slice(11)); store.finish(trip.id, 201000);
  const later = store.saveTrail(trip.id, '', 101000, 201000);
  assert.equal(later.name, 'Midtsted – Sluttsted');
  const manual = store.saveTrail(trip.id, 'Eget navn', 101000, 201000);
  assert.equal(manual.name, 'Eget navn');
  const reopened = createStore(db);
  assert.equal(reopened.trails().find(t => t.id === live.id)?.name, 'Min favorittbakke');
  assert.equal(reopened.trails().find(t => t.id === later.id)?.name, 'Midtsted – Sluttsted');
  raw.close();
});

test('retrospective stretches can be saved without a typed name or downloaded map data', () => {
  const { store, raw } = database();
  const trip = store.begin(null, false, 1000);
  store.append(trip.id, [point, { ...point, latitude: point.latitude + .0002, timestamp: 11000 }]);
  store.finish(trip.id, 11000);
  assert.match(store.saveTrail(trip.id, '', 1000, 11000).name, /^Strekk · /);
  raw.close();
});
test('GPS outage polls reuse immutable snapshots; new and late fixes invalidate them', () => {
  const { store, raw } = database();
  const t = store.begin(null, true, 1000);
  store.append(t.id, [point, { ...point, timestamp: 3000 }]);
  const first = store.active()!;
  assert.equal(store.active(), first);
  store.append(t.id, [point]);
  assert.equal(store.active(), first, 'duplicate delivery must not restart geometry work');
  store.append(t.id, [{ ...point, timestamp: 2000 }]);
  const changed = store.active()!;
  assert.notEqual(changed, first);
  assert.deepEqual(changed.points.map(p => p.timestamp), [1000, 2000, 3000]);
  assert.equal(first.points.length, 2, 'previous snapshots stay immutable');
  store.setAudio(t.id, false);
  const muted = store.active()!;
  assert.equal(muted.audioEnabled, false);
  assert.equal(muted.points, changed.points, 'metadata changes retain GPS geometry');
  assert.equal(store.active(), muted);
  raw.close();
});

test('unchanged saved stretches retain identity; renaming and deletion are visible', () => {
  const { store, raw } = database();
  const t = store.begin(null, false, 1000);
  store.append(t.id, [point, { ...point, timestamp: 11000, latitude: 60.3902 }]);
  store.finish(t.id, 11000);
  const trail = store.saveTrail(t.id, 'Strekk', 1000, 11000);
  const before = store.trails();
  assert.equal(store.trails(), before);
  store.renameTrail(trail.id, 'Nytt navn');
  const renamed = store.trails();
  assert.notEqual(renamed, before);
  assert.equal(renamed[0].name, 'Nytt navn');
  assert.equal(before[0].name, 'Strekk');
  store.deleteTrip(t.id);
  assert.equal(store.trails().length, 0);
  raw.close();
});
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

test('automatic trip names can improve at finish; chosen names survive suggestions and restart', () => {
  const { store, db, raw } = database();
  const auto = store.begin(null, false, 1000);
  assert.notEqual(auto.name, 'Tur i Byfjellene');
  store.suggestName(auto.id, 'Tur fra Testgaten');
  store.finish(auto.id, 5000);
  const reopened = createStore(db);
  reopened.suggestName(auto.id, 'Langs Testgaten');
  assert.equal(reopened.getTrip(auto.id)?.name, 'Langs Testgaten');
  reopened.rename(auto.id, '  Kveldstur med familien  ');
  reopened.suggestName(auto.id, 'Et annet forslag');
  assert.equal(createStore(db).getTrip(auto.id)?.name, 'Kveldstur med familien');
  const chosen = reopened.begin(null, false, 10000, 'Min valgte tur');
  reopened.suggestName(chosen.id, 'Automatisk forslag');
  reopened.finish(chosen.id, 15000);
  reopened.suggestName(chosen.id, 'Tur til toppen');
  assert.equal(reopened.getTrip(chosen.id)?.name, 'Min valgte tur');
  reopened.deleteTrip(auto.id);
  assert.equal(reopened.setting(`automaticName:${auto.id}`, null), null);
  raw.close();
});
test('undo restores a cut boundary and count without dropping recorded GPS; persists through restart', () => {
  const { store, db, raw } = database(); const t = store.begin(null, false, 1000);
  const pts = Array.from({length:8}, (_,i)=>({...point,timestamp:1000+i*10000,latitude:point.latitude+i*.0001}));
  store.append(t.id, pts.slice(0,4));
  const saved = store.clipSegment(t.id,31000);
  store.append(t.id,pts.slice(4));
  const reopened=createStore(db); reopened.undoSegment(t.id,39000);
  assert.equal(reopened.trails().some(t=>t.id===saved.id),false);
  assert.equal(reopened.segmentWindow(t.id).from,1000);
  assert.equal(reopened.segmentWindow(t.id).count,0);
  assert.equal(reopened.getTrip(t.id)?.points.length,8);
  reopened.setSegmentStart(t.id,71000);
  assert.equal(reopened.segmentWindow(t.id).from,71000);
  reopened.undoSegment(t.id,75000); assert.equal(reopened.segmentWindow(t.id).from,1000);
  reopened.setSegmentStart(t.id,71000);
  assert.throws(()=>reopened.undoSegment(t.id,132000),/utløpt/);
  raw.close();
});
test('only the latest segment action can be undone and finishing closes undo', () => {
  const {store,raw}=database(); const t=store.begin(null,false,1000);
  store.append(t.id,Array.from({length:4},(_,i)=>({...point,timestamp:1000+i*10000,latitude:point.latitude+i*.0001})));
  store.clipSegment(t.id,31000); store.setSegmentStart(t.id,32000); store.undoSegment(t.id,33000);
  assert.equal(store.trails().length,1);
  assert.throws(()=>store.undoSegment(t.id,34000),/utløpt/);
  store.setSegmentStart(t.id,34000);store.finish(t.id,35000);
  assert.throws(()=>store.undoSegment(t.id,36000),/utløpt/);raw.close();
});
test('explicitly leaving ghost mode preserves time and fixes and enables future clips', () => {
  const {store,raw}=database();const t=store.begin('old',true,1000);
  store.append(t.id,[point]);store.leaveGhost(t.id);
  const active=store.active()!;assert.equal(active.startedAt,1000);assert.equal(active.points.length,1);
  assert.equal(active.ghostId,null);assert.equal(active.mode,'normal');
  assert.equal(store.setting('originalGhost:'+t.id,null),'old');raw.close();
});

test('4x4 is independent of route mode, durable across restart and leaving ghost; finish freezes trainer', () => {
  const { store, db, raw } = database();
  const reference = store.begin(null, false, 1000); store.finish(reference.id, 2000);
  const trip = store.begin(reference.id, true, 3000, 'Treningsrunden', '4x4');
  assert.equal(trip.mode, 'ghost'); assert.equal(trip.workout?.kind, '4x4');
  store.updateWorkout(trip.id, 'pause', 63000);
  const reopened = createStore(db);
  assert.equal(reopened.active()?.workout?.elapsedMs, 60000);
  assert.equal(reopened.active()?.workout?.runningSince, null);
  reopened.leaveGhost(trip.id);
  assert.equal(reopened.active()?.workout?.kind, '4x4');
  reopened.updateWorkout(trip.id, 'resume', 100000);
  reopened.updateWorkout(trip.id, 'mute', 101000);
  assert.equal(reopened.active()?.workout?.audioEnabled, false);
  assert.equal(reopened.active()?.audioEnabled, true);
  reopened.finish(trip.id, 160000); reopened.finish(trip.id, 999999);
  assert.equal(reopened.getTrip(trip.id)?.workout?.elapsedMs, 120000);
  assert.equal(reopened.getTrip(trip.id)?.workout?.endedAt, 160000);
  reopened.deleteTrip(trip.id);
  assert.equal(reopened.setting(`workout:${trip.id}`, null), null);
  raw.close();
});
test('free trips stay free and failed empty 4x4 starts leave no trainer settings', () => {
  const { store, raw } = database(); const free = store.begin(null, true, 1000);
  assert.equal(free.workout, null); store.finish(free.id, 2000);
  const workout = store.begin(null, true, 3000, undefined, '4x4'); store.cancelEmpty(workout.id);
  assert.equal(store.active(), null); assert.equal(store.setting(`workout:${workout.id}`, null), null); raw.close();
});

test('last map location falls back to saved tracks and survives reopening without a home area', () => {
  const { store, raw, db } = database();
  assert.equal(store.lastPosition(), null);
  const t = store.begin(null, false, 1000);
  store.append(t.id, [point, { ...point, timestamp: 2000, latitude: 60.4 }, { ...point, timestamp: 3000, accuracy: 999 }]);
  assert.equal(createStore(db).lastPosition()?.latitude, 60.4);
  store.setSetting('lastMapPosition', { ...point, timestamp: 4000, latitude: 60.5 });
  assert.equal(createStore(db).lastPosition()?.latitude, 60.5);
  assert.equal(store.setting('homeArea', null), null);
  raw.close();
});

test('one active peg survives move, save, reopen and undo without losing the trip start', async () => {
  const { activePeg } = await import('../src/domain/activePeg');
  const { store, db, raw } = database();
  const t = store.begin(null, false, 1000);
  const points = Array.from({ length: 8 }, (_, i) => ({ ...point, latitude: point.latitude + i * .0001, timestamp: 1000 + i * 10000 }));
  assert.equal(activePeg(t.startedAt, store.segmentWindow(t.id).from, []).atTripStart, true);
  store.append(t.id, points.slice(0, 4)); store.setSegmentStart(t.id, 31000);
  assert.equal(activePeg(t.startedAt, store.segmentWindow(t.id).from, store.getTrip(t.id)!.points).point?.timestamp, 31000);
  store.append(t.id, points.slice(4)); store.clipSegment(t.id, 71000);
  const reopened = createStore(db);
  assert.equal(activePeg(t.startedAt, reopened.segmentWindow(t.id).from, reopened.getTrip(t.id)!.points).point?.timestamp, 71000);
  reopened.undoSegment(t.id, 72000);
  assert.equal(activePeg(t.startedAt, reopened.segmentWindow(t.id).from, reopened.getTrip(t.id)!.points).point?.timestamp, 31000);
  assert.equal(reopened.getTrip(t.id)!.startedAt, 1000);
  assert.equal(reopened.getTrip(t.id)!.points.length, 8);
  raw.close();
});

test('training can start mid-walk and restart without replacing the track or losing previous sessions', () => {
  const { store, db, raw } = database();
  const trip = store.begin(null, false, 1000); store.append(trip.id, [point]);
  const first = store.startWorkout(trip.id, '4x4', 61000);
  assert.equal(first.startedAt, 1000); assert.equal(first.points.length, 1);
  assert.equal(first.workout?.startedAt, 61000); assert.ok(first.workout?.id);
  assert.throws(() => store.startWorkout(trip.id, '4x4', 62000), /pågår/);
  store.updateWorkout(trip.id, 'pause', 91000);
  assert.throws(() => store.startWorkout(trip.id, '4x4', 92000), /pågår/);
  store.updateWorkout(trip.id, 'resume', 101000); store.updateWorkout(trip.id, 'stop', 131000);
  assert.equal(store.active()?.endedAt, null);
  const second = store.startWorkout(trip.id, '4x4', 140000);
  assert.notEqual(second.workout?.id, first.workout?.id);
  assert.equal(second.workoutHistory?.length, 1); assert.equal(second.workoutHistory?.[0].elapsedMs, 60000);
  assert.equal(second.id, trip.id); assert.equal(second.points.length, 1);
  store.finish(trip.id, 161000);
  const reopened = createStore(db), saved = reopened.getTrip(trip.id)!;
  assert.equal(saved.workoutHistory?.[0].endedAt, 131000); assert.equal(saved.workout?.elapsedMs, 21000);
  assert.equal(JSON.parse(JSON.stringify(saved)).workoutHistory.length, 1);
  reopened.deleteTrip(trip.id); assert.equal(reopened.setting(`workoutHistory:${trip.id}`, null), null); raw.close();
});
test('starting another 4x4 after natural completion archives the exact program end and keeps GPS running', () => {
  const { store, raw } = database(); const trip = store.begin(null, false, 1000);
  store.startWorkout(trip.id, '4x4', 10000);
  const again = store.startWorkout(trip.id, '4x4', 3000000);
  assert.equal(again.workoutHistory?.[0].elapsedMs, 2100000);
  assert.equal(again.workoutHistory?.[0].endedAt, 2110000);
  assert.equal(again.endedAt, null); assert.equal(again.workout?.elapsedMs, 0); raw.close();
});
