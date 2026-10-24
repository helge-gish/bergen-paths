import React, { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, Text, View } from 'react-native';
import { requireOptionalNativeModule, requireNativeView } from 'expo';
import { useCameraPermissions } from 'expo-camera';
import type { Encounter } from '../../packages/herebound-sdk';
type State = { state: string; reason: string; targetId?: string };
const native = requireOptionalNativeModule<{ availability(): Promise<string>; install(): Promise<boolean> }>('HereboundAr');
const Native = native ? requireNativeView<any>('HereboundAr') : null;
const style = { padding: 14, backgroundColor: '#f6e8b7', borderRadius: 12 } as const;
export function FieldCamera({ encounter, lit, onSelect }: { encounter?: Encounter; lit: boolean; onSelect(e: Encounter): void }) {
  const [permission, request] = useCameraPermissions();
  const [support, setSupport] = useState('checking'), [attempt, setAttempt] = useState(0), [placement, setPlacement] = useState(0);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [state, setState] = useState<State>({ state: 'searching', reason: 'Åpner AR-kamera …' });
  useEffect(() => { const sub=AppState.addEventListener('change', value => { setActive(value === 'active'); if(value === 'active') setAttempt(a=>a+1); });return()=>sub.remove(); },[]);
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
  useEffect(()=>{setPlacement(0);setState({state:'searching',reason:'Pek rolig mot bakken foran deg.'});},[encounter?.id,attempt]);
  if(!permission?.granted)return <View style={{padding:24,gap:16}}><Text style={{color:'#fff',fontSize:18}}>Kameraet viser spillfigurer i terrenget.</Text><Pressable style={style} onPress={()=>void (permission?.canAskAgain === false ? Linking.openSettings() : request())}><Text>{permission?.canAskAgain === false ? 'Åpne kamerainnstillinger' : 'Tillat kamera'}</Text></Pressable></View>;
  if(support!=='ready' || !Native)return <View style={{padding:24,gap:16}}><Text style={{color:'#fff'}}>{support==='install'?'AR trenger Google Play-tjenester for AR.':support==='checking'?'Kontrollerer AR …':'AR er ikke tilgjengelig akkurat nå. Du kan fortsatt bruke kartet. Stedlige handlinger krever AR.'}</Text><Pressable style={style} onPress={()=>void (async()=>{if(support==='install')await native?.install();setAttempt(a=>a+1);})()}><Text>{support==='install'?'Installer / oppdater AR':'Prøv AR igjen'}</Text></Pressable></View>;
  return <View style={{flex:1}}>
    {active && <Native key={`${encounter?.id ?? 'scan'}-${attempt}`} style={{flex:1}} active={active} placement={placement} scene={encounter ? {id:encounter.id,kind:encounter.visual ?? 'lantern',lit} : null}
      onState={({nativeEvent}: {nativeEvent:State})=>setState(nativeEvent)} onInteract={({nativeEvent}: {nativeEvent:{id:string}})=>{if(encounter?.id===nativeEvent.id)onSelect(encounter);}}/>}
    <View pointerEvents="box-none" style={{position:'absolute',left:16,right:16,bottom:20,gap:10}}>
      <Text style={{color:'#fff7dc',fontSize:15,backgroundColor:'#10271ee8',padding:12,borderRadius:12}}>{!encounter?'Gå nærmere et funn på kartet for å møte det i AR.':state.reason}</Text>
      {encounter && state.state!=='unavailable' && <Pressable style={style} onPress={()=>setPlacement(p=>p+1)}><Text style={{fontWeight:'700',textAlign:'center'}}>{state.state==='anchored'?'Plasser på nytt':'Plasser foran meg'}</Text></Pressable>}
      {state.state==='unavailable' && <Pressable style={style} onPress={()=>setAttempt(a=>a+1)}><Text>Åpne kamera igjen</Text></Pressable>}
      {encounter && state.state==='anchored' && <Pressable style={style} onPress={()=>onSelect(encounter)}><Text style={{fontWeight:'700',textAlign:'center'}}>Undersøk funnet</Text></Pressable>}
    </View>
  </View>;
}
