import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';
import type { GamePack } from '../../packages/herebound-sdk';
/** Declarative entrance presentation: games select the motif and colour; host owns animation. */
export function GamePortal({start,large=false}:{start:GamePack['start'];large?:boolean}) {
 const visual=start.presentation??{motif:'beacon',accent:'#9be3cf',label:'SPILLSTART'};
 const pulse=useRef(new Animated.Value(0)).current,[motion,setMotion]=useState(false),[active,setActive]=useState(AppState.currentState!=='background');
 useEffect(()=>{let alive=true;void AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(alive)setMotion(!v)});const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',v=>setMotion(!v));const app=AppState.addEventListener('change',s=>setActive(s==='active'));return()=>{alive=false;sub.remove();app.remove();};},[]);
 useEffect(()=>{if(!motion||!active)return;const loop=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:2000,useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:2000,useNativeDriver:true})]));loop.start();return()=>{loop.stop();pulse.setValue(0)};},[motion,active]);
 const width=large?170:112,height=large?180:126;
 return <View style={{width,alignItems:'center'}} accessible accessibilityLabel={`${visual.label}: ${start.name}`}>
  <View style={{width,height}}>
   <Animated.View pointerEvents="none" style={{position:'absolute',left:width*.18,top:height*.1,width:width*.64,height:height*.72,borderRadius:100,backgroundColor:visual.accent,opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.08,.24]}),transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[.85,1.12]})}]}}/>
   <Svg width="100%" height="100%" viewBox="0 0 140 154">
    <Defs><LinearGradient id="gate-light" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={visual.accent} stopOpacity=".15"/><Stop offset="1" stopColor={visual.accent} stopOpacity=".9"/></LinearGradient><LinearGradient id="gate-stone" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#586c65"/><Stop offset="1" stopColor="#172f2a"/></LinearGradient></Defs>
    <Ellipse cx="70" cy="132" rx="54" ry="15" fill="#122b26" opacity=".8"/><Ellipse cx="70" cy="129" rx="44" ry="10" stroke={visual.accent} strokeWidth="1.5" fill="none"/>
    <Path d="M29 126 L70 111 112 127 70 141Z" fill="#40574a" stroke={visual.accent} strokeWidth="1"/>
    {visual.motif==='rune-gate'?<G>
     <Path d="M36 126 V61 Q36 24 70 20 Q104 24 104 61 V126 L92 130 V63 Q92 36 70 34 Q48 36 48 63 V130Z" fill="url(#gate-stone)" stroke="#c5b882" strokeWidth="2"/>
     <Path d="M49 127 V63 Q49 39 70 36 Q91 39 91 63 V127Z" fill="#102d2b"/>
     <Path d="M51 127 V64 Q51 42 70 39 Q89 42 89 64 V127Z" fill="url(#gate-light)"/>
     <Path d="M57 119 Q82 97 63 83 T76 49 M78 123 Q57 100 79 78" stroke={visual.accent} strokeWidth="2" fill="none" opacity=".7"/>
     <Path d="M36 75 L48 75 M36 98 L48 98 M92 75 L104 75 M92 98 L104 98 M43 39 L52 48 M88 48 L98 38" stroke="#102c26" strokeWidth="3"/>
     <Path d="M66 21 L70 12 75 21 71 31Z M40 86 L44 80 45 91 M98 84 L101 89 97 94" fill="none" stroke={visual.accent} strokeWidth="2"/>
     <Path d="M27 126 V94 L32 87 37 94 V127 M103 126 V94 L108 87 113 94 V127" fill="#29453a" stroke="#c5b882"/><Circle cx="32" cy="89" r="5" fill={visual.accent}/><Circle cx="108" cy="89" r="5" fill={visual.accent}/>
    </G>:visual.motif==='camp'?<G><Path d="M25 126 L70 44 115 126Z" fill="url(#gate-stone)" stroke={visual.accent} strokeWidth="2"/><Path d="M48 126 L70 73 91 126Z" fill="url(#gate-light)"/><Path d="M70 46 V28 L96 35 70 43" stroke={visual.accent} strokeWidth="2" fill="#496355"/></G>:<G><Path d="M58 125 L62 60 78 60 82 125Z" fill="url(#gate-stone)" stroke={visual.accent}/><Path d="M70 25 L91 52 70 81 49 52Z" fill="url(#gate-light)" stroke={visual.accent} strokeWidth="2"/><Ellipse cx="70" cy="53" rx="39" ry="13" fill="none" stroke={visual.accent}/></G>}
    <G fill={visual.accent}><Circle cx="22" cy="70" r="2"/><Circle cx="116" cy="48" r="2"/><Path d="M106 25 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2Z M22 104 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2Z"/></G>
   </Svg>
  </View>
  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.75} style={{fontSize:large?12:9,fontWeight:'800',letterSpacing:.4,color:'#fff2cf',backgroundColor:'#17382e',paddingHorizontal:6,paddingVertical:5,borderRadius:8,textAlign:'center',marginTop:-2}}>{visual.label}</Text>
 </View>;
}
