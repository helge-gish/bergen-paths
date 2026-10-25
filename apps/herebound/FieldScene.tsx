import type { MapPlayer } from './PlayerMarker';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { canMeet, freshPosition, isRevealed, metersBetween } from '../../packages/herebound-sdk';
import type { Encounter, GamePack, GameProgress, PositionFix } from '../../packages/herebound-sdk';
import { FieldMap } from './FieldMap';
import { FieldCamera } from './FieldCamera';
export function FieldScene({pack,progress,fix,now,onSelect,onArSelect,initialTarget,player}:{pack:GamePack;progress:GameProgress;fix:PositionFix|null;now:number;onSelect(e:Encounter):void;onArSelect(e:Encounter):void;initialTarget?:string|null;player?:MapPlayer}) {
  const [mode,setMode]=useState<'map'|'ar'>(initialTarget ? 'ar' : 'map'),[full,setFull]=useState(false),[target,setTarget]=useState<string|null>(initialTarget ?? null);
  const live=freshPosition(fix,now)&&fix.source==='gps'&&fix.accuracy<=30;
  const nearby=live?pack.encounters.filter(e=>(progress.discovered.includes(e.id)||isRevealed(pack,progress,e.position))&&canMeet(e,fix,now)).sort((a,b)=>metersBetween(fix,a.position)-metersBetween(fix,b.position)):[];
  const encounter=target?nearby.find(e=>e.id===target):nearby[0];
  const targetName=pack.encounters.find(e=>e.id===target)?.name;
  useEffect(()=>{if(initialTarget){setTarget(initialTarget);setMode('ar');}},[initialTarget]);
  useEffect(()=>{if(mode==='ar' && !target && encounter)setTarget(encounter.id);},[mode,encounter?.id,target]);
  const select=(e:Encounter)=>{setFull(false);onSelect(e);};
  const controls=<View style={{flexDirection:'row',gap:10,padding:10,backgroundColor:'#f6f3e9'}}>{(['map','ar'] as const).map(m=><Pressable key={m} onPress={()=>setMode(m)} style={{padding:12,borderRadius:12,backgroundColor:mode===m?'#244936':'#e3eadb'}}><Text style={{fontWeight:'700',color:mode===m?'#fff8df':'#244936'}}>{m==='map'?'Kart':'Kamera · AR'}</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityLabel={full?'Minimer kamera eller kart':'Fullskjerm kamera eller kart'} onPress={()=>setFull(!full)} style={{padding:12,marginLeft:'auto',minWidth:46}}><Text style={{color:'#244936',fontWeight:'700',fontSize:20}}>{full?'↙':'⛶'}</Text></Pressable></View>;
  const surface=<View style={{flex:1,backgroundColor:'#152b29'}}>{mode==='map'?<FieldMap player={player} positionLive={live} pack={pack} progress={progress} position={fix ?? progress.position} onSelect={select}/>:<FieldCamera meters={encounter&&fix?metersBetween(fix,encounter.position):undefined} emptyMessage={!live?'Venter på fersk GPS for å velge et funn.':targetName?`${targetName} er utenfor rekkevidde. Gå nærmere eller velg et annet funn.`:undefined} encounter={encounter} lit={!!encounter?.interaction&&progress.journal.some(j=>j.id===encounter.interaction!.clue.id)} onSelect={e=>{setFull(false);onArSelect(e);}}/>}</View>;
  const targets=mode==='ar'&&nearby.length>0?<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0,maxHeight:54}} contentContainerStyle={{gap:6,padding:6}}>{nearby.map(e=><Pressable key={e.id} accessibilityRole="button" accessibilityLabel={`Velg ${e.mapLabel??e.name}`} accessibilityState={{selected:encounter?.id===e.id}} onPress={()=>setTarget(e.id)} style={{padding:10,backgroundColor:encounter?.id===e.id?'#244936':'#e3eadb',borderRadius:10}}><Text style={{color:encounter?.id===e.id?'#fff8df':'#244936'}}>{e.mapLabel??e.name}{encounter?.id===e.id?' ✓':''}</Text></Pressable>)}</ScrollView>:null;
  return <>
    {full?<View style={{height:430}}/>:<View style={{height:490,borderRadius:18,overflow:'hidden'}}>{controls}{surface}{targets}</View>}
    {full&&<Modal visible hardwareAccelerated onRequestClose={()=>setFull(false)}><SafeAreaView style={{flex:1,backgroundColor:'#f6f3e9'}}>{controls}{surface}{targets}</SafeAreaView></Modal>}
    <Text style={{fontSize:13,color:'#666f62'}}>{live?`GPS ±${Math.round(fix.accuracy)} m · gå for å avdekke kartet`:fix && fix.accuracy>30 ? `GPS ±${Math.round(fix.accuracy)} m · trenger 30 m eller bedre for møter` : 'Venter på fersk GPS · kjente steder er bevart'}</Text>
  </>;
}
