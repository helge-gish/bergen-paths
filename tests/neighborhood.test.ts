import { inArea } from '../src/domain/areas';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { neighborhoodStreets, streetRows } from '../src/domain/neighborhood';
import { collectionProgress, type Discovery, type Progress } from '../src/domain/discoveries';
import type { Fix, Trip } from '../src/domain/types';
import { parseStreets } from '../src/domain/streets';
const area = { latitude: 60.39, longitude: 5.34, name: 'Bergen', radius: 1000 };
const point = (n: number): Fix => ({ ...area, latitude: area.latitude + n * .0001, timestamp: 1000 + n * 10000, accuracy: 4, altitude: null, altitudeAccuracy: null, speed: 1 });
const street = (id: string, name = id): Discovery => ({ id, name, kind: 'street', latitude: area.latitude, longitude: area.longitude, geometry: [point(0), point(10)], sourceUrl: '', fetchedAt: 0 });
const done: Progress = { fraction: 1, collected: true, firstVisit: 1000 };
test('neighborhood excludes other categories and counts connected street fragments once', () => {
  const a = street('a','Testgaten'), b = { ...street('b','Testgaten'), geometry: [point(10),point(20)] };
  const rows = streetRows([a,b,street('c'),{...street('path'),kind:'trail'},{...street('stair'),kind:'steps'}]);
  const result = neighborhoodStreets(rows, area, {a:done,b:done,c:{...done,collected:false,fraction:.5}});
  assert.equal(result.total,2); assert.equal(result.complete.length,1); assert.equal(result.partial.length,1); assert.equal(result.percent,50); assert.equal(result.checked,2);
  assert.equal(neighborhoodStreets(rows,area,{a:done}).complete.length,0);
});
test('streets crossing the radius are included whole, distant streets and absent location are not', () => {
  const crossing = { ...street('cross'), latitude: 60.37, geometry:[{latitude:60.37,longitude:5.34},{latitude:60.41,longitude:5.34}] };
  const far = {...street('far'),latitude:61,geometry:[{latitude:61,longitude:5.34},{latitude:61.01,longitude:5.34}]};
  const rows=streetRows([crossing,far]);
  const result=neighborhoodStreets(rows,area,{});
  assert.equal(result.total,1);assert.equal(result.checked,0);assert.equal(result.remaining[0].item, crossing);
  assert.equal(neighborhoodStreets(rows,null,{}).percent,null);
  assert.equal(neighborhoodStreets([],area,{}).percent,null);
});
test('real GPS evidence distinguishes partial, complete, deleted and unfinished walks', () => {
  const points=Array.from({length:11},(_,i)=>point(i));
  const items=parseStreets({elements:[{type:'way',id:1,tags:{highway:'residential',name:'Testgaten'},geometry:points.map(p=>({lat:p.latitude,lon:p.longitude}))}]},1,'test');
  const trip:Trip={id:'t',name:'Tur',startedAt:1000,endedAt:200000,ghostId:null,audioEnabled:false,lastCueAt:0,points};
  const rows=streetRows(items);
  const partial=neighborhoodStreets(rows,area,collectionProgress(items,[{...trip,points:points.slice(0,6)}]));
  assert.equal(partial.complete.length,0);assert.equal(partial.partial.length,1);
  assert.equal(neighborhoodStreets(rows,area,collectionProgress(items,[trip])).percent,100);
  assert.equal(neighborhoodStreets(rows,area,collectionProgress(items,[])).complete.length,0);
  assert.equal(neighborhoodStreets(rows,area,collectionProgress(items,[{...trip,endedAt:null}])).complete.length,0);
});
test('fast viewport rejection preserves the exact circular street selection', () => {
  const items=Array.from({length:300},(_,i)=>({ ...street(String(i)), latitude:59.99+(i%30)*.001,longitude:4.97+Math.floor(i/30)*.004,geometry:[{latitude:59.99+(i%30)*.001,longitude:4.97+Math.floor(i/30)*.004},{latitude:60.01+(i%30)*.001,longitude:4.98+Math.floor(i/30)*.004}] }));
  const rows=streetRows(items);
  for(const radius of [1000,3000,5000]) {
    const area={latitude:60,longitude:5,radius,name:'Test'};
    const exact=rows.filter(row=>inArea(row.item,area)).map(row=>row.id).sort();
    const result=neighborhoodStreets(rows,area,{}).remaining.map(row=>row.id).sort();
    assert.deepEqual(result,exact);
  }
});
