import React,{useEffect,useMemo,useRef,useState} from 'react';
import {View,Text,ScrollView,Pressable,Modal,AppState,Alert} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import * as Location from 'expo-location';
import {StreetMap} from './StreetMap';
import {Button,Card,colors,styles} from './ui';
import {Groups} from './Groups';
import {areas,areaStreets,StreetAnalysis,hunts,huntSolved,type Area} from './domain';
import {loadCatalogue} from './catalogue';
import * as store from './store';
import {asFix,startRecording,stopRecording,recordingRunning} from './tracking';
import {collectionProgressAsync,type Progress} from '../../src/domain/discoveries';
import type {Fix} from '../../src/domain/types';
import {streetLength} from '../../src/domain/streets';
import {project} from '../../src/domain/geo';
type HuntState={id:string;since:number;solvedAt?:number};
function Screen(){
 const [tab,setTab]=useState<'Kart'|'Samling'|'Kampen'>('Kart'),[areaId,setAreaId]=useState(()=>store.setting('area','sandviken-v1')),[catalogues,setCatalogues]=useState(store.catalogues),[trips,setTrips]=useState(store.walks),[active,setActive]=useState(()=>!!store.activeWalk());
 const [position,setPosition]=useState<Fix|null>(store.latestFix),[progress,setProgress]=useState<Record<string,Progress>>({}),[selected,setSelected]=useState<string|null>(null),[full,setFull]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[analysing,setAnalysing]=useState(false),[help,setHelp]=useState(false),[filter,setFilter]=useState<'Alle'|'Gått'|'Gjenstår'>('Alle'),[interrupted,setInterrupted]=useState(false);
 const [hunt,setHunt]=useState<HuntState|null>(()=>store.setting('hunt',null)),[hint,setHint]=useState(false),[tick,setTick]=useState(0),[localArea,setLocalArea]=useState<Area|null>(()=>store.setting('localArea',null)),[solved,setSolved]=useState<Record<string,number>>(()=>store.setting('solvedHunts',{}));
 const analyzer=useRef(new StreetAnalysis()),busyRef=useRef(false);
 const choices=useMemo(()=>localArea?[...areas,localArea]:areas,[localArea]);
 const area=choices.find(a=>a.id===areaId)??areas[1];
 const allStreets=useMemo(()=>[...new Map(catalogues.flatMap(c=>c.streets).map(s=>[s.id,s])).values()],[catalogues]);
 const streets=useMemo(()=>areaStreets(allStreets,area).sort((a,b)=>a.name.localeCompare(b.name,'nb')),[allStreets,area]);
 const current=allStreets.find(s=>s.id===selected),done=streets.filter(s=>progress[s.id]?.collected).length;
 const fresh=position&&Date.now()-position.timestamp<30000;
 const run=async(action:()=>Promise<void>)=>{if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:'Noe gikk galt. Prøv igjen.');}finally{busyRef.current=false;setBusy(false);setActive(!!store.activeWalk());setTrips(store.walks());}};
 useEffect(()=>{
   let live=true;
   void Location.getForegroundPermissionsAsync().then(async p=>{if(p.granted){const last=await Location.getLastKnownPositionAsync();if(live&&last)setPosition(asFix(last));}}).catch(()=>{});
   const timer=setInterval(()=>{if(AppState.currentState!=='active')return;setTick(t=>t+1);setActive(!!store.activeWalk());const fix=store.latestFix();if(fix)setPosition(fix);const issue=store.setting<string|null>('trackingError',null);if(issue)setError(issue);},3000);
   const check=()=>{setTrips(store.walks());void recordingRunning().then(running=>{setInterrupted(!running&&!!store.activeWalk());}).catch(()=>{});};check();
   const sub=AppState.addEventListener('change',state=>{if(state==='active')check();});
   return()=>{live=false;clearInterval(timer);sub.remove();};
 },[]);
 useEffect(()=>{if(tick>0&&tick%5===0)setTrips(store.walks());},[tick]);
 useEffect(()=>{let cancelled=false;setAnalysing(true);void analyzer.current.run(allStreets,trips,()=>cancelled).then(result=>{if(result&&!cancelled){setProgress(result);setAnalysing(false);}}).catch(e=>{if(!cancelled){setError(String(e));setAnalysing(false);}});return()=>{cancelled=true;};},[allStreets,trips]);
 useEffect(()=>{
   if(!hunt||hunt.solvedAt)return;let cancelled=false;const task=hunts.find(h=>h.id===hunt.id);if(!task)return;
   const targets=allStreets.filter(s=>s.name.toLocaleLowerCase('nb')===task.streetName.toLocaleLowerCase('nb'));
   const eligible=trips.map(t=>({...t,startedAt:Math.max(t.startedAt,hunt.since),endedAt:t.endedAt??t.points.at(-1)?.timestamp??t.startedAt,points:t.points.filter(p=>p.timestamp>=hunt.since)})).filter(t=>t.points.length>1);
   void collectionProgressAsync(targets,eligible,()=>cancelled).then(result=>{if(result&&!cancelled&&huntSolved(task,targets,result,hunt.since)){const next={...hunt,solvedAt:Date.now()};store.saveSetting('hunt',next);setHunt(next);setSolved(old=>{const updated={...old,[task.id]:next.solvedAt};store.saveSetting('solvedHunts',updated);return updated;});}});
   return()=>{cancelled=true;};
 },[allStreets,trips,hunt]);
 async function fetchArea(){if(loading)return;setLoading(true);setError('');try{const c=await loadCatalogue(area.center);store.saveCatalogue(c);setCatalogues(store.catalogues());}catch(e){setError(e instanceof Error?e.message:'Kunne ikke hente gatene.');}finally{setLoading(false);}}
 async function fetchHere(){
   if(loading)return;setLoading(true);setError('');let timer:ReturnType<typeof setTimeout>|undefined;
   try{
     if(!(await Location.requestForegroundPermissionsAsync()).granted)throw new Error('Tillat posisjon for å finne gatene her.');
     const loc=await Promise.race([Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('GPS bruker tid. Prøv igjen ute.')),15000);})]);
     if(timer)clearTimeout(timer);const p=asFix(loc);setPosition(p);
     const c=await loadCatalogue(p);store.saveCatalogue(c);setCatalogues(store.catalogues());
     const dx=.018/Math.max(.05,Math.cos(p.latitude*Math.PI/180)),dy=.018;
     const polygon=[[-dy,-dx],[dy,-dx],[dy,dx],[-dy,dx],[-dy,-dx]].map(([lat,lon])=>({latitude:Math.max(-90,Math.min(90,p.latitude+lat)),longitude:Math.max(-180,Math.min(180,p.longitude+lon))}));
     const next={id:'here',name:'Nær meg',center:p,polygon};store.saveSetting('localArea',next);store.saveSetting('area','here');setLocalArea(next);setAreaId('here');setSelected(null);
   }catch(e){setError(e instanceof Error?e.message:'Kunne ikke hente gatene.');}finally{if(timer)clearTimeout(timer);setLoading(false);}
 }
 async function start(){await startRecording();setInterrupted(false);}
 const chosenProgress=current?progress[current.id]:undefined;
 const away=current&&position?Math.min(...(current.streetPaths??[current.geometry]).flatMap(path=>path.slice(1).map((b,i)=>project(position,path[i],b).distance))):null;
 const details=current?<View style={{gap:10}}><View style={[styles.row,{justifyContent:'space-between'}]}><Text style={[styles.title,{flex:1}]}>{current.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="Lukk gateinformasjon" onPress={()=>setSelected(null)} style={{padding:12}}><Text style={styles.title}>×</Text></Pressable></View><Text style={styles.text}>{chosenProgress?.collected?'✓ Gått fra ende til ende':`${Math.round((chosenProgress?.fraction??0)*100)} % gått på én tur`} · {Math.round(streetLength(current))} m</Text>{away!==null&&Number.isFinite(away)&&<Text style={styles.muted}>{Math.round(away)} m fra {fresh?'deg':'sist kjente posisjon'} · luftlinje</Text>}{chosenProgress?.streetCheck&&!chosenProgress.collected&&<Text style={styles.muted}>{chosenProgress.streetCheck.endsVisited} av {chosenProgress.streetCheck.endsTotal} gateender bekreftet</Text>}</View>:null;
 const map=(fullscreen:boolean)=><StreetMap key={`${area.id}-${fullscreen}`} streets={streets} progress={progress} area={area} position={position} selected={selected} onSelect={setSelected} full={fullscreen} onFull={()=>setFull(!fullscreen)}/>;
 return <SafeAreaView style={styles.screen}><StatusBar style="dark"/><View style={{paddingHorizontal:20,paddingVertical:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><View><Text style={{fontSize:25,fontWeight:'900',letterSpacing:-1,color:colors.ink}}>▥ gatekampen<Text style={{color:colors.orange}}>•</Text></Text><Text style={{fontSize:10,letterSpacing:1.8,color:colors.muted}}>GÅ BYEN. GATE FOR GATE.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Om Gatekampen og registrering" onPress={()=>setHelp(true)} style={{padding:12}}><Text style={styles.title}>ⓘ</Text></Pressable></View>
 <ScrollView contentContainerStyle={styles.body}>
 {error!==''&&<View style={styles.error}><Text accessibilityRole="alert" style={styles.text}>{error}</Text><Button secondary title="Lukk melding" onPress={()=>setError('')}/></View>}
 {tab!=='Kampen'&&<><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{choices.map(a=><Pressable key={a.id} accessibilityRole="button" accessibilityState={{selected:area.id===a.id}} onPress={()=>{store.saveSetting('area',a.id);setAreaId(a.id);setSelected(null);}} style={[styles.pill,{backgroundColor:area.id===a.id?colors.ink:colors.pale}]}><Text style={{fontSize:16,fontWeight:'700',color:area.id===a.id?'white':colors.ink}}>{a.name}</Text></Pressable>)}</ScrollView><View style={styles.row}><Text style={{fontSize:42,fontWeight:'800',color:colors.ink}}>{done}<Text style={{fontSize:25,color:colors.muted}}> / {streets.length||'—'}</Text></Text><Text style={styles.text}>gater gått</Text>{analysing&&<Text style={styles.muted}>Sjekker …</Text>}</View></>}
 {tab==='Kart'&&<>
 <View style={{height:390,borderRadius:22,overflow:'hidden'}}>{map(false)}</View>
 <View style={styles.row}><Text style={[styles.muted,{color:colors.green}]}>━ Gått</Text><Text style={[styles.muted,{color:colors.orange}]}>━ Påbegynt</Text><Text style={styles.muted}>━ Gjenstår</Text></View>
 {details&&<Card>{details}</Card>}
 {!streets.length&&<Card><Text style={styles.title}>Gatene i {area.name}</Text><Text style={styles.muted}>Hent gatekartet én gang. Deretter kan gatene registreres uten nett.</Text><Button title={loading?'Henter hele gater …':'Hent gatekart'} disabled={loading} onPress={()=>void fetchArea()}/></Card>}
 <Card><View style={[styles.row,{justifyContent:'space-between'}]}><Text style={styles.title}>{active?'● Registrering på':'Klar for en gate?'}</Text>{active&&<Text style={styles.muted}>{fresh?(position!.accuracy<=15?'GPS klar':`GPS ±${Math.round(position!.accuracy)} m`):'Venter på GPS'}</Text>}</View>
 {!active&&<Text style={styles.muted}>{store.setting('pauseReason','Gatene registreres også med låst skjerm. Sporene lagres på mobilen.')}</Text>}
 <Button title={busy?'Vent …':active?'Pause':'Start registrering'} disabled={busy} onPress={()=>void run(active?stopRecording:start)}/>
 {active&&interrupted&&<><Text style={styles.muted}>GPS-tjenesten har stoppet. Turen er bevart.</Text><Button secondary title="Fortsett registrering" disabled={busy} onPress={()=>void run(start)}/></>}
 </Card>
 </>}
 {tab==='Samling'&&<>
 <View style={styles.row}>{(['Alle','Gått','Gjenstår'] as const).map(f=><Button key={f} title={f} secondary={filter!==f} onPress={()=>setFilter(f)}/>)}</View>
 {streets.filter(s=>filter==='Alle'||(filter==='Gått')===!!progress[s.id]?.collected).map(s=><Pressable key={s.id} accessibilityRole="button" onPress={()=>{setSelected(s.id);setTab('Kart');setFull(true);}} style={[styles.card,{padding:16}]}><View style={[styles.row,{justifyContent:'space-between'}]}><Text style={[styles.title,{flex:1,fontSize:18}]}>{s.name}</Text><Text style={{color:progress[s.id]?.collected?colors.green:colors.muted,fontWeight:'700'}}>{progress[s.id]?.collected?'✓':`${Math.round((progress[s.id]?.fraction??0)*100)} %`}</Text></View><Text style={styles.muted}>{Math.round(streetLength(s))} m{progress[s.id]?.firstVisit?` · Gått ${new Date(progress[s.id].firstVisit!).toLocaleDateString('nb-NO')}`:''}</Text></Pressable>)}
 <Button title={loading?'Henter …':'Oppdater gatekart'} secondary disabled={loading} onPress={()=>void fetchArea()}/>
 <Button title="Hent gater der jeg er" secondary disabled={loading} onPress={()=>void fetchHere()}/>
 <Text style={styles.muted}>{allStreets.filter(s=>progress[s.id]?.collected).length} gater i hele samlingen. Områdevalget begrenser ikke registreringen.</Text>
 </>}
 {tab==='Kampen'&&<>
 <Groups trips={trips}/>
 <Text style={styles.heading}>Finn neste gate.</Text><Text style={styles.muted}>En ledetråd. En gate å oppdage. Gå hele gaten etter at du har åpnet jakten.</Text>
 {hunts.map(h=>{const opened=hunt?.id===h.id;return <Card key={h.id}><Text style={styles.eyebrow}>{areas.find(a=>a.id===h.areaId)?.name.toLocaleUpperCase('nb')} · LEDETRÅDJAKT</Text><Text style={styles.title}>{h.title}{solved[h.id]?' ✓':''}</Text>{opened&&<><Text style={styles.text}>{h.clue}</Text>{hint&&<Text style={styles.muted}>{h.hint}</Text>}{hunt.solvedAt?<Text style={[styles.text,{color:colors.green}]}>Løst! Du fant og gikk {h.streetName}.</Text>:<Button title="Gi meg et hint" secondary onPress={()=>setHint(true)}/>}</>}<Button title={opened?'Se området':solved[h.id]?'Gå jakten igjen':'Åpne jakten'} secondary={opened} onPress={()=>{if(!opened){const next={id:h.id,since:Date.now()};setHunt(next);store.saveSetting('hunt',next);setHint(false);}else{setAreaId(h.areaId);store.saveSetting('area',h.areaId);setTab('Kart');}}}/></Card>;})}
 </>}
 </ScrollView>
 <View style={{flexDirection:'row',borderTopWidth:1,borderTopColor:colors.line,padding:10,backgroundColor:colors.paper}}>{(['Kart','Samling','Kampen'] as const).map(t=><Pressable accessibilityRole="tab" accessibilityState={{selected:tab===t}} key={t} onPress={()=>setTab(t)} style={{flex:1,alignItems:'center',paddingVertical:13,borderRadius:16,backgroundColor:tab===t?colors.pale:'transparent'}}><Text style={{fontSize:18,fontWeight:'700',color:tab===t?colors.ink:colors.muted}}>{t}</Text></Pressable>)}</View>
 <Modal visible={full} animationType="slide" onRequestClose={()=>setFull(false)}><SafeAreaView style={styles.screen}>{map(true)}{details&&<ScrollView style={{maxHeight:'38%'}} contentContainerStyle={{padding:18}}>{details}</ScrollView>}</SafeAreaView></Modal>
 <Modal visible={help} animationType="slide" onRequestClose={()=>setHelp(false)}><SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.body}><Text style={styles.heading}>Gate for gate.</Text><Text style={styles.text}>Gå minst 95 % av gaten på samme tur og besøk alle gateendene. Fortausgange teller. GPS-hull og bilfart fyller ikke inn manglende deler.</Text><Text style={styles.text}>Pause avslutter turen. Delvis gåtte gater fra separate turer legges ikke sammen. Gåtte gater blir værende i samlingen.</Text><Text style={styles.text}>Registreringen stopper etter ti minutter med bekreftet stillstand, eller etter seks timer. Åpne appen og start igjen når du vil gå videre.</Text><Text style={styles.text}>Kun gater i denne utgaven. Trapper og gangstier er ikke konkurransemål.</Text><Text style={styles.muted}>Gatekampen 0.1.0 · Områdegrensene er foreløpige testgrenser. Hele gater beholdes også når de fortsetter utenfor grensen. Kartdata © OpenStreetMap-bidragsytere. Ingen Tråkk-spor importeres automatisk.</Text><Button title="Ferdig" onPress={()=>setHelp(false)}/></ScrollView></SafeAreaView></Modal>
 </SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><Screen/></SafeAreaProvider>;}
