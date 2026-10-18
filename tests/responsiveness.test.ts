import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionProgress, collectionProgressAsync, type Discovery } from '../src/domain/discoveries';
import type { Fix, Trip } from '../src/domain/types';

const points: Fix[] = Array.from({ length: 121 }, (_, i) => ({ latitude: 60.39 + i * .00005, longitude: 5.34, timestamp: 1000 + i * 10000, accuracy: 3, speed: 1, altitude: null, altitudeAccuracy: null }));
const trip: Trip = { id: 'walk', name: 'Walk', startedAt: 1000, endedAt: points.at(-1)!.timestamp, points, ghostId: null, audioEnabled: false, lastCueAt: 0 };
const path: Discovery = { id: 'trail', name: 'Path', kind: 'trail', ...points[0], geometry: [points[0], points.at(-1)!], sourceUrl: '', fetchedAt: 0 };
const street: Discovery = { ...path, id: 'street', kind: 'street', streetEnds: path.geometry };
const peak: Discovery = { ...path, id: 'peak', kind: 'peak', geometry: [] };

test('cooperative evaluation preserves trail, street, visit and deletion results', async () => {
  for (const trips of [[trip], [{ ...trip, endedAt: null }], []]) {
    const items = [path, street, peak];
    assert.deepEqual(await collectionProgressAsync(items, trips), collectionProgress(items, trips));
  }
});

test('large area evaluation allows UI timers to run and can be cancelled without partial awards', async () => {
  const items = Array.from({ length: 5000 }, (_, i) => ({ ...street, id: `street/${i}` }));
  let beats = 0, cancelled = false;
  const timer = setInterval(() => { beats++; if (beats === 4) cancelled = true; }, 5);
  try {
    assert.equal(await collectionProgressAsync(items, [trip], () => cancelled), null);
    assert.ok(beats >= 4);
  } finally { clearInterval(timer); }
});

test('cancellation before starting does no collection work', async () => {
  assert.equal(await collectionProgressAsync([street], [trip], () => true), null);
});

test('large unrelated areas finish and report monotonic progress instead of matching every track', async () => {
  const far = Array.from({ length: 12000 }, (_, i) => ({ ...street, id: `far/${i}`, latitude: 65, geometry: [{ latitude: 65, longitude: 5 }, { latitude: 65.01, longitude: 5 }], streetPaths: undefined }));
  const updates: number[]=[];
  const result=await collectionProgressAsync(far,[trip],()=>false,u=>updates.push(u.processed));
  assert.equal(Object.keys(result!).length,12000);
  assert.equal(Object.values(result!).some(p=>p.collected),false);
  assert.ok(updates.every((n,i)=>i===0 || n>=updates[i-1]));
});
