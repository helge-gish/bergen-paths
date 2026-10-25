import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { PermissionsAndroid, Platform } from 'react-native';
import { activeWalk, appendFixes, beginWalk, endWalk, saveSetting, setting } from './store';
import { idleEvidence, shouldPauseIdle, type IdleEvidence } from '../../src/domain/idleRecording';
import type { Fix } from '../../src/domain/types';
export const TASK='gatekampen-walking-v1';
export const asFix=(p:Location.LocationObject):Fix=>({latitude:p.coords.latitude,longitude:p.coords.longitude,timestamp:p.timestamp,accuracy:p.coords.accuracy??999,speed:p.coords.speed!==null&&Number.isFinite(p.coords.speed)&&p.coords.speed>=0?p.coords.speed:null,altitude:p.coords.altitude,altitudeAccuracy:p.coords.altitudeAccuracy});
const options:Location.LocationTaskOptions={accuracy:Location.Accuracy.BestForNavigation,timeInterval:3000,distanceInterval:0,deferredUpdatesInterval:0,pausesUpdatesAutomatically:false,activityType:Location.ActivityType.Fitness,showsBackgroundLocationIndicator:true,foregroundService:{notificationTitle:'Gatekampen · registrerer gater',notificationBody:'Gå gatene. Trykk her for kart og pause.',notificationColor:'#253C69',killServiceOnDestroy:false}};
TaskManager.defineTask<{locations:Location.LocationObject[]}>(TASK,async({data,error})=>{
  if(error){saveSetting('trackingError',error.message);return;}
  const active=activeWalk();if(!active||!data?.locations)return;
  try{
    const points=data.locations.map(asFix).sort((a,b)=>a.timestamp-b.timestamp);appendFixes(points);
    let idle=setting<IdleEvidence|null>('idle',null);
    for(const p of points)idle=idleEvidence(idle,p,Date.now());
    saveSetting('idle',idle);saveSetting('trackingError',null);
    if(shouldPauseIdle(idle)||Date.now()-active.started>=6*3600000){saveSetting('pauseReason',shouldPauseIdle(idle)?'Pause etter lang stillstand.':'Pause etter seks timer.');await stopRecording();}
  }catch(e){saveSetting('trackingError',e instanceof Error?e.message:'Kunne ikke lagre posisjonen.');}
});
export async function startRecording() {
  const permission=await Location.requestForegroundPermissionsAsync();
  if(!permission.granted||permission.android?.accuracy==='coarse')throw new Error('Velg nøyaktig posisjon for å kjenne igjen gatene.');
  if(!await Location.hasServicesEnabledAsync())throw new Error('Slå på GPS på mobilen.');
  if(!(await Location.requestBackgroundPermissionsAsync()).granted)throw new Error('Velg «Tillat hele tiden» slik at gatene registreres med låst skjerm.');
  if(Platform.OS==='android'&&Number(Platform.Version)>=33)await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  beginWalk();saveSetting('idle',null);saveSetting('pauseReason',null);saveSetting('trackingError',null);
  try{await Location.startLocationUpdatesAsync(TASK,options);saveSetting('consent',true);}catch(e){endWalk();throw e;}
}
export async function stopRecording(){
  // If Android rejects stop, retain the active state and Pause action so the
  // user can retry. Never show "stopped" while the location service still runs.
  try{if(await Location.hasStartedLocationUpdatesAsync(TASK))await Location.stopLocationUpdatesAsync(TASK);}
  catch{throw new Error('GPS-tjenesten kunne ikke stoppes. Prøv Pause igjen, eller stopp Gatekampen i Androids appinnstillinger.');}
  endWalk();saveSetting('idle',null);saveSetting('trackingError',null);
}
export async function recordingRunning(){return Location.hasStartedLocationUpdatesAsync(TASK);}
