import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gatekampenCatalogue,seasonScores} from '../apps/gatekampen/rules';
import {areaStreets,combineProgress,StreetAnalysis,huntSolved,type Area} from '../apps/gatekampen/domain';
import {validateWalk,verifyWalk} from '../apps/gatekampen/backend/verify';
import {streetProgress} from '../src/domain/streets';
import type {Fix,Trip} from '../src/domain/types';
const now=Date.now(),start=now-120000;
const p=(i:number):Fix=>({latitude:60.39+i*.0001,longitude:5.34,timestamp:start+i*10000,accuracy:5,speed:1,altitude:null,altitudeAccuracy:null});
const way=(id:number,highway='residential',name='Testgaten',points=[p(0),p(10)])=>({type:'way',id,tags:{highway,name},geometry:points.map(p=>({lat:p.latitude,lon:p.longitude}))});
const streets=gatekampenCatalogue({elements:[way(1)]},now,'bergen');
const trip=(points=Array.from({length:11},(_,i)=>p(i)),id='walk-1'):Trip=>({id,name:'Tur',startedAt:start,endedAt:now,points,ghostId:null,audioEnabled:false,lastCueAt:0});
const window={startsAt:start-10000,endsAt:now+10000,joinedAt:start-10000};
test('Gatekampen uses the field-tested Tråkk result unchanged, in both directions',async()=>{
 for(const points of [trip().points,trip().points.reverse().map((f,i)=>({...f,timestamp:start+i*10000}))]){
  const walk=trip(points);const expected=streetProgress(streets[0],[walk]);const verified=await verifyWalk(validateWalk(walk,now),streets,window);
  assert.equal(expected.collected,true);assert.deepEqual(verified,[{street_id:streets[0].id,completed_at:new Date(expected.firstVisit!).toISOString()}]);
 }
});
test('same-name steps and paths are removed before street geometry is grouped',()=>{
 const c=gatekampenCatalogue({elements:[way(1),way(2,'steps','Testgaten',[p(10),p(20)]),way(3,'path'),way(4,'footway')]},now,'bergen');
 assert.equal(c.length,1);assert.deepEqual(c[0].streetEnds,streets[0].streetEnds);
});
test('area boundary selects whole streets, including crossing with both ends outside',()=>{
 const area:Area={id:'test',name:'Test',center:p(5),polygon:[{latitude:60.3904,longitude:5.3399},{latitude:60.3906,longitude:5.3399},{latitude:60.3906,longitude:5.3401},{latitude:60.3904,longitude:5.3401},{latitude:60.3904,longitude:5.3399}]};
 assert.equal(areaStreets(streets,area)[0],streets[0]);
 assert.equal(areaStreets(streets,{...area,polygon:area.polygon.map(p=>({...p,longitude:p.longitude+.01}))}).length,0);
});
test('partial personal walks never union into a completion; active snapshots are checked',async()=>{
 const analysis=new StreetAnalysis(),halves=[trip(trip().points.slice(0,6),'a'),trip(trip().points.slice(5),'b')];
 const result=await analysis.run(streets,halves,()=>false);assert.equal(result![streets[0].id].collected,false);
 const live=await analysis.run(streets,[{...trip(),endedAt:null}],()=>false);assert.equal(live![streets[0].id].collected,true);
 assert.equal(await analysis.run(streets,[trip()],()=>true),null);
});
test('GPS gaps, inaccurate fixes, driving and perpendicular crossings earn no server result',async()=>{
 const cases=[trip().points.map((f,i)=>({...f,accuracy:i===5?100:5})),trip().points.map(f=>({...f,speed:15})),trip().points.map((f,i)=>({...f,latitude:p(5).latitude,longitude:5.339+i*.0002})),[p(0),p(10)]];
 for(const points of cases)assert.deepEqual(await verifyWalk(trip(points),streets,window),[]);
});
test('season and membership boundaries cannot borrow earlier street coverage',async()=>{
 assert.equal((await verifyWalk(trip(),streets,window)).length,1);
 assert.deepEqual(await verifyWalk(trip(),streets,{...window,startsAt:p(5).timestamp}),[]);
 assert.deepEqual(await verifyWalk(trip(),streets,{...window,joinedAt:p(5).timestamp}),[]);
 assert.deepEqual(await verifyWalk(trip(),streets,{...window,endsAt:p(5).timestamp}),[]);
});
test('server rejects unfinished, future, unordered, nonfinite and excessive evidence',()=>{
 for(const change of [{endedAt:null},{endedAt:now+20000},{points:[p(2),p(1)]},{points:[{...p(0),accuracy:NaN},p(1)]},{points:[{...p(0),latitude:91},p(1)]},{points:Array(10001).fill(p(0))},{id:'../other'}])assert.throws(()=>validateWalk({...trip(),...change},now));
});
test('shared score counts unique streets; repeated evidence and outsiders cannot add points',()=>{
 const s={id:'s',startsAt:start,endsAt:now,streetIds:[streets[0].id],playerIds:['a','b']};
 const completion={playerId:'a',streetId:streets[0].id,completedAt:p(9).timestamp,evidenceId:'one'};
 assert.deepEqual(seasonScores(s,[completion,completion,{...completion,playerId:'c'},{...completion,playerId:'b',completedAt:now}]),[{playerId:'a',streets:1,total:1},{playerId:'b',streets:0,total:1}]);
});
test('combining personal history preserves earliest completion without hiding stronger incomplete coverage',()=>{
 const old={fraction:1,collected:true,firstVisit:100};
 assert.equal(combineProgress([{a:old},{a:{...old,firstVisit:200}}]).a.firstVisit,100);
 assert.equal(combineProgress([{a:{fraction:.3,collected:false,firstVisit:null}},{a:{fraction:.6,collected:false,firstVisit:null}}]).a.fraction,.6);
});
test('hunt must be opened before its qualifying completion',()=>{
 const h={id:'h',title:'T',clue:'C',hint:'H',streetName:'Testgaten',areaId:'a'},progress={[streets[0].id]:{fraction:1,collected:true,firstVisit:100}};
 assert.equal(huntSolved(h,streets,progress,101),false);assert.equal(huntSolved(h,streets,progress,99),true);
});
