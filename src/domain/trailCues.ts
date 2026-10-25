import type {TrailActivityReport} from './trailActivity';
export type TrailCueMemory={seen:string[];near:Record<string,number>;lastNear:number};
export function trailCues(report:TrailActivityReport,memory:TrailCueMemory,now:number){
 const next:TrailCueMemory={seen:[...memory.seen],near:{...memory.near},lastNear:memory.lastNear};
 const messages:string[]=[];
 const events=[...report.log.filter(e=>e.status==='completed'),...report.starts].sort((a,b)=>a.timestamp-b.timestamp);
 for(const event of events){
  const key=`${event.status}:${event.id}`;if(next.seen.includes(key))continue;
  next.seen.push(key);
  if(now-event.timestamp>45000||event.timestamp>now+2000)continue;
  const kind=event.source==='nature'?'stien':'strekket';
  messages.push(event.status==='completed'?`Flott! Du har fullført ${kind} ${event.name}.`:`Du har startet på ${kind} ${event.name}. Tiden måles automatisk.`);
  next.lastNear=now;next.near[`${event.source}:${event.itemId}`]=now;
 }
 const near=report.nearby.find(n=>now-(next.near[`${n.source}:${n.itemId}`]??0)>10*60000);
 if(!messages.length&&near&&now-next.lastNear>=90000&&!report.active.some(e=>e.itemId===near.itemId&&e.source===near.source)){
  messages.push(`Du er ved ${near.source==='nature'?'stien':'strekket'} ${near.name}.`);
  next.near[`${near.source}:${near.itemId}`]=now;next.lastNear=now;
 }
 return {memory:next,text:messages.join(' ')};
}
