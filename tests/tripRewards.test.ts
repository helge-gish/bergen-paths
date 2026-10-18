import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionProgress, type Discovery } from '../src/domain/discoveries';
import { tripRewards } from '../src/domain/tripRewards';
import type { Fix, Trip } from '../src/domain/types';
const p = (i: number, time: number): Fix => ({ latitude: 60.39 + i * .0001, longitude: 5.34, timestamp: time, accuracy: 3, speed: 1, altitude: null, altitudeAccuracy: null });
const walk = (id: string, from: number, to: number, start: number): Trip => ({ id, name: id, startedAt: start, endedAt: start + (to-from)*10000, ghostId: null, audioEnabled: false, lastCueAt: 0, points: Array.from({length: to-from+1}, (_,i) => p(from+i,start+i*10000)) });
const path: Discovery = { id: 'path', kind: 'trail', name: 'Sandviken teststi', ...p(0,0), geometry: [p(0,0),p(20,0)], sourceUrl: '', fetchedAt: 5000000 };
const street: Discovery = { ...path, id: 'street', kind: 'street', name: 'Testgaten', streetPaths: [path.geometry], streetEnds: path.geometry };

test('a trail assembled across walks belongs to the completing walk, independent of download date', () => {
  const a=walk('a',0,10,1000), b=walk('b',10,20,500000);
  const progress=collectionProgress([path],[b,a]);
  assert.equal(progress.path.earnedTripId,'b');
  assert.ok(progress.path.firstVisit! >= b.startedAt);
  assert.equal(tripRewards(a,[a,b],[path],progress).newFinds.length,0);
  assert.equal(tripRewards(b,[a,b],[path],progress).newFinds[0].name,path.name);
  assert.ok(tripRewards(b,[a,b],[path],progress).milestones.some(m=>m.id==='discoveries-1'));
});

test('repeat and ghost walks do not earn the same collection milestone twice', () => {
  const a=walk('a',0,20,1000), b={...walk('b',0,20,500000),mode:'ghost' as const,ghostId:'a'};
  const progress=collectionProgress([street],[b,a]);
  assert.equal(progress.street.earnedTripId,'a');
  assert.equal(tripRewards(a,[a,b],[street],progress).newFinds.length,1);
  assert.equal(tripRewards(b,[a,b],[street],progress).newFinds.length,0);
  assert.equal(tripRewards(b,[a,b],[street],progress).xp,0);
});

test('deleting evidence recomputes which surviving walk earned the stamp', () => {
  const a=walk('a',0,20,1000), b=walk('b',0,20,500000);
  assert.equal(collectionProgress([street],[a,b]).street.earnedTripId,'a');
  const progress=collectionProgress([street],[b]);
  assert.equal(progress.street.earnedTripId,'b');
  assert.equal(tripRewards(b,[b],[street],progress).newFinds.length,1);
});

test('partial streets remain partial and cannot appear as new trip awards', () => {
  const a=walk('a',0,2,1000), result=collectionProgress([street],[a]);
  assert.ok(result.street.fraction>0 && result.street.fraction<.2);
  assert.equal(tripRewards(a,[a],[street],result).newFinds.length,0);
});

test('distance milestones are attributed to the crossing walk, not every later walk', () => {
  const a=walk('a',0,60,1000), b=walk('b',0,60,1000000), c=walk('c',0,10,2000000);
  assert.equal(tripRewards(a,[a,b,c],[],{}).milestones.length,0);
  assert.ok(tripRewards(b,[a,b,c],[],{}).milestones.some(m=>m.id==='distance-1'));
  assert.equal(tripRewards(c,[a,b,c],[],{}).milestones.length,0);
});
