import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import type { Encounter, GamePack, Point } from '../../packages/herebound-sdk';

export function WorldMap({ pack, position, discovered, onSelect }: { pack: GamePack; position: Point; discovered: string[]; onSelect(e: Encounter): void }) {
  const points = [pack.start.position, position, ...pack.encounters.map(e => e.position)];
  const minLat = Math.min(...points.map(p => p.latitude)) - .0004, maxLat = Math.max(...points.map(p => p.latitude)) + .0004;
  const minLon = Math.min(...points.map(p => p.longitude)) - .0006, maxLon = Math.max(...points.map(p => p.longitude)) + .0006;
  const xy = (p: Point) => ({ x: 32 + (p.longitude - minLon) / (maxLon - minLon) * 276, y: 270 - (p.latitude - minLat) / (maxLat - minLat) * 235 });
  const you = xy(position);
  return <View style={styles.map}>
    <Svg width="100%" height={300} viewBox="0 0 340 300" accessibilityLabel="Skjematisk prøveverden, ikke et turkart">
      <Path d="M-20 190 Q70 35 170 75 T370 15 M-20 225 Q80 75 180 105 T370 55 M-20 260 Q90 115 190 145 T370 95 M-20 295 Q90 155 200 185 T370 145" stroke="#b3be9c" strokeWidth={1} fill="none" opacity={.6}/>
      <Path d="M32 280 Q95 150 150 190 T300 40" stroke="#a39b78" strokeWidth={2} strokeDasharray="4 7" fill="none"/>
      {[{ x: 40, y: 45 }, { x: 245, y: 230 }, { x: 285, y: 115 }].map((p, i) => <G key={i} opacity={.32}><Path d={`M${p.x} ${p.y} l-17 35 h34 Z M${p.x} ${p.y + 16} l-22 36 h44 Z`} fill="#68795b"/></G>)}
      <SvgText x={305} y={25} fill="#50634c" fontSize={12}>N ↑</SvgText>
      {pack.encounters.map((e, i) => { const p = xy(e.position), known = discovered.includes(e.id); return <G key={e.id} onPress={() => onSelect(e)}>
        <Circle cx={p.x} cy={p.y} r={22} fill={known ? '#263a30' : '#f7f4e8'} stroke="#263a30" strokeWidth={1.5}/>
        <SvgText x={p.x} y={p.y + 6} textAnchor="middle" fontSize={19} fontWeight="bold" fill={known ? '#f6e3a1' : '#263a30'}>{known ? i + 1 : '?'}</SvgText>
      </G>; })}
      <Circle cx={you.x + 16} cy={you.y + 19} r={9} fill="#b75b3d" stroke="#fffdf3" strokeWidth={3}/>
    </Svg>
    <Text style={styles.caption}>SKJEMATISK KART · SIMULATOR</Text>
  </View>;
}
export function PortalArt() {
  return <Svg width="100%" height={160} viewBox="0 0 340 160" accessibilityElementsHidden>
    <Circle cx={250} cy={35} r={24} fill="#d5b96d" opacity={.9}/>
    <Path d="M0 130 L80 40 L145 102 L210 60 L340 143 V160 H0Z" fill="#4c6250"/>
    <Path d="M0 150 L70 112 L130 142 L238 97 L340 143 V160 H0Z" fill="#203c32"/>
    <Path d="M139 160 V80 a31 31 0 0 1 62 0 V160" stroke="#d5b96d" strokeWidth={7} fill="#152a24"/>
    <Path d="M145 160 L167 117 L176 117 L194 160" fill="#d5b96d" opacity={.35}/>
    <Circle cx={170} cy={91} r={4} fill="#f6e3a1"/>
  </Svg>;
}
const styles = StyleSheet.create({ map: { backgroundColor: '#e4e8d5', borderRadius: 20, overflow: 'hidden' }, caption: { textAlign: 'center', fontSize: 10, letterSpacing: 2, color: '#50634c', paddingBottom: 12 } });
