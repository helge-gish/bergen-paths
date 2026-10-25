import {useEffect,useMemo,useState} from 'react';
import {emptyTrailActivity,trailActivity,timingReferences} from '../domain/trailActivity';
import type {Discovery} from '../domain/discoveries';
import type {Trip,Trail} from '../domain/types';
export function useTrailActivity(items:Discovery[],saved:Trail[],trips:Trip[],active:Trip|null){
 const savedKey=saved.map(t=>`${t.id}:${t.name}:${t.createdAt}`).join('|');
 const references=useMemo(()=>timingReferences(items,saved),[items,savedKey]);
 const [report,setReport]=useState(emptyTrailActivity),[pending,setPending]=useState(true),[error,setError]=useState<string|null>(null);
 useEffect(()=>{let cancelled=false;setPending(true);setError(null);
   const all=active?[...trips.filter(t=>t.id!==active.id),active]:trips;
   void trailActivity(references,all,active?.id??null,Date.now(),()=>cancelled).then(result=>{if(result&&!cancelled){setReport(result);setPending(false);}}).catch(e=>{if(!cancelled){setError(String(e));setPending(false);}});
   return()=>{cancelled=true;};
 },[references,trips,active]);
 return {report,pending,error};
}
