import * as SQLite from 'expo-sqlite';
import { createStore, type Store } from './store';
import { refreshMapClassification } from '../services/mapClassification';
let store: Store | undefined;
export function getStore() {
  if (!store) {
    const opened = createStore(SQLite.openDatabaseSync('trakk.db'));
    refreshMapClassification(opened);
    store = opened;
  }
  return store;
}
