import * as SQLite from 'expo-sqlite';
import type { Persistence } from '../../packages/herebound-sdk';
let database: ReturnType<typeof SQLite.openDatabaseAsync> | undefined;
async function db() {
  if (!database) database = (async () => {
    const result = await SQLite.openDatabaseAsync('herebound-local-v1.db');
    await result.execAsync('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id = 1), value TEXT NOT NULL)');
    return result;
  })().catch(error => { database = undefined; throw error; });
  return database;
}
export const persistence: Persistence = {
  async read() { return (await (await db()).getFirstAsync<{ value: string }>('SELECT value FROM state WHERE id = 1'))?.value ?? null; },
  async write(value) { await (await db()).runAsync('INSERT INTO state(id,value) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value', value); },
};
