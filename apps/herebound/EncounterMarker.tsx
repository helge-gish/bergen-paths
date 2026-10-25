import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import type { Encounter } from '../../packages/herebound-sdk';
/** Small host glyphs: game declares the type; host draws the map symbol. */
export function EncounterMarker({ visual, complete=false }: { visual: Encounter['visual']; complete?:boolean }) {
  return <Svg width={40} height={44} viewBox="0 0 40 44" accessible={false}>
    <Path d="M20 43 L13 34 H27Z" fill="#273d32"/>
    <Circle cx={20} cy={20} r={18} fill={complete?'#d5dfb6':'#fff0c3'} stroke="#5a5138" strokeWidth={2}/>
    {visual==='berries'?<G><Path d="M13 14 Q20 7 28 12 L21 17" stroke="#467044" strokeWidth={3} fill="none"/>{[[13,20],[21,18],[27,23],[17,27]].map(([x,y],i)=><Circle key={i} cx={x} cy={y} r={4.5} fill="#b74732" stroke="#71352c"/>)}</G>:visual==='lantern'?<G><Path d="M16 12 Q16 5 24 12 M12 14 H28 L25 31 H15Z" fill="#f6ca65" stroke="#5f5736" strokeWidth={2}/><Path d="M19 17 H23 L24 27 H18Z" fill="#fff4b7"/></G>:visual==='satchel'?<G><Rect x={10} y={14} width={20} height={17} rx={4} fill="#a37149" stroke="#58462d" strokeWidth={2}/><Rect x={10} y={10} width={20} height={7} rx={3} fill="#a5b079" stroke="#58462d"/><Path d="M16 15 V29 M24 15 V29" stroke="#f0cc83" strokeWidth={2}/></G>:visual==='merchant'?<G><Path d="M8 19 L12 10 H28 L32 19Z" fill="#9b5944" stroke="#58462d"/><Path d="M12 19 V31 M28 19 V31 M10 27 H30" stroke="#58462d" strokeWidth={3}/><Path d="M16 11 L14 19 M24 11 L26 19" stroke="#ffe7ae" strokeWidth={3}/></G>:<G><Path d="M11 32 Q11 18 20 18 Q29 18 29 32Z" fill="#537d54"/><Circle cx={20} cy={15} r={7} fill="#d8b47c"/><Path d="M13 14 L16 7 24 7 27 14Z" fill="#68834c"/></G>}
    {complete&&<G><Circle cx={32} cy={33} r={8} fill="#274f3c"/><Path d="M28 33 L31 36 36 30" fill="none" stroke="#fff0b9" strokeWidth={2}/></G>}
  </Svg>;
}
