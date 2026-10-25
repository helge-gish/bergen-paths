import parchment from './assets/parchment-map.json';
import { PlayerMarker, type MapPlayer } from './PlayerMarker';
import { EncounterMarker } from './EncounterMarker';
import { usePlayerHeading } from './usePlayerHeading';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Map, Camera, GeoJSONSource, Layer, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { fogFeature, isRevealed, metersBetween } from '../../packages/herebound-sdk';
import { GamePortal } from './GamePortal';
import type { Encounter, GamePack, GameProgress, Point } from '../../packages/herebound-sdk';
const parchmentStyle = JSON.stringify(parchment);
const button = { padding: 13, backgroundColor: '#fffaf0', borderRadius: 12, margin: 8 } as const;
/** Host presentation: no game-specific IDs or tracking/collection code from Tråkk. */
export function FieldMap({ pack, position, progress, onSelect, navigation = false, player, positionLive = false }: { player?: MapPlayer; positionLive?: boolean; pack: GamePack; position: Point | null; progress?: GameProgress; onSelect?(e: Encounter): void; navigation?: boolean }) {
  const camera = useRef<CameraRef>(null);
  const [failed, setFailed] = useState(false);
  const [bearing,setBearing]=useState(0);
  const heading=usePlayerHeading(positionLive && !!position);
  const fantasy=pack.mapTheme==='parchment';
  const fog = useMemo(() => fogFeature(pack, progress?.revealed), [pack, progress?.revealed]);
  const known = progress ? pack.encounters.filter(e => progress.discovered.includes(e.id) || isRevealed(pack, progress, e.position)) : [];
  const center = position ?? pack.start.position;
  const entrance = pack.start.position;
  const startZone = useMemo(()=>({type:'Feature' as const,properties:{},geometry:{type:'Polygon' as const,coordinates:[Array.from({length:65},(_,i)=>{const angle=i*Math.PI/32;return [entrance.longitude+Math.cos(angle)*pack.start.radiusMeters/(111195*Math.cos(entrance.latitude*Math.PI/180)),entrance.latitude+Math.sin(angle)*pack.start.radiusMeters/111195];})]}}),[pack]);
  const initialCenter = navigation && position ? {latitude:(position.latitude+entrance.latitude)/2,longitude:(position.longitude+entrance.longitude)/2} : center;

  return <View style={{ flex: 1, minHeight: 300, backgroundColor: '#152b29' }}>
    <Map style={{ flex: 1 }} mapStyle={fantasy?parchmentStyle:'https://tiles.openfreemap.org/styles/liberty'} onRegionIsChanging={({nativeEvent})=>{if(Number.isFinite(nativeEvent.bearing))setBearing(nativeEvent.bearing);}} onRegionDidChange={({nativeEvent})=>{if(Number.isFinite(nativeEvent.bearing))setBearing(nativeEvent.bearing);}} attribution logo={false} onDidFailLoadingMap={() => setFailed(true)} onDidFinishLoadingMap={() => setFailed(false)}>
      <Camera ref={camera} initialViewState={{ center: [initialCenter.longitude, initialCenter.latitude], zoom: navigation ? (position && metersBetween(position,entrance)>700?13:15.8) : 17 }} />
      {navigation && <GeoJSONSource id="start-zone" data={startZone}><Layer id="start-area" type="fill" paint={{'fill-color':'#d4b562','fill-opacity':.16}}/><Layer id="start-border" type="line" paint={{'line-color':'#95772b','line-width':2,'line-dasharray':[3,2]}}/></GeoJSONSource>}
      {!navigation && <GeoJSONSource id="fog" data={fog}><Layer id="unexplored" type="fill" paint={{ 'fill-color': fantasy?'#26382e':'#152b29', 'fill-opacity': 1, 'fill-antialias': false }} /></GeoJSONSource>}
      <Marker anchor="bottom" lngLat={[pack.start.position.longitude, pack.start.position.latitude]}><GamePortal start={pack.start}/></Marker>
      {known.map(e => <Marker key={e.id} lngLat={[e.position.longitude, e.position.latitude]} onPress={() => onSelect?.(e)}><View style={{ alignItems: 'center', paddingBottom: 30 }}><EncounterMarker visual={e.visual} complete={!!e.interaction&&progress!.journal.some(j=>j.id===e.interaction!.clue.id)}/><Text style={{ backgroundColor: '#fff9e8', color: '#253c31', fontSize: 12, padding: 3 }}>{`${progress!.discovered.includes(e.id) ? e.name : e.mapLabel ?? 'Nytt funn'}${e.interaction && progress!.journal.some(j=>j.id===e.interaction!.clue.id)?' ✓':''}`}</Text></View></Marker>)}
      {position && <Marker id="player" lngLat={[position.longitude, position.latitude]}><PlayerMarker player={player} heading={heading} bearing={bearing} stale={!positionLive}/></Marker>}
    </Map>
    <Pressable accessibilityRole="button" accessibilityLabel="Vend kartet mot nord" onPress={()=>camera.current?.setStop({bearing:0,duration:350})} style={[button,{position:'absolute',right:0,top:0,alignItems:'center'}]}><Text style={{color:'#253c31',fontWeight:'800',transform:[{rotate:`${-bearing}deg`}]}}>N ↑</Text></Pressable>
    {position&&(!positionLive||heading===null)&&<View pointerEvents="none" style={{position:'absolute',left:10,bottom:36,backgroundColor:'#17382ee8',padding:6,borderRadius:8}}><Text style={{color:'#fff2ce',fontSize:11}}>{!positionLive?'Sist kjent posisjon':'Kompass venter'}</Text></View>}
    <Pressable accessibilityRole="button" accessibilityLabel="Tilbake til min posisjon" onPress={() => camera.current?.flyTo({ center: [center.longitude, center.latitude], zoom: 18, duration: 500 })} style={[button, { position: 'absolute', right: 0, bottom: 28 }]}><Text style={{ color: '#253c31', fontWeight: '700' }}>◎ Meg</Text></Pressable>
    {failed && <View style={{ position: 'absolute', left: 8, bottom: 8, backgroundColor: '#fff3d4', padding: 10 }}><Text>Kartet kunne ikke lastes. Sjekk nettforbindelsen.</Text></View>}
  </View>;
}
