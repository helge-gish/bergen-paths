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
  'expo-location':`export const state={running:false,failStop:false};export const Accuracy={High:4,BestForNavigation:6},ActivityType={Fitness:3};export const requestForegroundPermissionsAsync=async()=>({granted:true});export const requestBackgroundPermissionsAsync=async()=>({granted:true});export const hasServicesEnabledAsync=async()=>true;export const startLocationUpdatesAsync=async()=>{state.running=true;};export const hasStartedLocationUpdatesAsync=async()=>state.running;export const stopLocationUpdatesAsync=async()=>{if(state.failStop)throw Error('native stop failed');state.running=false;};`,
  'expo-task-manager':`export const tasks={};export const defineTask=(name,fn)=>tasks[name]=fn;`,
  'react-native':`export const Platform={OS:'android',Version:36};export const PermissionsAndroid={PERMISSIONS:{POST_NOTIFICATIONS:'notify'},request:async()=>true};`,
 };
 try{
  await build({stdin:{contents:`export * from './apps/gatekampen/store';export * from './apps/gatekampen/tracking';export {tasks} from 'expo-task-manager';export {state} from 'expo-location';`,resolveDir:process.cwd(),loader:'ts'},outfile:file,bundle:true,platform:'node',format:'cjs',plugins:[{name:'native-adapters',setup(b){b.onResolve({filter:/^(expo-sqlite|expo-location|expo-task-manager|react-native)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
  const require=createRequire(join(process.cwd(),'package.json')),api=require(file),originalNow=Date.now;let now=originalNow();Date.now=()=>now;
  try{
   await api.startRecording();const id=api.activeWalk().id;await api.startRecording();assert.equal(api.activeWalk().id,id);
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
   assert.equal(api.asFix({timestamp:now,coords:{...fix,speed:-1}}).speed,null);
  }finally{Date.now=originalNow;}
 }finally{rmSync(folder,{recursive:true,force:true});}
});
