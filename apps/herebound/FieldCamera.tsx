import React, { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { requireOptionalNativeModule, requireNativeView } from 'expo';
import { useCameraPermissions } from 'expo-camera';
import type { Encounter } from '../../packages/herebound-sdk';
type State = { state: string; reason: string; targetId?: string };
type Target = { id: string; x: number; y: number; visible: boolean };
const native = requireOptionalNativeModule<{ availability(): Promise<string>; install(): Promise<boolean> }>('HereboundAr');
const Native = native ? requireNativeView<any>('HereboundAr') : null;
const style = { padding: 12, minHeight: 46, justifyContent: 'center', backgroundColor: '#f6e8b7', borderRadius: 12 } as const;
export function FieldCamera({ encounter, lit, onSelect, demo = false, meters, emptyMessage = 'Velg et funn i nærheten på kartet.' }: { encounter?: Encounter; lit: boolean; onSelect(e: Encounter): void; emptyMessage?: string; demo?: boolean; meters?: number }) {
  const [permission, request] = useCameraPermissions();
  const [support, setSupport] = useState('checking'), [attempt, setAttempt] = useState(0), [placement, setPlacement] = useState(0);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [state, setState] = useState<State>({ state: 'searching', reason: 'Åpner AR-kamera …' });
  const [target, setTarget] = useState<Target | null>(null), [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => { const sub=AppState.addEventListener('change', value => { setActive(value === 'active'); setTarget(null); setState({state:'searching',reason:'Åpner AR-kamera …'}); if(value === 'active') setAttempt(a=>a+1); });return()=>sub.remove(); },[]);
  useEffect(() => {
    let done=false; let timer: ReturnType<typeof setTimeout> | undefined;
    async function check(n=0) {
      let result='unsupported';try { result=await native?.availability() ?? 'unsupported'; } catch {}
      if(done)return;
      if(result==='checking' && n<5) {timer=setTimeout(()=>void check(n+1),600);return;}
      setSupport(result==='checking'?'unsupported':result);
    }
    if(permission?.granted && active) void check();
    return()=>{done=true;clearTimeout(timer);};
  },[permission?.granted,attempt,active]);
  useEffect(()=>{setPlacement(0);setTarget(null);setState({state:'searching',reason:'Pek mot bakken · funnet dukker opp automatisk'});},[encounter?.id,attempt]);
  const anchored = active && !!encounter && state.state==='anchored' && state.targetId===encounter.id;
  const visible = anchored && target?.id===encounter?.id && target.visible;
  const place = () => {setTarget(null);setState({state:'surface',reason:'Pek mot bakken · funnet dukker opp automatisk'});setPlacement(p=>p+1);};
  const inspect = () => {if(!demo && visible && encounter)onSelect(encounter);};
  if(!permission?.granted)return <View style={{padding:24,gap:16}}><Text style={{color:'#fff',fontSize:18}}>Kameraet viser spillfigurer i terrenget.</Text><Pressable accessibilityRole="button" style={style} onPress={()=>void (permission?.canAskAgain === false ? Linking.openSettings() : request())}><Text>{permission?.canAskAgain === false ? 'Åpne kamerainnstillinger' : 'Tillat kamera'}</Text></Pressable></View>;
  if(support!=='ready' || !Native)return <View style={{padding:24,gap:16}}><Text style={{color:'#fff'}}>{support==='install'?'AR trenger Google Play-tjenester for AR.':support==='checking'?'Kontrollerer AR …':'AR er ikke tilgjengelig akkurat nå. Bruk kartet eller prøv igjen.'}</Text><Pressable accessibilityRole="button" style={style} onPress={()=>void (async()=>{if(support==='install')await native?.install();setAttempt(a=>a+1);})()}><Text>{support==='install'?'Installer / oppdater AR':'Prøv AR igjen'}</Text></Pressable></View>;
  const label=encounter?.mapLabel ?? encounter?.name ?? 'Se deg rundt';
  const kind=encounter?.kind==='merchant'?'Handelssted':encounter?.kind==='person'?'Figur':encounter?.visual==='berries'?'Ingrediens':'Funn';
  const status=state.state==='unavailable'?state.reason:!encounter?emptyMessage:anchored?(visible?(demo?'Kameratest · ingen spillbelønning':'Trykk på funnet eller knappen'):'Utenfor bildet · snu deg eller plasser på nytt'):state.reason;
  const point=visible && target ? {x:target.x*size.width,y:target.y*size.height}:null;
  const labelX=point?Math.max(8,Math.min(size.width-158,point.x-75)):0;
  const labelY=point?Math.max(80,point.y-43):0;
  return <View style={{flex:1}} onLayout={e=>setSize(e.nativeEvent.layout)}>
    {active && <Native key={`${encounter?.id ?? 'scan'}-${attempt}`} style={{flex:1}} active={active} placement={placement} scene={encounter ? {id:encounter.id,kind:encounter.visual ?? 'lantern',lit} : null}
      onState={({nativeEvent}: {nativeEvent:State})=>{setState(nativeEvent);if(nativeEvent.state!=='anchored')setTarget(null);}}
      onTarget={({nativeEvent}: {nativeEvent:Target})=>{if(nativeEvent.id===encounter?.id)setTarget(nativeEvent);}}
      onInteract={({nativeEvent}: {nativeEvent:{id:string}})=>{if(encounter?.id===nativeEvent.id)inspect();}}/>}
    <View pointerEvents="none" style={{position:'absolute',top:10,left:10,right:10,padding:10,borderRadius:12,backgroundColor:'#10271ee8',gap:3}}>
      <Text style={{color:'#fff7dc',fontSize:16,fontWeight:'700'}}>{label}</Text>
      <Text style={{color:'#f6e8b7',fontSize:12}}>{encounter?`${kind} · miniatyr${meters!==undefined?` · ca. ${Math.round(meters)} m til funnsted`:''}`:'Ingen valgt'}</Text>
    </View>
    {!anchored && encounter && state.state!=='unavailable' && <View pointerEvents="none" style={{position:'absolute',left:'50%',top:'58%',marginLeft:-18,marginTop:-18,width:36,height:36,borderRadius:18,borderWidth:2,borderColor:'#f6e8b7',alignItems:'center',justifyContent:'center'}}><Text style={{color:'#fff',fontSize:22}}>＋</Text></View>}
    {point && size.width>0 && <>
      <Svg pointerEvents="none" width={size.width} height={size.height} style={{position:'absolute',top:0,left:0}}><Line x1={labelX+75} y1={labelY+28} x2={point.x} y2={point.y} stroke="#ffe8a6" strokeWidth={2} strokeDasharray="4 4"/><Circle cx={point.x} cy={point.y} r={4} fill="#ffe8a6"/></Svg>
      <Pressable accessibilityRole="button" accessibilityLabel={`Undersøk ${label}`} onPress={inspect} style={{position:'absolute',left:labelX,top:labelY,width:150,minHeight:36,borderRadius:10,padding:7,backgroundColor:'#10271ef0',borderWidth:1,borderColor:'#ffe8a6'}}><Text numberOfLines={1} style={{textAlign:'center',color:'#fff7dc',fontWeight:'700',fontSize:12}}>{label}</Text></Pressable>
    </>}
    <View pointerEvents="box-none" style={{position:'absolute',left:10,right:10,bottom:10,gap:6}}>
      <Text accessibilityLiveRegion="polite" style={{color:'#fff7dc',fontSize:12,backgroundColor:'#10271ee8',padding:7,borderRadius:8}}>{status}</Text>
      {state.state==='unavailable'?<Pressable accessibilityRole="button" style={style} onPress={()=>setAttempt(a=>a+1)}><Text>Åpne kamera igjen</Text></Pressable>:encounter&&<View style={{flexDirection:'row',gap:8}}>
        {!demo && visible?<><Pressable accessibilityRole="button" style={[style,{flex:1}]} onPress={inspect}><Text style={{fontWeight:'700',textAlign:'center'}}>{encounter.kind==='merchant'?'Snakk / handle':encounter.kind==='person'?`Snakk med ${label}`:`Undersøk ${label.toLocaleLowerCase('nb-NO')}`}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Plasser på nytt" style={[style,{minWidth:46}]} onPress={place}><Text style={{fontSize:22,textAlign:'center'}}>↻</Text></Pressable></>:anchored?<Pressable accessibilityRole="button" accessibilityLabel="Plasser på nytt" style={style} onPress={place}><Text style={{textAlign:'center'}}>↻ Plasser på nytt</Text></Pressable>:null}
      </View>}
    </View>
  </View>;
}
