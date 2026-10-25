import {getStore} from '../data/native';
import {EMPTY_TRAIL_PERSONALIZATION,namedNature,timingReferences,trailActivity,type TrailPersonalization} from '../domain/trailActivity';
import {trailCues,type TrailCueMemory} from '../domain/trailCues';
import type {Discovery} from '../domain/discoveries';
import type {TimingReference} from '../domain/nature';
import {speak} from './voice';
let lastItems:Discovery[]|null=null,lastNames:TrailPersonalization|null=null,lastSaved='',refs:TimingReference[]=[];
let running=false;
export async function syncTrailActivity(){
 if(running)return;running=true;
 try{
  const store=getStore(),active=store.active();if(!active)return;
  const items=store.setting<Discovery[]>('natureDiscoveries',[]),names=store.setting<TrailPersonalization>('trailPersonalization',EMPTY_TRAIL_PERSONALIZATION),saved=store.trails(),key=saved.map(t=>`${t.id}:${t.name}:${t.createdAt}`).join('|');
  if(items!==lastItems||names!==lastNames||key!==lastSaved){refs=timingReferences(namedNature(items,names),saved);lastItems=items;lastNames=names;lastSaved=key;}
  const report=await trailActivity(refs,[active],active.id,Date.now());
  if(!report||store.active()?.id!==active.id)return;
  const cue=trailCues(report,store.setting<TrailCueMemory>(`natureCues:${active.id}`,{seen:[],near:{},lastNear:0}),Date.now());
  store.setSetting(`natureCues:${active.id}`,cue.memory);
  store.setSetting('liveTrailActivity',{tripId:active.id,active:report.active});
  if(cue.text&&store.setting('trailVoice',true)){
   // Automatic recording used to start muted. The explicit trail-voice setting
   // owns this behaviour now, including existing recordings after an update.
   if(!active.audioEnabled)store.setAudio(active.id,true);
   await speak(cue.text,active.id);
  }
 }finally{running=false;}
}
