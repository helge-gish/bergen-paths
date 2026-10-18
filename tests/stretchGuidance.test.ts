import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stretchRuns, stretchResults } from '../src/domain/stretchRuns';
import { startGate } from '../src/domain/startGate';
import { ghostComparison, voiceCue } from '../src/domain/ghost';
import type { Fix, Trail, Trip } from '../src/domain/types';
const epoch = 1_000_000;
const fix = (n: number, time = n * 10000, lon = 5.3): Fix => ({ latitude: 60 + n * .0001, longitude: lon, timestamp: epoch + time, accuracy: 4, altitude: null, altitudeAccuracy: null, speed: 1 });
const trip = (points: Fix[], id = 'walk', startedAt = points[0]?.timestamp ?? epoch): Trip => ({ id, name: id, startedAt, endedAt: points.at(-1)?.timestamp ?? null, ghostId: null, audioEnabled: true, lastCueAt: startedAt, points });
const points = Array.from({ length: 21 }, (_, i) => fix(i));
const trail: Trail = { id: 'stretch', tripId: 'source', name: 'Testbakken', createdAt: epoch + 200000, points };
test('continuous same-direction walk completes with comparable timing gates and preserved pauses', () => {
  const source = trip(points, 'source');
  const faster = trip(points.map(p => ({ ...p, timestamp: epoch + 400000 + (p.timestamp - epoch) / 2 })), 'fast');
  const results = stretchResults(faster, [trail], [source], source);
  assert.equal(results.length, 1);
  assert.ok(Math.abs(results[0].seconds * 2 - results[0].previousSeconds!) < .01);
  assert.equal(results[0].bestSeconds, results[0].ghostSeconds);
  const paused = trip(points.map((p,i) => ({ ...p, timestamp: p.timestamp + (i >= 10 ? 15000 : 0) })));
  assert.ok(Math.abs(stretchRuns(paused, trail)[0].seconds - stretchRuns(source, trail)[0].seconds - 15) < .01);
});
test('reverse, crossing, incomplete, and missing GPS interval do not complete a stretch', () => {
  const reverse = trip([...points].reverse().map((p,i) => ({...p, timestamp: epoch + i * 10000})));
  const crossing = trip(Array.from({length:21}, (_,i) => fix(10, i*10000, 5.298 + i*.0002)));
  const gap = trip([...points.slice(0,5), ...points.slice(15)]);
  for (const t of [reverse, crossing, gap, trip(points.slice(0,14))]) assert.equal(stretchRuns(t, trail).length,0);
});
test('earlier parallel approach does not start the downhill clock before a turnaround', () => {
  const down = [...points].reverse().map((p,i) => ({...p, timestamp: epoch + i * 10000}));
  const stretch = {...trail, tripId:'other', points:down};
  const loop = trip([...points, ...points.slice(0,-1).reverse().map((p,i)=>({...p,timestamp:epoch+(i+21)*10000}))]);
  const runs = stretchRuns(loop,stretch);
  assert.equal(runs.length,1);
  assert.ok(runs[0].startedAt > epoch + 200000);
});
test('a repeated completed stretch is counted twice but never uses a future personal best', () => {
  const source = trip(points,'source');
  const repeats = trip([...points, ...points.map(p=>({...p,timestamp:p.timestamp+400000}))],'repeat');
  assert.equal(stretchRuns(repeats,trail).length,2);
  const future = trip(points.map(p=>({...p,timestamp:epoch+800000+(p.timestamp-epoch)/4})),'future');
  const result = stretchResults(source,[trail],[future])[0];
  assert.equal(result.bestSeconds,null);
});
test('ghost stays comparable through outward and return passes on shared geometry', () => {
  const route = [...points, ...points.slice(0,-1).reverse().map((p,i)=>({...p,timestamp:epoch+(i+21)*10000}))];
  const ref = trip(route,'ref');
  let cueAt = epoch, cues = 0;
  for(let i=1;i<route.length;i++) {
    const live = {...trip(route.slice(0,i+1)), endedAt:null};
    const c = ghostComparison(live,ref,route[i].timestamp);
    assert.notEqual(c.gapSeconds,null);
    assert.ok(Math.abs(c.gapSeconds!) < 2);
    if (voiceCue(c,route[i].timestamp,cueAt,true)) { cues++; cueAt=route[i].timestamp; }
  }
  assert.ok(cues >= 6);
});
test('start gate requires nearby, fresh, precise GPS and a real reference start', () => {
  const ref=trip(points);
  assert.equal(startGate(ref,fix(1),epoch+10000).ready,true);
  assert.equal(startGate(ref,fix(8),epoch+80000).ready,false);
  assert.equal(startGate(ref,fix(0),epoch+20000).ready,false);
  assert.equal(startGate(ref,{...fix(0),accuracy:25},epoch).ready,false);
  assert.equal(startGate(trip([]),fix(0),epoch).ready,false);
});
