import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { DEFAULT_APPEARANCE } from '../../packages/herebound-sdk';
import type { Appearance, Item, Skin } from '../../packages/herebound-sdk';
import { relativeHeading } from './usePlayerHeading';
export type MapPlayer = { appearance: Appearance; skin?: Skin | null; equipment: Item[]; level: number };
/** Small, readable counterpart of the account avatar. Feet/ring at map centre. */
export function PlayerMarker({ player, heading, bearing=0, stale=false }: { player?: MapPlayer; heading:number|null; bearing?:number; stale?:boolean }) {
  const a=player?.appearance??DEFAULT_APPEARANCE;
  const face={light:'#f0c9a5',warm:'#cf936a',deep:'#84533d'}[a.skin];
  const hair={dark:'#28302f',copper:'#a35b38',silver:'#d4d8ca'}[a.hair];
  const coat=player?.skin?.style==='ember'?'#a45538':player?.skin?.style==='storm'?'#385b80':'#3d7560';
  const gear=player?.equipment??[];
  const facing=heading!==null&&!stale;
  return <View accessible accessibilityLabel={stale?'Din figur, sist kjente posisjon':facing?`Din figur, mobilen peker ${Math.round(heading!)} grader`:'Din figur, kompass venter'} style={{width:100,height:100,alignItems:'center',opacity:stale?.65:1}}>
    <Svg width={100} height={100} viewBox="-14 -14 128 128">
      {facing&&<G rotation={relativeHeading(heading!,bearing)} origin="50,50"><Path d="M50 50 L20 -4 Q50 -18 80 -4Z" fill="#f8d779" opacity={.25}/><Path d="M50 -10 L60 7 50 3 40 7Z" fill="#ffe293" stroke="#233d32" strokeWidth={2}/></G>}
      <Ellipse cx={50} cy={52} rx={22} ry={12} fill="#162e29" opacity={.65}/><Ellipse cx={50} cy={50} rx={22} ry={12} fill="#425e48" stroke={stale?'#b2b5aa':'#ffe293'} strokeWidth={3}/>
      <Path d="M37 25 Q28 38 31 50 L48 56 69 49 Q69 37 62 25Z" fill={coat} stroke="#17352c" strokeWidth={2}/>
      {gear.some(i=>i.wearable?.visual==='satchel')&&<Rect x={64} y={29} width={12} height={19} rx={3} fill="#ae7846" stroke="#f3d495" strokeWidth={1.5}/>}
      <Path d="M41 40 L40 53 47 54 49 40 M53 40 L54 53 61 53 59 40" fill="#302d27" stroke="#e0bd78" strokeWidth={1}/>
      <Path d={a.body==='woman'?'M40 23 L59 23 56 35 63 43 37 43 44 35Z':'M38 23 L62 23 60 42 40 42Z'} fill={coat} stroke="#d8bd7b" strokeWidth={1.5}/>
      <Path d="M40 35 H60" stroke="#553e29" strokeWidth={3}/><Rect x={48} y={33} width={5} height={5} fill="#f2d38d"/>
      <Circle cx={50} cy={18} r={11} fill={face} stroke="#21372e" strokeWidth={2}/>
      <Path d={a.hairStyle==='swept'?'M39 20 Q34 4 50 5 Q65 4 61 20 L57 13 Q49 21 39 15Z':'M39 18 L38 10 43 4 49 7 55 4 62 10 62 20 57 13 43 13Z'} fill={hair}/>
      {a.hairStyle==='braids'&&<Path d="M39 17 L37 30 M61 17 L63 30" stroke={hair} strokeWidth={5}/>}
      <Circle cx={46} cy={19} r={1.4} fill="#253b32"/><Circle cx={54} cy={19} r={1.4} fill="#253b32"/>
      {gear.some(i=>i.wearable?.visual==='staff')&&<G><Path d="M76 52 L76 16 Q68 7 77 4" fill="none" stroke="#5d422b" strokeWidth={4}/><Circle cx={77} cy={5} r={3} fill="#f8da8d"/></G>}
      {gear.some(i=>i.wearable?.visual==='lantern')&&<G><Circle cx={65} cy={44} r={9} fill="#ffc868" opacity={.3}/><Rect x={62} y={39} width={6} height={9} rx={1} fill="#ffe39a" stroke="#745132"/></G>}
    </Svg>
    <View style={{position:'absolute',top:65,backgroundColor:'#17382ef2',borderRadius:8,borderWidth:1,borderColor:'#d6bd80',paddingHorizontal:7,paddingVertical:3}}><Text style={{color:'#fff2ca',fontSize:10,fontWeight:'800'}}>{stale?'SIST':`DEG${player?` · ${player.level}`:''}`}</Text></View>
  </View>;
}
