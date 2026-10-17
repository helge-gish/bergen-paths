import type { Fix, Profile, Trail, Trip } from '../domain/types';
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
type Row = Omit<Trip, 'points' | 'audioEnabled'> & { audioEnabled: number };
export function createStore(db: Database) {
  db.execSync(SCHEMA);
  const hydrate = (row: Row): Trip => ({ ...row, audioEnabled: !!row.audioEnabled, points: db.getAllSync<{ data: string }>('SELECT data FROM points WHERE tripId = ? ORDER BY timestamp', row.id).map(r => JSON.parse(r.data) as Fix) });
  const store = {
    active(): Trip | null { const r = db.getFirstSync<Row>('SELECT * FROM trips WHERE endedAt IS NULL'); return r ? hydrate(r) : null; },
    getTrip(tripId: string): Trip | null { const r = db.getFirstSync<Row>('SELECT * FROM trips WHERE id = ?', tripId); return r ? hydrate(r) : null; },
    trips(): Trip[] { return db.getAllSync<Row>('SELECT * FROM trips WHERE endedAt IS NOT NULL ORDER BY startedAt DESC').map(hydrate); },
    begin(ghostId: string | null, audioEnabled: boolean, now = Date.now()) {
      const tripId = id();
      db.runSync('INSERT INTO trips VALUES (?, ?, ?, NULL, ?, ?, ?)', tripId, 'Tur i Byfjellene', now, ghostId, audioEnabled ? 1 : 0, now);
      return store.getTrip(tripId)!;
    },
    append(tripId: string, points: Fix[]) {
      db.withTransactionSync(() => {
        const active = db.getFirstSync<Row>('SELECT * FROM trips WHERE id = ? AND endedAt IS NULL', tripId);
        if (!active) return;
        for (const p of points) if (Number.isFinite(p.timestamp) && p.timestamp >= active.startedAt) db.runSync('INSERT OR IGNORE INTO points VALUES (?, ?, ?)', tripId, p.timestamp, JSON.stringify(p));
      });
    },
    finish(tripId: string, now = Date.now()) { db.runSync('UPDATE trips SET endedAt = MAX(startedAt, ?) WHERE id = ? AND endedAt IS NULL', now, tripId); },
    cancelEmpty(tripId: string) { db.runSync('DELETE FROM trips WHERE id = ? AND NOT EXISTS (SELECT 1 FROM points WHERE tripId = ?)', tripId, tripId); },
    rename(tripId: string, name: string) { const value = name.trim().slice(0, 80); if (!value) throw new Error('Gi turen et navn først.'); db.runSync('UPDATE trips SET name = ? WHERE id = ?', value, tripId); },
    setAudio(tripId: string, enabled: boolean) { db.runSync('UPDATE trips SET audioEnabled = ? WHERE id = ?', enabled ? 1 : 0, tripId); },
    claimCue(tripId: string, now: number) { return db.runSync('UPDATE trips SET lastCueAt = ? WHERE id = ? AND endedAt IS NULL AND audioEnabled = 1 AND lastCueAt <= ?', now, tripId, now - 60_000).changes === 1; },
    trails(): Trail[] { return db.getAllSync<Omit<Trail, 'points'> & { points: string }>('SELECT * FROM trails ORDER BY createdAt DESC').map(r => ({ ...r, points: JSON.parse(r.points) })); },
    saveTrail(tripId: string, name: string, from: number, to: number): Trail {
      const trip = store.getTrip(tripId);
      if (!trip || trip.endedAt === null) throw new Error('Avslutt turen før du lagrer en sti.');
      if (!name.trim()) throw new Error('Gi stien et navn.');
      if (!Number.isFinite(from) || !Number.isFinite(to) || from < trip.startedAt || to > trip.endedAt || to <= from) throw new Error('Velg et gyldig tidsrom innenfor turen.');
      const points = cleanPoints(trip.points.filter(p => p.timestamp >= from && p.timestamp <= to));
      if (points.length < 2) throw new Error('Dette tidsrommet har for få gode GPS-punkter.');
      const trail = { id: id(), tripId, name: name.trim().slice(0, 80), createdAt: Date.now(), points };
      db.runSync('INSERT INTO trails VALUES (?, ?, ?, ?, ?)', trail.id, tripId, trail.name, trail.createdAt, JSON.stringify(points));
      return trail;
    },
    setting<T>(key: string, fallback: T): T { const r = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key); return r ? JSON.parse(r.value) as T : fallback; },
    setSetting(key: string, value: unknown) { db.runSync('INSERT OR REPLACE INTO settings VALUES (?, ?)', key, JSON.stringify(value)); },
    profile(): Profile { return store.setting<Profile>('profile', { weightKg: null }); },
  };
  return store;
}
export type Store = ReturnType<typeof createStore>;
