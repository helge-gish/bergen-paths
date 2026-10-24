import React, { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Map, Camera, GeoJSONSource, Layer, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { fogFeature, isRevealed, metersBetween } from '../../packages/herebound-sdk';
import { GamePortal } from './GamePortal';
import type { Encounter, GamePack, GameProgress, Point } from '../../packages/herebound-sdk';
const button = { padding: 13, backgroundColor: '#fffaf0', borderRadius: 12, margin: 8 } as const;
/** Host presentation: no game-specific IDs or tracking/collection code from Tråkk. */
export function FieldMap({ pack, position, progress, onSelect, navigation = false }: { pack: GamePack; position: Point | null; progress?: GameProgress; onSelect?(e: Encounter): void; navigation?: boolean }) {
  const camera = useRef<CameraRef>(null);
  const [failed, setFailed] = useState(false);
  const [plain, setPlain] = useState(navigation);
  const fog = useMemo(() => fogFeature(pack, progress?.revealed), [pack, progress?.revealed]);
  const known = progress ? pack.encounters.filter(e => progress.discovered.includes(e.id) || isRevealed(pack, progress, e.position)) : [];
  const center = position ?? pack.start.position;
  const entrance = pack.start.position;
  const startZone = useMemo(()=>({type:'Feature' as const,properties:{},geometry:{type:'Polygon' as const,coordinates:[Array.from({length:65},(_,i)=>{const angle=i*Math.PI/32;return [entrance.longitude+Math.cos(angle)*pack.start.radiusMeters/(111195*Math.cos(entrance.latitude*Math.PI/180)),entrance.latitude+Math.sin(angle)*pack.start.radiusMeters/111195];})]}}),[pack]);
  const initialCenter = navigation && position ? {latitude:(position.latitude+entrance.latitude)/2,longitude:(position.longitude+entrance.longitude)/2} : center;

  return <View style={{ flex: 1, minHeight: 300, backgroundColor: '#152b29' }}>
    <Map style={{ flex: 1 }} mapStyle="https://tiles.openfreemap.org/styles/liberty" attribution logo={false} onDidFailLoadingMap={() => setFailed(true)} onDidFinishLoadingMap={() => setFailed(false)}>
      <Camera ref={camera} initialViewState={{ center: [initialCenter.longitude, initialCenter.latitude], zoom: navigation ? (position && metersBetween(position,entrance)>700?13:15.8) : 17 }} />
      {navigation && <GeoJSONSource id="start-zone" data={startZone}><Layer id="start-area" type="fill" paint={{'fill-color':'#d4b562','fill-opacity':.16}}/><Layer id="start-border" type="line" paint={{'line-color':'#95772b','line-width':2,'line-dasharray':[3,2]}}/></GeoJSONSource>}
      {!plain && <GeoJSONSource id="fog" data={fog}><Layer id="unexplored" type="fill" paint={{ 'fill-color': '#152b29', 'fill-opacity': 1, 'fill-antialias': false }} /></GeoJSONSource>}
      <Marker anchor="bottom" lngLat={[pack.start.position.longitude, pack.start.position.latitude]}><GamePortal start={pack.start}/></Marker>
      {known.map(e => <Marker key={e.id} lngLat={[e.position.longitude, e.position.latitude]} onPress={() => onSelect?.(e)}><View style={{ alignItems: 'center', paddingBottom: 30 }}><View style={{ backgroundColor: '#f9edc5', borderRadius: 20, borderColor: '#314739', borderWidth: 2, padding: 8 }}><Text style={{ color: '#314739', fontWeight: '800' }}>{e.visual === 'berries' ? '●' : e.visual === 'lantern' ? '✦' : e.kind === 'merchant' ? '◆' : '●'}</Text></View><Text style={{ backgroundColor: '#fff9e8', color: '#253c31', fontSize: 12, padding: 3 }}>{`${progress!.discovered.includes(e.id) ? e.name : e.mapLabel ?? 'Nytt funn'}${e.interaction && progress!.journal.some(j=>j.id===e.interaction!.clue.id)?' ✓':''}`}</Text></View></Marker>)}
      {position && <Marker lngLat={[position.longitude, position.latitude]}><View style={{ width: 17, height: 17, borderRadius: 10, backgroundColor: '#427fec', borderWidth: 3, borderColor: 'white' }}/></Marker>}
    </Map>
    {!navigation && <Pressable accessibilityRole="button" accessibilityLabel={plain ? 'Vis utforskingskart' : 'Vis vanlig turkart'} onPress={() => setPlain(!plain)} style={[button, { position: 'absolute', left: 0, top: 0 }]}><Text style={{ color: '#253c31', fontWeight: '700' }}>{plain ? 'Utforskingskart' : 'Turkart'}</Text></Pressable>}
    <Pressable accessibilityRole="button" accessibilityLabel="Tilbake til min posisjon" onPress={() => camera.current?.flyTo({ center: [center.longitude, center.latitude], zoom: 18, duration: 500 })} style={[button, { position: 'absolute', right: 0, bottom: 28 }]}><Text style={{ color: '#253c31', fontWeight: '700' }}>◎ Meg</Text></Pressable>
    {failed && <View style={{ position: 'absolute', left: 8, bottom: 8, backgroundColor: '#fff3d4', padding: 10 }}><Text>Kartet kunne ikke lastes. Sjekk nettforbindelsen.</Text></View>}
  </View>;
}
