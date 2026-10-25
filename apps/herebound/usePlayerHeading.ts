import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
export const relativeHeading = (heading: number, bearing: number) => ((heading - bearing) % 360 + 360) % 360;
/** Phone facing, never GPS course. Listen only while a live map is visible. */
export function usePlayerHeading(enabled: boolean) {
  const [active,setActive]=useState(AppState.currentState==='active');
  const [sample,setSample]=useState<{degrees:number;at:number}|null>(null);
  useEffect(()=>{const sub=AppState.addEventListener('change',s=>setActive(s==='active'));return()=>sub.remove();},[]);
  useEffect(()=>{
    setSample(null);
    if(!enabled||!active)return;
    let closed=false,watch:Location.LocationSubscription|undefined;
    void Location.watchHeadingAsync(value=>{
      if(closed)return;
      const degrees=value.trueHeading>=0?value.trueHeading:value.magHeading;
      if(value.accuracy<=0||!Number.isFinite(degrees)||degrees<0){setSample(null);return;}
      setSample(old=>{
        // Smooth the short arc across north, not a 359-degree turn.
        const delta=old?((degrees-old.degrees+540)%360)-180:0;
        return {degrees:old?(old.degrees+delta*.4+360)%360:degrees,at:Date.now()};
      });
    }).then(value=>{watch=value;if(closed)value.remove();}).catch(()=>{if(!closed)setSample(null);});
    const timer=setInterval(()=>setSample(old=>old&&Date.now()-old.at>5000?null:old),1000);
    return()=>{closed=true;clearInterval(timer);watch?.remove();};
  },[enabled,active]);
  return enabled&&active?sample?.degrees??null:null;
}
