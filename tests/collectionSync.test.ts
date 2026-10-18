import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Store } from '../src/data/store';
import { syncCollections, pendingSurveys } from '../src/services/collectionSync';
import type { Trip, Fix } from '../src/domain/types';
const p: Fix = { latitude: 48.85, longitude: 2.35, timestamp: 10000, accuracy: 3, altitude: 10, altitudeAccuracy: 2, speed: 1 };
const trip: Trip = { id: 'one', name: 'Tur', startedAt: 10000, endedAt: 40000, ghostId: null, audioEnabled: false, lastCueAt: 0, points: [p, { ...p, timestamp: 25000 }] };
function memory(trips = [trip]) {
  const settings = new Map<string, unknown>();
  return { trips: () => trips, setting: (k: string, fallback: unknown) => settings.has(k) ? settings.get(k) : fallback, setSetting: (k: string, v: unknown) => settings.set(k, structuredClone(v)) } as unknown as Store;
}
test('offline survey retries from checkpoint; success caches and keeps other areas', async () => {
  const store = memory(); let fetches = 0, streets = 0, fail = true;
  const deps = { fetchDiscoveries: async () => { fetches++; return []; }, streetRegion: async () => ({ id: 1, name: 'Paris' }), fetchStreets: async () => { streets++; if (fail) throw new Error('offline'); return []; } };
  await syncCollections(store, deps);
  assert.equal(pendingSurveys(store).length, 1); assert.equal(store.setting('collectionSyncError', ''), 'offline');
  const cache = store.setting<any>('surveyCache', {}); cache.retryAfter = {}; store.setSetting('surveyCache', cache); fail = false;
  await syncCollections(store, deps);
  assert.equal(fetches, 1); assert.equal(streets, 2); assert.equal(pendingSurveys(store).length, 0);
  await syncCollections(store, deps); assert.equal(fetches, 1);
});
test('a missing boundary for one trip does not block another country or point discoveries', async () => {
  const second = { ...trip, id: 'two', points: trip.points.map(p => ({ ...p, latitude: -33.86, longitude: 151.2 })) };
  const store = memory([trip, second]); let fetches = 0;
  await syncCollections(store, { fetchDiscoveries: async () => { fetches++; return []; }, streetRegion: async p => { if (p.latitude > 0) throw new Error('No boundary'); return { id: 2, name: 'Sydney' }; }, fetchStreets: async () => [] });
  assert.equal(fetches, 2); assert.equal(pendingSurveys(store).length, 1);
});
