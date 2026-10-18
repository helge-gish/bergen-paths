import { createWorkout, changeWorkout, type Workout } from '../domain/workout';
import { defaultTripName } from '../domain/tripNames';
import { isGhostTrip } from '../domain/types';
import { distance } from '../domain/geo';
import type { Fix, Profile, Trail, Trip } from '../domain/types';
import { trailReference } from '../domain/trailReference';
import { cleanPoints } from '../domain/geo';
type Param = string | number | null;
export interface Database {
  execSync(sql: string): void;
  runSync(sql: string, ...params: Param[]): { changes: number };
  getFirstSync<T>(sql: string, ...params: Param[]): T | null;
  getAllSync<T>(sql: string, ...params: Param[]): T[];
  withTransactionSync(fn: () => void): void;
}
export const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
CREATE TABLE IF NOT EXISTS trips (id TEXT PRIMARY KEY, name TEXT NOT NULL, startedAt REAL NOT NULL, endedAt REAL, ghostId TEXT, audioEnabled INTEGER NOT NULL, lastCueAt REAL NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_trip ON trips ((1)) WHERE endedAt IS NULL;
CREATE TABLE IF NOT EXISTS points (tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE, timestamp REAL NOT NULL, data TEXT NOT NULL, PRIMARY KEY(tripId, timestamp));
CREATE TABLE IF NOT EXISTS trails (id TEXT PRIMARY KEY, tripId TEXT NOT NULL REFERENCES trips(id), name TEXT NOT NULL, createdAt REAL NOT NULL, points TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
PRAGMA user_version = 1;
`;
const id = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export type SegmentWindow = { from: number; count: number; lastTrailId: string | null };
export type SegmentUndo = { before: SegmentWindow; after: SegmentWindow; trailId: string | null; expiresAt: number };
type Row = Omit<Trip, 'points' | 'audioEnabled'> & { audioEnabled: number };
export function createStore(db: Database) {
  db.execSync(SCHEMA);
  const hydrate = (row: Row): Trip => ({ ...row, workout: store.setting<Workout | null>(`workout:${row.id}`, null), mode: store.setting<'normal' | 'ghost'>(`mode:${row.id}`, row.ghostId ? 'ghost' : 'normal'), audioEnabled: !!row.audioEnabled, points: db.getAllSync<{ data: string }>('SELECT data FROM points WHERE tripId = ? ORDER BY timestamp', row.id).map(r => JSON.parse(r.data) as Fix) });
  let completedKey = '', completedTrips: Trip[] = [];
  const immutableSettings = new Map<string, { raw: string; value: unknown }>();
  const store = {
    active(): Trip | null { const r = db.getFirstSync<Row>('SELECT * FROM trips WHERE endedAt IS NULL'); return r ? hydrate(r) : null; },
    getTrip(tripId: string): Trip | null { const r = db.getFirstSync<Row>('SELECT * FROM trips WHERE id = ?', tripId); return r ? hydrate(r) : null; },
    trips(): Trip[] {
      // Finished tracks cannot receive points through append(). Reuse their
      // identities when a refresh only changed sync status or preferences.
      const rows = db.getAllSync<Row>('SELECT * FROM trips WHERE endedAt IS NOT NULL ORDER BY startedAt DESC');
      const key = JSON.stringify(rows);
      if (key !== completedKey) { completedTrips = rows.map(hydrate); completedKey = key; }
      return completedTrips;
    },
    begin(ghostId: string | null, audioEnabled: boolean, now = Date.now(), name?: string, training: 'free' | '4x4' = 'free') {
      const tripId = id();
      db.withTransactionSync(() => {
        db.runSync('INSERT INTO trips VALUES (?, ?, ?, NULL, ?, ?, ?)', tripId, name?.trim().slice(0, 80) || defaultTripName(now), now, ghostId, audioEnabled ? 1 : 0, now);
        store.setSetting(`mode:${tripId}`, ghostId ? 'ghost' : 'normal');
        store.setSetting(`automaticName:${tripId}`, !name?.trim());
        if (training === '4x4') store.setSetting(`workout:${tripId}`, createWorkout(now, audioEnabled));
      });
      return store.getTrip(tripId)!;
    },
    append(tripId: string, points: Fix[]) {
      db.withTransactionSync(() => {
        const active = db.getFirstSync<Row>('SELECT * FROM trips WHERE id = ? AND endedAt IS NULL', tripId);
        if (!active) return;
        for (const p of points) if (Number.isFinite(p.timestamp) && p.timestamp >= active.startedAt) db.runSync('INSERT OR IGNORE INTO points VALUES (?, ?, ?)', tripId, p.timestamp, JSON.stringify(p));
      });
    },
    finish(tripId: string, now = Date.now()) { db.withTransactionSync(() => { store.updateWorkout(tripId, 'stop', now); db.runSync('UPDATE trips SET endedAt = MAX(startedAt, ?) WHERE id = ? AND endedAt IS NULL', now, tripId); }); },
    updateWorkout(tripId: string, action: 'pause' | 'resume' | 'stop' | 'mute' | 'unmute', now = Date.now()) {
      const trip = db.getFirstSync<Row>('SELECT * FROM trips WHERE id = ? AND endedAt IS NULL', tripId);
      const workout = store.setting<Workout | null>(`workout:${tripId}`, null);
      if (!trip || !workout) return;
      store.setSetting(`workout:${tripId}`, action === 'mute' || action === 'unmute' ? { ...workout, audioEnabled: action === 'unmute' } : changeWorkout(workout, action, now));
    },
    deleteTrip(tripId: string): boolean {
      let deleted = false;
      db.withTransactionSync(() => {
        const trip = store.getTrip(tripId);
        if (!trip) return;
        if (trip.endedAt === null) throw new Error('Avslutt turen før du sletter den.');
        db.runSync("INSERT OR IGNORE INTO settings SELECT 'mode:' || id, ? FROM trips WHERE ghostId = ? OR ghostId IN (SELECT 'trail:' || id FROM trails WHERE tripId = ?)", JSON.stringify('ghost'), tripId, tripId);
        db.runSync("UPDATE trips SET ghostId = NULL WHERE ghostId = ? OR ghostId IN (SELECT 'trail:' || id FROM trails WHERE tripId = ?)", tripId, tripId);
        db.runSync('DELETE FROM trails WHERE tripId = ?', tripId);
        deleted = db.runSync('DELETE FROM trips WHERE id = ?', tripId).changes === 1;
        db.runSync('DELETE FROM settings WHERE key IN (?, ?, ?, ?)', `segments:${tripId}`, `mode:${tripId}`, `automaticName:${tripId}`, `workout:${tripId}`);
        // Rebuild collection stamps from the remaining history on the next snapshot.
        store.setSetting('osmAwards', {});
      });
      return deleted;
    },
    cancelEmpty(tripId: string) { db.withTransactionSync(() => { if (db.runSync('DELETE FROM trips WHERE id = ? AND NOT EXISTS (SELECT 1 FROM points WHERE tripId = ?)', tripId, tripId).changes) db.runSync('DELETE FROM settings WHERE key IN (?, ?, ?, ?)', `segments:${tripId}`, `mode:${tripId}`, `automaticName:${tripId}`, `workout:${tripId}`); }); },
    rename(tripId: string, name: string) { const value = name.trim().slice(0, 80); if (!value) throw new Error('Gi turen et navn først.'); db.withTransactionSync(() => { db.runSync('UPDATE trips SET name = ? WHERE id = ?', value, tripId); store.setSetting(`automaticName:${tripId}`, false); }); },
    suggestName(tripId: string, name: string) { if (name.trim() && store.setting(`automaticName:${tripId}`, false)) db.runSync('UPDATE trips SET name = ? WHERE id = ?', name.trim().slice(0, 80), tripId); },
    leaveGhost(tripId: string) {
      db.withTransactionSync(() => {
        const trip = store.getTrip(tripId);
        if (!trip || trip.endedAt !== null) throw new Error('Ingen aktiv tur.');
        store.setSetting(`originalGhost:${tripId}`, trip.ghostId);
        db.runSync('UPDATE trips SET ghostId = NULL WHERE id = ?', tripId);
        store.setSetting(`mode:${tripId}`, 'normal');
        store.setSetting(`segments:${tripId}`, { from: trip.points.at(-1)?.timestamp ?? trip.startedAt, count: 0, lastTrailId: null });
      });
    },
    setAudio(tripId: string, enabled: boolean) { db.runSync('UPDATE trips SET audioEnabled = ? WHERE id = ?', enabled ? 1 : 0, tripId); },
    claimCue(tripId: string, now: number) { return db.runSync('UPDATE trips SET lastCueAt = ? WHERE id = ? AND endedAt IS NULL AND audioEnabled = 1 AND lastCueAt <= ?', now, tripId, now - 60_000).changes === 1; },
    trails(): Trail[] { return db.getAllSync<Omit<Trail, 'points'> & { points: string }>('SELECT * FROM trails ORDER BY createdAt DESC').map(r => ({ ...r, points: JSON.parse(r.points) })); },
    segmentWindow(tripId: string): SegmentWindow {
      const trip = db.getFirstSync<Row>('SELECT * FROM trips WHERE id = ?', tripId);
      if (!trip) throw new Error('Turen finnes ikke lenger.');
      return store.setting<SegmentWindow>(`segments:${tripId}`, { from: trip.startedAt, count: 0, lastTrailId: null });
    },
    segmentUndo(tripId: string): SegmentUndo | null { return store.setting<SegmentUndo | null>(`segmentUndo:${tripId}`, null); },
    undoSegment(tripId: string, now = Date.now()) {
      db.withTransactionSync(() => {
        const undo = store.segmentUndo(tripId), trip = store.getTrip(tripId);
        if (!undo || now > undo.expiresAt || !trip || trip.endedAt !== null || JSON.stringify(store.segmentWindow(tripId)) !== JSON.stringify(undo.after)) throw new Error('Angrefristen er utløpt.');
        if (undo.trailId) {
          if (db.getFirstSync('SELECT id FROM trips WHERE ghostId = ?', 'trail:' + undo.trailId)) throw new Error('Strekket er allerede i bruk.');
          db.runSync('DELETE FROM trails WHERE id = ?', undo.trailId);
        }
        store.setSetting(`segments:${tripId}`, undo.before);
        store.setSetting(`segmentUndo:${tripId}`, null);
      });
    },
    setSegmentStart(tripId: string, now = Date.now()) {
      const trip = store.getTrip(tripId);
      if (!trip || trip.endedAt !== null || isGhostTrip(trip)) throw new Error('Strekk kan bare klippes under en vanlig tur.');
      const last = cleanPoints(trip.points.filter(p => p.timestamp <= now)).at(-1);
      if (!last || now - last.timestamp > 20000) throw new Error('Vent på et ferskt GPS-punkt før du setter startpunkt.');
      db.withTransactionSync(() => {
        const before = store.segmentWindow(tripId), after = { ...before, from: last.timestamp };
        store.setSetting(`segments:${tripId}`, after);
        store.setSetting(`segmentUndo:${tripId}`, { before, after, trailId: null, expiresAt: now + 10000 });
      });
    },
    clipSegment(tripId: string, now = Date.now()): Trail {
      let saved: Trail | undefined;
      db.withTransactionSync(() => {
        const trip = store.getTrip(tripId);
        if (!trip || trip.endedAt !== null || isGhostTrip(trip)) throw new Error('Strekk kan bare klippes under en vanlig tur.');
        const window = store.segmentWindow(tripId);
        const points = cleanPoints(trip.points.filter(p => p.timestamp >= window.from && p.timestamp <= now));
        const last = points.at(-1);
        if (!last || now - last.timestamp > 20000) throw new Error('Vent på et ferskt GPS-punkt før du lagrer strekket.');
        const meters = points.slice(1).reduce((n, p, i) => n + distance(points[i], p), 0);
        if (points.length < 2 || meters < 10) throw new Error('Gå litt lenger før du lagrer neste strekk.');
        saved = { id: id(), tripId, name: `Strekk ${window.count + 1} · ${new Date(now).toLocaleDateString('nb-NO')}`, createdAt: now, points };
        db.runSync('INSERT INTO trails VALUES (?, ?, ?, ?, ?)', saved.id, tripId, saved.name, now, JSON.stringify(points));
        const after = { from: last.timestamp, count: window.count + 1, lastTrailId: saved.id };
        store.setSetting(`segments:${tripId}`, after);
        store.setSetting(`segmentUndo:${tripId}`, { before: window, after, trailId: saved.id, expiresAt: now + 10000 });
      });
      return saved!;
    },
    renameTrail(trailId: string, name: string) {
      const value = name.trim().slice(0, 80);
      if (!value) throw new Error('Gi strekket et navn først.');
      db.runSync('UPDATE trails SET name = ? WHERE id = ?', value, trailId);
    },
    getReference(referenceId: string): Trip | null {
      if (!referenceId.startsWith('trail:')) return store.getTrip(referenceId);
      const trail = db.getFirstSync<Omit<Trail, 'points'> & { points: string }>('SELECT * FROM trails WHERE id = ?', referenceId.slice(6));
      return trail ? trailReference({ ...trail, points: JSON.parse(trail.points) }) : null;
    },
    saveTrail(tripId: string, name: string, from: number, to: number): Trail {
      const trip = store.getTrip(tripId);
      if (trip && isGhostTrip(trip)) throw new Error('En skyggetur kan ikke klippes til strekk.');
      if (!trip || trip.endedAt === null) throw new Error('Avslutt turen før du lagrer et strekk.');
      if (!name.trim()) throw new Error('Gi strekket et navn.');
      if (!Number.isFinite(from) || !Number.isFinite(to) || from < trip.startedAt || to > trip.endedAt || to <= from) throw new Error('Velg et gyldig tidsrom innenfor turen.');
      const points = cleanPoints(trip.points.filter(p => p.timestamp >= from && p.timestamp <= to));
      if (points.length < 2) throw new Error('Dette tidsrommet har for få gode GPS-punkter.');
      const trail = { id: id(), tripId, name: name.trim().slice(0, 80), createdAt: Date.now(), points };
      db.runSync('INSERT INTO trails VALUES (?, ?, ?, ?, ?)', trail.id, tripId, trail.name, trail.createdAt, JSON.stringify(points));
      return trail;
    },
    setting<T>(key: string, fallback: T): T {
      const r = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
      if (!r) return fallback;
      if (!['osmDiscoveries', 'goals', 'goalCatalog'].includes(key)) return JSON.parse(r.value) as T;
      const previous = immutableSettings.get(key);
      if (previous?.raw === r.value) return previous.value as T;
      const value = JSON.parse(r.value) as T;
      immutableSettings.set(key, { raw: r.value, value });
      return value;
    },
    setSetting(key: string, value: unknown) { db.runSync('INSERT OR REPLACE INTO settings VALUES (?, ?)', key, JSON.stringify(value)); },
    profile(): Profile { return store.setting<Profile>('profile', { weightKg: null }); },
  };
  return store;
}
export type Store = ReturnType<typeof createStore>;
