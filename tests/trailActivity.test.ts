import {test} from 'node:test';
import assert from 'node:assert/strict';
import {trailActivity,timingReferences,activityTotals,emptyTrailActivity,namedNature} from '../src/domain/trailActivity';
import {trailCues} from '../src/domain/trailCues';
import {ultimaX} from '../games/ultima-x';
import {distance} from '../src/domain/geo';
import {natureRoutes} from '../src/domain/natureRoutes';
import {discoveryRows} from '../src/domain/discoveryRows';
import {walkingMetrics} from '../src/domain/natureTiming';
import type {Discovery} from '../src/domain/discoveries';
import type {Trip,Fix,Trail} from '../src/domain/types';
const start=Date.now()-10_000_000;
const points:Fix[]=Array.from({length:41},(_,i)=>({latitude:60+i*.0001,longitude:5,timestamp:start+i*10000,accuracy:4,speed:1.1,altitude:null,altitudeAccuracy:null}));
const item:Discovery={id:'forest',name:'Skogsti',kind:'trail',osmHighway:'path',surface:'ground',latitude:60,longitude:5,geometry:points,sourceUrl:'',fetchedAt:start};
const trip:Trip={id:'walk',name:'',startedAt:start,endedAt:start+400000,points,ghostId:null,audioEnabled:true,lastCueAt:0};
const refs=timingReferences([item],[]);
test('one continuous passage completes in either direction; two partial visits never become a completion',async()=>{
 const report=(await trailActivity(refs,[trip],null,start+500000))!;
 assert.deepEqual(activityTotals(report),{trails:1,stretches:0,passes:1});assert.equal(report.log.length,1);
 assert.ok(report.log[0].seconds!>370);assert.equal(report.log[0].direction,'forward');
 const reverse={...trip,id:'back',points:[...points].reverse().map((p,i)=>({...p,timestamp:start+500000+i*10000})),startedAt:start+500000,endedAt:start+900000};
 const both=(await trailActivity(refs,[trip,reverse],null,start+1000000))!;
 assert.equal(both.log.length,2);assert.equal(both.log[0].direction,'reverse');assert.equal(activityTotals(both).passes,2);assert.equal(activityTotals(both).trails,1);
 const partials=(await trailActivity(refs,[{...trip,id:'a',points:points.slice(0,21)},{...trip,id:'b',points:points.slice(20)}],null,start+500000))!;
 assert.equal(activityTotals(partials).trails,0);assert.equal(partials.log.length,2);assert.ok(partials.log.every(e=>e.status==='visited'));
});
test('live start and mid-trail entry are distinguished; poor GPS, gaps and driving cannot award a completion',async()=>{
 const live={...trip,endedAt:null,points:points.slice(0,10)};
 const report=(await trailActivity(refs,[live],live.id,points[9].timestamp+1000))!;
 assert.equal(report.active.length,1);assert.equal(report.starts.length,1);assert.ok(report.active[0].fraction!>.15);assert.equal(activityTotals(report).trails,0);
 const middle={...live,points:points.slice(10,20)};
 const visiting=(await trailActivity(refs,[middle],middle.id,points[19].timestamp+1000))!;
 assert.equal(visiting.active.length,0);assert.equal(visiting.log[0].status,'visited');
 for(const track of [
  {...trip,points:points.map((p,i)=>i===20?{...p,accuracy:90}:p)},
  {...trip,points:[...points.slice(0,18),...points.slice(23)]},
  {...trip,points:points.map(p=>({...p,speed:15}))},
 ])assert.equal(activityTotals((await trailActivity(refs,[track],null,start+500000))!).trails,0);
 assert.equal((await trailActivity(refs,[live],live.id,points[9].timestamp+60000))!.active.length,0);
 assert.equal(await trailActivity(refs,[trip],null,start,()=>true),null);
});
test('saved stretch uses actual GPS timestamps including its source walk, and cannot rewrite an earlier trip',async()=>{
 const saved:Trail={id:'personal',name:'Min bakke',tripId:trip.id,createdAt:start+500000,points};
 const references=timingReferences([], [saved]);
 const report=(await trailActivity(references,[trip],null,start+500000))!;
 assert.equal(activityTotals(report).stretches,1);assert.ok(report.log[0].startedAt>=start);
 const earlier={...trip,id:'old',startedAt:start-1000000,endedAt:start-600000,points:points.map(p=>({...p,timestamp:p.timestamp-1000000}))};
 assert.equal((await trailActivity(references,[earlier],null,start))!.log.length,0);
});
test('trail voice deduplicates replay, does not narrate historical results and limits proximity reminders',async()=>{
 const report=(await trailActivity(refs,[trip],trip.id,points.at(-1)!.timestamp+1000))!;
 const memory={seen:[],near:{},lastNear:0};
 const first=trailCues(report,memory,points.at(-1)!.timestamp+1000);assert.match(first.text,/fullført stien/);assert.doesNotMatch(first.text,/startet/);
 const replay=trailCues(report,first.memory,points.at(-1)!.timestamp+2000);assert.doesNotMatch(replay.text,/fullført/);
 const historical=trailCues({...report,nearby:[]},memory,start+900000);assert.equal(historical.text,'');
 const nearby={...emptyTrailActivity(),nearby:[{itemId:'forest',name:'Skogsti',source:'nature' as const,meters:5}]};
 const near=trailCues(nearby,memory,start);assert.match(near.text,/Du er ved stien/);assert.equal(trailCues(nearby,near.memory,start+100000).text,'');
 const names=namedNature([item],{forest:{name:'Min sti',stars:5}});assert.equal(names[0].name,'Min sti');assert.equal(item.name,'Skogsti');
});
test('Meyermarken field-test encounters remain in one compact cluster and keep saved-progress IDs',()=>{
 assert.deepEqual(ultimaX.encounters.map(e=>e.id),['stash','rowan','maren','rusk','lantern']);
 for(const encounter of ultimaX.encounters)assert.ok(distance(ultimaX.start.position,encounter.position)<=15,encounter.id);
 assert.equal(ultimaX.version,1);
});
test('connected cartographic pieces become one measured trail; branches and unnamed trails remain separate',async()=>{
 const a={...item,id:'a',geometry:points.slice(0,21)},b={...item,id:'b',geometry:points.slice(20).reverse()};
 const joined=natureRoutes([b,a]);assert.equal(joined.length,1);assert.equal(joined[0].id,'a');assert.equal(joined[0].geometry.length,41);
 assert.equal(discoveryRows(joined).length,1);
 const references=timingReferences(joined,[]);
 assert.equal(activityTotals((await trailActivity(references,[trip],null,start+500000))!).trails,1);
 assert.equal(activityTotals((await trailActivity(references,[{...trip,points:points.slice(0,21)}],null,start+500000))!).trails,0);
 const branch={...item,id:'branch',geometry:[points[20],{...points[20],longitude:5.001}]};
 const branched=natureRoutes([a,b,branch]);assert.equal(branched.length,3);assert.equal(discoveryRows(branched).length,3);
 assert.equal(natureRoutes([{...a,unnamed:true},{...b,unnamed:true}]).length,2);
});
test('nature totals reject fast transport and do not bridge rejected fixes; raw recording remains unchanged',()=>{
 const fast={...trip,points:points.map(p=>({...p,speed:10}))};
 assert.deepEqual(walkingMetrics(fast),{meters:0,ascent:0,hasElevation:false,moving:0});
 const separated={...trip,points:points.map((p,i)=>i>=10&&i<=30?{...p,speed:10}:p)};
 const total=walkingMetrics(separated);assert.ok(total.meters>180&&total.meters<220);assert.equal(separated.points.length,41);
 assert.ok(walkingMetrics(trip).meters>400);assert.ok(total.moving<walkingMetrics(trip).moving);
});
