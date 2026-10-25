import type {Discovery} from './discoveries';
import type {Coordinate} from './types';
import {discoveryRows} from './discoveryRows';
import {isNatureTrail} from './nature';

const key=(p:Coordinate)=>`${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`;
/** Join cartographic pieces only when they describe one unbranched route.
 * Junctions and disconnected paths must never become invented shortcuts. */
export function natureRoutes(items:Discovery[]):Discovery[]{
 return discoveryRows(items.filter(isNatureTrail)).flatMap(row=>{
  const members=[...row.members].sort((a,b)=>a.id.localeCompare(b.id));
  if(members.length===1)return [{...members[0],routeUnit:true}];
  const nodes=new Map<string,Coordinate>(),edges=new Map<string,Set<string>>();
  for(const item of members)for(const path of item.streetPaths??[item.geometry])for(let i=1;i<path.length;i++){
   const a=key(path[i-1]),b=key(path[i]);if(a===b)continue;
   nodes.set(a,path[i-1]);nodes.set(b,path[i]);
   const left=edges.get(a)??new Set(),right=edges.get(b)??new Set();
   left.add(b);right.add(a);edges.set(a,left);edges.set(b,right);
  }
  const ends=[...edges.keys()].filter(k=>edges.get(k)!.size===1).sort();
  const separate=()=>members.map(item=>({...item,routeUnit:true}));
  if([...edges.values()].some(e=>e.size>2)||![0,2].includes(ends.length)||!edges.size)return separate();
  const first=ends[0]??[...edges.keys()].sort()[0],geometry:Coordinate[]=[nodes.get(first)!];
  let current=first,previous='';const visited=new Set<string>();
  while(true){
   visited.add(current);
   const next=[...edges.get(current)!].filter(n=>n!==previous).sort()[0];
   if(!next)break;
   geometry.push(nodes.get(next)!);
   if(next===first)break;
   if(visited.has(next))return separate();
   previous=current;current=next;
  }
  if(visited.size!==nodes.size)return separate();
  return [{...members[0],...geometry[0],geometry,streetPaths:undefined,streetEnds:undefined,routeUnit:true}];
 });
}
