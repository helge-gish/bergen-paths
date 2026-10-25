import { analyzeStretch, type StretchAnalysis } from './stretchRuns';
import { walkingParts } from './natureTiming';
import { timingReferences, type TimingReference } from './nature';
import { coordinateBounds, distance, project } from './geo';
import type { Discovery } from './discoveries';
import type { Fix, Trip, Trail } from './types';
import {natureRoutes} from './natureRoutes';

export type TrailActivity = {
  id: string; tripId: string; itemId: string; referenceId: string; name: string;
  source: 'nature' | 'personal'; direction: 'forward' | 'reverse';
  status: 'visited' | 'active' | 'completed'; startedAt: number; timestamp: number;
  seconds?: number; fraction?: number;
};
export type TrailActivityReport = { log: TrailActivity[]; active: TrailActivity[]; starts: TrailActivity[]; nearby: { itemId: string; name: string; source: 'nature' | 'personal'; meters: number }[] };
export const emptyTrailActivity = (): TrailActivityReport => ({ log: [], active: [], starts: [], nearby: [] });
// Small cells index the densified reference edges. Visiting a trail must never
// rescan every edge of every route for every recorded fix.
const indexes = new WeakMap<Fix[], Map<string, number[]>>();
const cell = (lat: number, lon: number) => `${lat}:${lon}`;
function proximity(ref: TimingReference, p: Fix): number {
  let index = indexes.get(ref.points);
  if (!index) {
    index = new Map(); indexes.set(ref.points, index);
    for (let i = 1; i < ref.points.length; i++) {
      const a = ref.points[i - 1], b = ref.points[i];
      for (let y = Math.floor(Math.min(a.latitude,b.latitude)*2000); y <= Math.floor(Math.max(a.latitude,b.latitude)*2000); y++)
        for (let x = Math.floor(Math.min(a.longitude,b.longitude)*1000); x <= Math.floor(Math.max(a.longitude,b.longitude)*1000); x++) {
          const key=cell(y,x), edges=index.get(key)??[]; edges.push(i); index.set(key,edges);
        }
    }
  }
  const dy=25/110000, dx=dy/Math.max(.01,Math.cos(p.latitude*Math.PI/180));
  let meters=Infinity;const seen=new Set<number>();
  for(let y=Math.floor((p.latitude-dy)*2000);y<=Math.floor((p.latitude+dy)*2000);y++)
    for(let x=Math.floor((p.longitude-dx)*1000);x<=Math.floor((p.longitude+dx)*1000);x++)
      for(const i of index.get(cell(y,x))??[])if(!seen.has(i)){seen.add(i);meters=Math.min(meters,project(p,ref.points[i-1],ref.points[i]).distance);}
  return meters;
}
type Measurement = { analyses: StretchAnalysis[]; visits: {start:number;end:number}[] };
const cache=new WeakMap<Fix[],Map<TimingReference,Measurement>>();
const partsCache=new WeakMap<Fix[],Trip[]>();
const boundsCache=new WeakMap<Fix[],ReturnType<typeof coordinateBounds>>();
function boundsOf(points:Fix[]){if(!boundsCache.has(points))boundsCache.set(points,coordinateBounds(points));return boundsCache.get(points);}
function parts(trip:Trip){let value=partsCache.get(trip.points);if(!value){value=walkingParts(trip);partsCache.set(trip.points,value);}return value;}
function measure(ref:TimingReference,trip:Trip):Measurement {
  const saved=cache.get(trip.points)??new Map<TimingReference,Measurement>();cache.set(trip.points,saved);
  const cached=saved.get(ref);if(cached)return cached;
  const result:Measurement={analyses:[],visits:[]};saved.set(ref,result);
  const bounds=boundsOf(trip.points),target=boundsOf(ref.points);
  if(!bounds||!target||bounds[2]<target[0]-.002||bounds[0]>target[2]+.002||bounds[3]<target[1]-.001||bounds[1]>target[3]+.001)return result;
  // Do not invent a historical traversal before the saved segment's source.
  if(ref.validFrom&&trip.points.at(-1)!.timestamp<ref.validFrom)return result;
  const track=ref.validFrom?{...trip,points:trip.points.filter(p=>p.timestamp>=ref.validFrom!)}:trip;
  for(const part of parts(track)) {
    // Geometry references have synthetic clocks; always measure actual GPS.
    result.analyses.push(analyzeStretch(part,{...ref,tripId:''}));
    if(ref.direction!=='forward')continue;
    let first:Fix|null=null,last:Fix|null=null,count=0;
    const finish=()=>{if(first&&last&&count>=2&&(distance(first,last)>=8||last.timestamp-first.timestamp>=15000))result.visits.push({start:first.timestamp,end:last.timestamp});first=null;last=null;count=0;};
    for(const point of part.points){
      if(proximity(ref,point)>Math.min(20,10+point.accuracy)){finish();continue;}
      first??=point;last=point;count++;
    }
    finish();
  }
  return result;
}
export async function trailActivity(references:TimingReference[],trips:Trip[],activeId:string|null,now:number,cancelled=()=>false):Promise<TrailActivityReport|null>{
  const report=emptyTrailActivity();let budget=Date.now()+8;
  for(const trip of trips){
    const completed:TrailActivity[]=[],visited:TrailActivity[]=[];
    const last=trip.points.at(-1);
    for(const ref of references){
      if(cancelled())return null;
      const base={tripId:trip.id,itemId:ref.itemId,referenceId:ref.id,name:ref.name,source:ref.source,direction:ref.direction};
      const measured=measure(ref,trip);
      for(const analysis of measured.analyses){
        for(const run of analysis.runs)completed.push({...base,id:`${trip.id}:${ref.id}:${Math.round(run.startedAt)}`,status:'completed',startedAt:run.startedAt,timestamp:run.endedAt,seconds:run.seconds});
        if(trip.id===activeId){
          for(const startedAt of analysis.starts)report.starts.push({...base,id:`${trip.id}:${ref.id}:${Math.round(startedAt)}`,status:'active',startedAt,timestamp:startedAt});
          const running=analysis.active;
          if(running&&last&&last.timestamp-running.timestamp<=15000&&now-running.timestamp<=20000&&now>=running.timestamp)report.active.push({...base,id:`${trip.id}:${ref.id}:${Math.round(running.startedAt)}`,status:'active',startedAt:running.startedAt,timestamp:running.timestamp,fraction:running.fraction});
        }
      }
      for(const visit of measured.visits)visited.push({...base,id:`${trip.id}:${ref.id}:visit:${visit.start}`,status:'visited',startedAt:visit.start,timestamp:visit.end});
      if(trip.id===activeId&&ref.direction==='forward'&&last&&now-last.timestamp<=15000&&now>=last.timestamp&&last.accuracy<=15&&(last.speed===null||last.speed<=6)){
        const meters=proximity(ref,last);if(meters<=20)report.nearby.push({itemId:ref.itemId,name:ref.name,source:ref.source,meters});
      }
      if(Date.now()>=budget){await new Promise<void>(resolve=>setTimeout(resolve,0));budget=Date.now()+8;}
    }
    // One chronological entry for a completed passage, not an extra "visited"
    // entry for that same time window. Repeated visits remain separate entries.
    report.log.push(...completed,...visited.filter(v=>![...completed,...report.active].some(c=>c.tripId===v.tripId&&c.itemId===v.itemId&&c.source===v.source&&c.startedAt<=v.timestamp+30000&&c.timestamp>=v.startedAt-30000)));
  }
  report.log.sort((a,b)=>b.timestamp-a.timestamp);report.nearby.sort((a,b)=>a.meters-b.meters);
  return cancelled()?null:report;
}
export function activityTotals(report:TrailActivityReport){
  const done=report.log.filter(e=>e.status==='completed');
  return { trails:new Set(done.filter(e=>e.source==='nature').map(e=>e.itemId)).size,stretches:new Set(done.filter(e=>e.source==='personal').map(e=>e.itemId)).size,passes:done.length };
}
export type TrailPersonalization=Record<string,{name?:string;stars?:number}>;
export const EMPTY_TRAIL_PERSONALIZATION:TrailPersonalization={};
export function namedNature(items:Discovery[],personal:TrailPersonalization){return natureRoutes(items).map(item=>personal[item.id]?.name?{...item,name:personal[item.id].name!,localName:personal[item.id].name!,unnamed:false}:item);}
export {timingReferences};
