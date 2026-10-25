import * as SQLite from 'expo-sqlite';
import type { Fix, Trip } from '../../src/domain/types';
import type { Catalogue } from './catalogue';
let database: SQLite.SQLiteDatabase | null=null;
function db() {
  if(!database) {
    database=SQLite.openDatabaseSync('gatekampen-v1.db');
    database.execSync(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS walks(id TEXT PRIMARY KEY, started INTEGER NOT NULL, ended INTEGER);
      CREATE TABLE IF NOT EXISTS fixes(walk TEXT NOT NULL, timestamp REAL NOT NULL, value TEXT NOT NULL, PRIMARY KEY(walk,timestamp));
      CREATE UNIQUE INDEX IF NOT EXISTS one_active_walk ON walks((1)) WHERE ended IS NULL;`);
  }
  return database;
}
export function setting<T>(key: string, fallback:T): T {const row=db().getFirstSync<{value:string}>('SELECT value FROM settings WHERE key=?',key);return row?JSON.parse(row.value):fallback;}
export function saveSetting(key:string,value:unknown) { db().runSync('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',key,JSON.stringify(value)); }
export function catalogues(): Catalogue[] {return setting('catalogues',[]);}
export function saveCatalogue(c:Catalogue) { saveSetting('catalogues',[...catalogues().filter(old=>old.region.id!==c.region.id),c]); }
export function activeWalk() { return db().getFirstSync<{id:string;started:number}>('SELECT id,started FROM walks WHERE ended IS NULL ORDER BY started DESC LIMIT 1'); }
export function beginWalk() {
  const active=activeWalk();if(active)return active;
  const started=Date.now(),id=`walk-${started}-${Math.random().toString(36).slice(2)}`;
  db().runSync('INSERT INTO walks VALUES(?,?,NULL)',id,started);return {id,started};
}
export function appendFixes(points:Fix[]) {
  const active=activeWalk();if(!active)return;
  db().withTransactionSync(()=>{for(const p of points) if(Number.isFinite(p.timestamp)&&p.timestamp>=active.started&&p.timestamp<=active.started+6*3600000&&p.timestamp<=Date.now()+10000&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180&&Number.isFinite(p.accuracy)&&p.accuracy>=0) db().runSync('INSERT OR IGNORE INTO fixes VALUES(?,?,?)',active.id,p.timestamp,JSON.stringify(p));});
}
export function endWalk() {const active=activeWalk();if(active)db().runSync('UPDATE walks SET ended=? WHERE id=?',Math.min(Date.now(),active.started+6*3600000),active.id);return active?.id;}
export function walks(): Trip[] {return db().getAllSync<{id:string;started:number;ended:number|null}>('SELECT * FROM walks ORDER BY started').map(row=>({id:row.id,name:'Gatetur',startedAt:row.started,endedAt:row.ended,ghostId:null,audioEnabled:false,lastCueAt:0,points:db().getAllSync<{value:string}>('SELECT value FROM fixes WHERE walk=? ORDER BY timestamp',row.id).map(p=>JSON.parse(p.value))}));}
export function latestFix(): Fix|null { const row=db().getFirstSync<{value:string}>('SELECT value FROM fixes ORDER BY timestamp DESC LIMIT 1'); return row?JSON.parse(row.value):null; }
