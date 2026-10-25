import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkout, changeWorkout, workoutPlan } from '../src/domain/workout';
import { workoutLog } from '../src/domain/workoutLog';
import type { Trip } from '../src/domain/types';

const base:Trip={id:'tour',name:'Tur',startedAt:1000,endedAt:null,points:[],ghostId:null,audioEnabled:true,lastCueAt:0};
test('workout log shows natural completion before tour ends, with actual finish time including pauses',()=>{
  const total=workoutPlan('pyramid').totalMs;
  let w={...createWorkout(1000,true,'pyramid'),id:'one'};
  w=changeWorkout(w,'pause',61000) as typeof w;
  w=changeWorkout(w,'resume',121000) as typeof w;
  const finish=1000+total+60000;
  assert.equal(workoutLog([{...base,workout:w}],finish-1).length,0);
  const completed=workoutLog([{...base,workout:w}],finish+50000)[0];
  assert.equal(completed.timestamp,finish);assert.equal(completed.complete,true);assert.equal(completed.rounds,5);
  assert.equal(completed.elapsed,total);
  const stopped=changeWorkout(w,'stop',finish+3600000);
  assert.equal(stopped.completedAt,finish);
  assert.equal(workoutLog([{...base,endedAt:finish+3600000,workout:stopped}],finish+7200000)[0].timestamp,finish);
});
test('completed and early-stopped sessions retain separate identities, chronology and frozen durations',()=>{
  const early=changeWorkout({...createWorkout(1000,true,'minute-intervals'),id:'early'},'stop',91000);
  const current={...createWorkout(100000,true,'interval-walk'),id:'current'};
  const trip={...base,workoutHistory:[early],workout:current};
  const during=workoutLog([trip],200000);
  assert.equal(during.length,1);assert.equal(during[0].complete,false);assert.equal(during[0].elapsed,90000);
  const after=workoutLog([trip],2000000);
  assert.deepEqual(after.map(w=>w.name),['Japansk intervallgange','Minuttintervaller']);
  assert.equal(after[0].timestamp,1900000);assert.equal(after[1].timestamp,91000);
  assert.equal(new Set(after.map(w=>w.id)).size,2);
  assert.equal(workoutLog([{...base,workout:changeWorkout(current,'pause',120000)}],2000000).length,0);
});
test('older workouts without IDs or finish metadata remain visible and interrupted tour is not a completion',()=>{
  const old={kind:'4x4' as const,elapsedMs:120000,runningSince:null,endedAt:121000,audioEnabled:false};
  const rows=workoutLog([{...base,endedAt:900000,workout:old}],1000000);
  assert.equal(rows[0].complete,false);assert.equal(rows[0].timestamp,121000);assert.equal(rows[0].startedAt,1000);
  const interrupted={...base,endedAt:121000,workout:createWorkout(1000,false,'pyramid')};
  assert.equal(workoutLog([interrupted],9999999)[0].elapsed,120000);
  assert.equal(workoutLog([interrupted],9999999)[0].complete,false);
});
