import * as SQLite from 'expo-sqlite';
import { createStore, type Store } from './store';
let store: Store | undefined;
export function getStore() { return store ??= createStore(SQLite.openDatabaseSync('trakk.db')); }
