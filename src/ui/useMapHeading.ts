import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import * as Location from 'expo-location';
export function useMapHeading(enabled:boolean){
 const [heading,setHeading]=useState<{degrees:number;time:number}|null>(null),[active,setActive]=useState(AppState.currentState==='active');
 useEffect(()=>{const listener=AppState.addEventListener('change',state=>setActive(state==='active'));return()=>listener.remove();},[]);
 useEffect(()=>{if(!enabled||!active){setHeading(null);return;}let closed=false,watch:Location.LocationSubscription|undefined;
  void Location.watchHeadingAsync(value=>{if(closed)return;const degrees=value.trueHeading>=0?value.trueHeading:value.magHeading;setHeading(value.accuracy>0&&Number.isFinite(degrees)&&degrees>=0?{degrees,time:Date.now()}:null);}).then(value=>{watch=value;if(closed)value.remove();}).catch(()=>setHeading(null));
  const timer=setInterval(()=>setHeading(old=>old&&Date.now()-old.time>5000?null:old),2000);
  return()=>{closed=true;watch?.remove();clearInterval(timer);};
 },[enabled,active]);return heading?.degrees??null;
}
