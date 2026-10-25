import type { Discovery } from '../../../src/domain/discoveries';
import { collectionProgressAsync } from '../../../src/domain/discoveries';
import type { Fix, Trip } from '../../../src/domain/types';
export type EvidenceWindow = { startsAt: number; endsAt: number; joinedAt: number };
export function validateWalk(input: unknown, now: number): Trip {
  const t=input as Trip;
  if(!t||typeof t.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(t.id)||!Number.isFinite(t.startedAt)||!Number.isFinite(t.endedAt)||t.endedAt===null||t.endedAt<=t.startedAt||t.endedAt>now+10000||t.startedAt<now-35*86400000||t.endedAt-t.startedAt>6*3600000+60000||!Array.isArray(t.points)||t.points.length<2||t.points.length>10000)throw new Error('Ugyldig eller for gammel gatetur.');
  let previous=-Infinity;
  const points:Fix[]=t.points.map(p=>{
    if(!p||!Number.isFinite(p.latitude)||Math.abs(p.latitude)>90||!Number.isFinite(p.longitude)||Math.abs(p.longitude)>180||!Number.isFinite(p.timestamp)||p.timestamp<=previous||p.timestamp<t.startedAt||p.timestamp>t.endedAt!||!Number.isFinite(p.accuracy)||p.accuracy<0||(p.speed!==null&&(!Number.isFinite(p.speed)||p.speed<0)))throw new Error('Ugyldige GPS-punkter.');
    previous=p.timestamp;
    return {latitude:p.latitude,longitude:p.longitude,timestamp:p.timestamp,accuracy:p.accuracy,speed:p.speed,altitude:null,altitudeAccuracy:null};
  });
  return {id:t.id,name:'Gatetur',startedAt:t.startedAt,endedAt:t.endedAt,points,ghostId:null,audioEnabled:false,lastCueAt:0};
}
export async function verifyWalk(trip:Trip,streets:Discovery[],window:EvidenceWindow) {
  if(!Number.isFinite(window.startsAt)||!Number.isFinite(window.endsAt)||!Number.isFinite(window.joinedAt)||window.endsAt<=window.startsAt)throw new Error('Ugyldig sesong.');
  const startsAt=Math.max(trip.startedAt,window.startsAt,window.joinedAt),endsAt=Math.min(trip.endedAt!,window.endsAt);
  if(endsAt<=startsAt)return [];
  // A walk across a season/join boundary must cover the full street INSIDE the
  // window. A completion timestamp alone must not credit older GPS coverage.
  const eligible={...trip,startedAt:startsAt,endedAt:endsAt,points:trip.points.filter(p=>p.timestamp>=startsAt&&p.timestamp<window.endsAt)};
  const progress=await collectionProgressAsync(streets.filter(s=>s.kind==='street'),[eligible]);
  return Object.entries(progress??{}).flatMap(([streetId,p])=>p.collected?[{street_id:streetId,completed_at:new Date(p.firstVisit!).toISOString()}]:[]);
}
