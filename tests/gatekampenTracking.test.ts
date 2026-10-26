import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

test('Gatekampen actual SQLite store and recording lifecycle retain data, recover failed stop and pause on idle',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'gatekampen-track-')),file=join(folder,'tracking.cjs');
 const mocks:Record<string,string>={
  'expo-sqlite':`import {DatabaseSync} from 'node:sqlite'; export function openDatabaseSync(){const db=new DatabaseSync(':memory:');return {execSync:s=>db.exec(s),getFirstSync:(s,...p)=>db.prepare(s).get(...p),getAllSync:(s,...p)=>db.prepare(s).all(...p),runSync:(s,...p)=>db.prepare(s).run(...p),withTransactionSync:fn=>{db.exec('BEGIN');try{fn();db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}}}`,
  'expo-location':`export const state={running:false,failStop:false,failStart:false,starts:0};export const Accuracy={High:4,BestForNavigation:6},ActivityType={Fitness:3};export const requestForegroundPermissionsAsync=async()=>({granted:true});export const requestBackgroundPermissionsAsync=async()=>({granted:true});export const hasServicesEnabledAsync=async()=>true;export const startLocationUpdatesAsync=async()=>{state.starts++;if(state.failStart)throw Error('native start failed');state.running=true;};export const hasStartedLocationUpdatesAsync=async()=>state.running;export const stopLocationUpdatesAsync=async()=>{if(state.failStop)throw Error('native stop failed');state.running=false;};`,
  'expo-task-manager':`export const tasks={};export const defineTask=(name,fn)=>tasks[name]=fn;`,
  'react-native':`const listeners=new Set();export const AppState={currentState:'active',addEventListener:(_,f)=>{listeners.add(f);return {remove:()=>listeners.delete(f)}},change:s=>{AppState.currentState=s;for(const f of [...listeners])f(s)},listenerCount:()=>listeners.size};export const Platform={OS:'android',Version:36};export const PermissionsAndroid={PERMISSIONS:{POST_NOTIFICATIONS:'notify'},request:async()=>true};`,
 };
 try{
  await build({stdin:{contents:`export * from './apps/gatekampen/store';export * from './apps/gatekampen/tracking';export {tasks} from 'expo-task-manager';export {state} from 'expo-location';export {AppState} from 'react-native';`,resolveDir:process.cwd(),loader:'ts'},outfile:file,bundle:true,platform:'node',format:'cjs',plugins:[{name:'native-adapters',setup(b){b.onResolve({filter:/^(expo-sqlite|expo-location|expo-task-manager|react-native)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
  const require=createRequire(join(process.cwd(),'package.json')),api=require(file),originalNow=Date.now;let now=originalNow();Date.now=()=>now;
  try{
   // Upgrade a persisted 0.1.0 walk: retire its old Android task once, retain
   // the database record, then resume that same walk on explicit Start.
   api.beginWalk();const legacyId=api.activeWalk().id;api.state.running=true;
   await api.prepareRecording();assert.equal(api.state.running,false);assert.equal(api.activeWalk().id,legacyId);
   assert.match(api.setting('trackingError',''),/bevart/);
   await api.startRecording();assert.equal(api.activeWalk().id,legacyId);const id=api.activeWalk().id;await api.startRecording();assert.equal(api.activeWalk().id,id);
   const fix={latitude:60.404,longitude:5.327,timestamp:now,accuracy:5,speed:0,altitude:null,altitudeAccuracy:null};
   api.appendFixes([fix,fix,{...fix,timestamp:now+1,latitude:100},{...fix,timestamp:now-1}]);assert.equal(api.walks()[0].points.length,1);
   api.state.failStop=true;await assert.rejects(()=>api.stopRecording());assert.equal(api.activeWalk().id,id);assert.equal(api.state.running,true);
   api.state.failStop=false;now+=1000;await api.stopRecording();assert.equal(api.activeWalk(),undefined);assert.equal(api.state.running,false);
   api.appendFixes([{...fix,timestamp:now}]);assert.equal(api.walks()[0].points.length,1);
   now+=1000;await api.startRecording();const idleStart=now;
   for(let i=0;i<=20;i++){now=idleStart+i*30000;await api.tasks[api.TASK]({data:{locations:[{timestamp:now,coords:{...fix,speed:0}}]}});}
   assert.equal(api.activeWalk(),undefined);assert.equal(api.state.running,false);assert.match(api.setting('pauseReason',''),/stillstand/);assert.equal(api.walks()[1].points.length,21);
   now+=1000;await api.startRecording();const limitStart=now;now+=7*3600000;
   await api.tasks[api.TASK]({data:{locations:[{timestamp:now,coords:fix}]}});
   assert.equal(api.walks()[2].endedAt,limitStart+6*3600000);assert.equal(api.walks()[2].points.length,0);assert.equal(api.state.running,false);
   // A permission dialog can leave the Activity backgrounded when its promise
   // resolves. Native registration must wait, and repeated taps share one start.
   now+=1000;api.AppState.change('background');const starts=api.state.starts;
   const pending=api.startRecording();assert.equal(api.startRecording(),pending);
   await new Promise(resolve=>setImmediate(resolve));assert.equal(api.state.starts,starts);assert.equal(api.AppState.listenerCount(),1);
   api.AppState.change('active');await pending;assert.equal(api.state.starts,starts+1);assert.equal(api.AppState.listenerCount(),0);
   const preserved=api.activeWalk().id;api.appendFixes([{...fix,timestamp:now}]);
   await api.tasks[api.TASK]({error:{message:'Native promotion rejected'}});
   assert.equal(await api.recordingRunning(),false);assert.equal(api.state.running,false);assert.equal(api.activeWalk().id,preserved);assert.equal(api.walks().at(-1).points.length,1);
   api.state.failStart=true;await assert.rejects(()=>api.startRecording());assert.equal(api.activeWalk().id,preserved);assert.equal(api.walks().at(-1).points.length,1);
   api.state.failStart=false;await api.startRecording();assert.equal(api.activeWalk().id,preserved);assert.equal(await api.recordingRunning(),true);
   await api.stopRecording();now+=1000;api.state.failStart=true;
   await assert.rejects(()=>api.startRecording());assert.equal(api.activeWalk(),undefined);
   api.state.failStart=false;
   now+=1000;api.beginWalk();const stale=api.activeWalk().id;api.appendFixes([{...fix,timestamp:now}]);now+=7*3600000;
   await api.startRecording();assert.notEqual(api.activeWalk().id,stale);assert.equal(api.walks().find((w:{id:string})=>w.id===stale).points.length,1);await api.stopRecording();
   assert.equal(api.asFix({timestamp:now,coords:{...fix,speed:-1}}).speed,null);
  }finally{Date.now=originalNow;}
 }finally{rmSync(folder,{recursive:true,force:true});}
});
