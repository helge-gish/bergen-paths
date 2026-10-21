import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgUri } from 'react-native-svg';
import { getStore } from '../data/native';
import { FOOT_ROUTE_TILES, mapBackground, mapStyle as backgroundStyle, type MapBackground } from '../domain/mapStyles';
import { Map, Camera, GeoJSONSource, RasterSource, Layer, Marker, type CameraRef, type ViewState } from '@maplibre/maplibre-react-native';
import type { FeatureCollection, LineString } from 'geojson';
import type { Coordinate, Fix, Peak, Trail, Trip } from '../domain/types';
import { cleanPoints, coordinateBounds, distance, segments } from '../domain/geo';
import { colors, styles as s } from './theme';
import { Icon } from './components';
import { mapSelection, type MapBounds } from '../domain/mapSelection';
import type { Discovery } from '../domain/discoveries';
import { mapFeatures, mapInk, mapItems, pickedMapTrail } from '../domain/mapPresentation';
import { MapKey, MapTrailCard } from './MapDetails';
const EMPTY_POINTS: Fix[] = [];
const EMPTY_TRIPS: Trip[] = [];
const EMPTY_TRAILS: Trail[] = [];
const EMPTY_DISCOVERIES: Discovery[] = [];
const EMPTY_PEAKS: Peak[] = [];
type Props = { onStartTrail?: (item: Discovery) => void; positionStale?: boolean; segmentStart?: Coordinate | null; segmentEnd?: Coordinate | null; startPosition?: Coordinate; guideStart?: boolean; recenter?: number; fitRoute?: boolean; fitReference?: boolean; selectedDiscovery?: Discovery | null; trips?: Trip[]; trails?: Trail[]; discoveries?: Discovery[]; awards?: Record<string, number>; peaks?: Peak[]; current?: Fix[]; reference?: Fix[]; ghost?: Coordinate | null; position?: Coordinate | null; focus?: Coordinate | null; onPeak?: (peak: Peak) => void; height?: number; };
function lines(paths: Fix[][]): FeatureCollection<LineString> {
  return { type: 'FeatureCollection', features: paths.flatMap(p => segments(cleanPoints(p))).filter(p => p.length > 1).map((p, i) => ({ type: 'Feature', id: i, properties: {}, geometry: { type: 'LineString', coordinates: p.map(f => [f.longitude, f.latitude]) } })) };
}
const satelliteKey = process.env.EXPO_PUBLIC_MAPTILER_KEY?.trim() ?? '';
export const TrailMap = memo(function TrailMap(props: Props) {
  const [full, setFull] = useState(false);
  const [background, setBackground] = useState(() => mapBackground(getStore().setting('mapBackground', null), !!satelliteKey));
  const view = useRef<ViewState | null>(null);
  const { height: screenHeight } = useWindowDimensions();
  const [inspected, setInspected] = useState<Discovery | null>(null);
  const [keyOpen, setKeyOpen] = useState(false);
  useEffect(() => { setInspected(null); }, [props.selectedDiscovery?.id]);
  const pick = (item: Discovery) => { setInspected(item); setKeyOpen(false); };
  const details = <View style={{ paddingHorizontal: 6, paddingBottom: 6 }}>{inspected && <MapTrailCard item={inspected} onStart={props.onStartTrail ? () => { setFull(false); props.onStartTrail!(inspected); } : undefined} onClose={() => setInspected(null)} />}<MapKey track={!!props.current?.length} history={!!props.trips?.length} reference={!!props.reference?.length} expanded={keyOpen} onToggle={() => setKeyOpen(value => !value)} /></View>;
  const choose = (value: MapBackground) => { setBackground(value); getStore().setSetting('mapBackground', value); };
  const shared = { ...props, inspected, onPick: pick, background, onBackground: choose, restoredView: view.current, onView: (value: ViewState) => { view.current = value; } };
  return <>
    {!full ? <View style={{ gap: 4 }}><MapSurface {...shared} onExpand={() => setFull(true)} />{details}</View> : <View style={{ height: props.height ?? 330 }} />}
    {full && <Modal visible hardwareAccelerated animationType="fade" onRequestClose={() => setFull(false)}><SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ paddingHorizontal: 18, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={s.subheading}>Kart</Text><Pressable accessibilityRole="button" accessibilityLabel="Minimer kartet" onPress={() => setFull(false)} style={{ padding: 12 }}><Text style={s.chipText}>Minimer ↙</Text></Pressable></View>
      <MapSurface {...shared} onExpand={() => setFull(false)} fullscreen />
      <ScrollView style={{ flexGrow: 0, maxHeight: screenHeight * .4 }} keyboardShouldPersistTaps="handled">{details}</ScrollView>
    </SafeAreaView></Modal>}
  </>;
});
type SurfaceProps = Props & { inspected: Discovery | null; onPick: (item: Discovery) => void; fullscreen?: boolean; onExpand: () => void; background: MapBackground; onBackground: (value: MapBackground) => void; restoredView: ViewState | null; onView: (view: ViewState) => void };
function MapSurface({ inspected, onPick, positionStale = false, segmentStart, segmentEnd, startPosition, guideStart = false, recenter = 0, fitRoute = false, fitReference = false, selectedDiscovery, trips = EMPTY_TRIPS, trails = EMPTY_TRAILS, discoveries = EMPTY_DISCOVERIES, peaks = EMPTY_PEAKS, current = EMPTY_POINTS, reference = EMPTY_POINTS, ghost, position, focus, onPeak, height = 330, fullscreen = false, onExpand, background, onBackground, restoredView, onView }: SurfaceProps) {
  const mapCenter = focus ?? position ?? current.at(-1) ?? reference[0] ?? trips[0]?.points.at(-1) ?? trails[0]?.points[0] ?? selectedDiscovery;
  const camera = useRef<CameraRef>(null);
  const restored = useRef(restoredView);
  const userMoved = useRef(!!restoredView);
  const style = useMemo(() => backgroundStyle(background, satelliteKey), [background]);
  const [viewport, setViewport] = useState<MapBounds | null>(null);
  const paths = useMemo(() => mapItems(discoveries), [discoveries]);
  const highlighted = inspected ?? selectedDiscovery;
  const displayed = useMemo(() => mapSelection(paths, viewport ?? (focus ? [focus.longitude - .025, focus.latitude - .012, focus.longitude + .025, focus.latitude + .012] : [-180, -85, 180, 85]), highlighted), [paths, viewport, focus, highlighted]);
  const [failed, setFailed] = useState(false), [ready, setReady] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const history = useMemo(() => lines(trips.map(t => t.points)), [trips]);
  const live = useMemo(() => lines([current]), [current]);
  const old = useMemo(() => lines([reference]), [reference]);
  const targets = useMemo(() => mapFeatures(displayed.items, highlighted), [displayed, highlighted]);
  const discoveryBounds = useMemo(() => selectedDiscovery
    ? coordinateBounds((selectedDiscovery.streetPaths ?? [selectedDiscovery.geometry]).flat()) : null, [selectedDiscovery]);
  const routeBounds = useMemo(() => fitRoute ? coordinateBounds([...cleanPoints(current), ...cleanPoints(reference)]) : null,
    [fitRoute, current, reference]);
  const referenceBounds = useMemo(() => fitReference ? coordinateBounds(cleanPoints(reference)) : null, [fitReference, reference]);
  const startBounds = useMemo(() => guideStart && startPosition ? coordinateBounds([startPosition, ...(position ? [position] : [])]) : null, [guideStart, startPosition, position]);
  const initialSelection = useRef(selectedDiscovery?.id);
  useEffect(() => { if (initialSelection.current !== selectedDiscovery?.id) { restored.current = null; userMoved.current = false; initialSelection.current = selectedDiscovery?.id; } }, [selectedDiscovery?.id]);
  const bounds = startBounds ?? (selectedDiscovery ? discoveryBounds : referenceBounds ?? routeBounds);
  useEffect(() => {
    if (ready && !restored.current && size.width > 0 && size.height > 0 && bounds) camera.current?.fitBounds(bounds, { padding: { top: 70, right: 30, bottom: 38, left: 30 }, duration: 0 });
  }, [bounds, ready, size]);
  useEffect(() => { if (ready && !userMoved.current && focus && !selectedDiscovery && !fitRoute && !fitReference) camera.current?.flyTo({ center: [focus.longitude, focus.latitude], zoom: 14, duration: 700 }); }, [focus, selectedDiscovery, fitRoute, fitReference, ready]);
  useEffect(() => { if (recenter && position) camera.current?.flyTo({ center: [position.longitude, position.latitude], zoom: 16, duration: 500 }); }, [recenter]);
  if (!mapCenter) return <View style={{ height, borderRadius: 22, backgroundColor: colors.pale, justifyContent: 'center', padding: 24 }}><Icon name="location" /><Text style={s.subheading}>Kartet trenger en posisjon</Text><Text style={s.body}>Slå på GPS og tillat posisjon. Sist kjente turposisjon brukes når den finnes.</Text></View>;
  return <View testID="trail-map" onLayout={({ nativeEvent: { layout } }) => setSize(previous => previous.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height })} style={{ ...(fullscreen ? { flex: 1, minHeight: 120 } : { height }), borderRadius: fullscreen ? 0 : 22, overflow: 'hidden', backgroundColor: colors.pale }}>
    <Map dragPan={true} onRegionDidChange={({ nativeEvent }) => { if (!nativeEvent?.bounds) return; onView(nativeEvent); if (nativeEvent.userInteraction) userMoved.current = true; const next: MapBounds = [...nativeEvent.bounds]; setViewport(previous => previous?.every((value, i) => value === next[i]) ? previous : next); }} style={{ flex: 1 }} mapStyle={style} attribution={true} logo={false} onDidFinishLoadingStyle={() => setReady(true)} onDidFailLoadingMap={() => setFailed(true)} onDidFinishLoadingMap={() => setFailed(false)}>
      <Camera ref={camera} initialViewState={restored.current ?? { center: [mapCenter.longitude, mapCenter.latitude], zoom: 15 }} />
      <RasterSource id="national-foot-routes" tiles={[FOOT_ROUTE_TILES]} tileSize={256} minzoom={8} maxzoom={18} attribution="© Kartverket · Nasjonal database for turruter"><Layer id="national-foot-routes" type="raster" paint={{ 'raster-opacity': 0.6 }} /></RasterSource>
      <GeoJSONSource id="discoveries" data={targets} onPress={event => {
        const { features, lngLat } = event.nativeEvent;
        const item = pickedMapTrail(features, displayed.items, { longitude: lngLat[0], latitude: lngLat[1] });
        if (item) { event.stopPropagation(); onPick(item); }
      }}>
        <Layer id="discovery-halo" type="line" filter={['==', ['geometry-type'], 'LineString']} paint={{ 'line-color': '#FFFFFF', 'line-width': ['case', ['get', 'selected'], 8, 5], 'line-opacity': .85 }} />
        <Layer id="discovery-paths" type="line" filter={['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'kind'], 'path']]} paint={{ 'line-color': mapInk.path, 'line-width': 2.5, 'line-dasharray': [2, 1.5] }} />
        <Layer id="discovery-footways" type="line" filter={['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'kind'], 'footway']]} paint={{ 'line-color': mapInk.footway, 'line-width': 3 }} />
        <Layer id="discovery-steps" type="line" filter={['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'kind'], 'steps']]} paint={{ 'line-color': mapInk.path, 'line-width': 4, 'line-dasharray': [.4, .8] }} />
        <Layer id="selected-path" type="line" filter={['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'selected'], true]]} paint={{ 'line-color': mapInk.selected, 'line-width': 4 }} />
        <Layer id="selected-place" type="circle" filter={['==', ['geometry-type'], 'Point']} paint={{ 'circle-radius': 7, 'circle-color': mapInk.selected, 'circle-stroke-color': colors.paper, 'circle-stroke-width': 2 }} />
      </GeoJSONSource>
      <GeoJSONSource id="walked" data={history}><Layer id="walked-halo" type="line" paint={{ 'line-color': '#FFFFFF', 'line-width': 5, 'line-opacity': .7 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} /><Layer id="walked-line" type="line" paint={{ 'line-color': mapInk.history, 'line-width': 2.5, 'line-opacity': .8 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} /></GeoJSONSource>
      <GeoJSONSource id="reference" data={old}><Layer id="reference-halo" type="line" paint={{ 'line-color': '#FFFFFF', 'line-width': 7 }} /><Layer id="reference-line" type="line" paint={{ 'line-color': mapInk.selected, 'line-width': 3, 'line-dasharray': [2, 2] }} /></GeoJSONSource>
      <GeoJSONSource id="live" data={live}><Layer id="live-halo" type="line" paint={{ 'line-color': '#FFFFFF', 'line-width': 8 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} /><Layer id="live-line" type="line" paint={{ 'line-color': mapInk.track, 'line-width': 5 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} /></GeoJSONSource>
      {(selectedDiscovery?.streetEnds ?? []).map((p, i) => <Marker key={`end-${i}`} lngLat={[p.longitude, p.latitude]}><View style={{ width: 14, height: 14, borderRadius: 10, backgroundColor: colors.coral, borderWidth: 2, borderColor: colors.paper }} /></Marker>)}
      {peaks.map(peak => <Marker key={peak.id} lngLat={[peak.longitude, peak.latitude]} onPress={() => onPeak?.(peak)}><View style={{ alignItems: 'center', padding: 4 }}><View style={{ padding: 5, borderRadius: 20, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.ink }}><Icon name="mountain" size={15} /></View><Text style={{ fontSize: 10, fontWeight: '700', color: colors.ink, backgroundColor: '#F7F5EEDD', paddingHorizontal: 4, borderRadius: 4 }}>{peak.name}</Text></View></Marker>)}
      {ghost && <Marker lngLat={[ghost.longitude, ghost.latitude]}><View style={{ padding: 8, backgroundColor: colors.coral, borderRadius: 25, borderWidth: 2, borderColor: 'white' }}><Icon name="ghost" color="white" size={19} /></View></Marker>}
      {startPosition && <Marker lngLat={[startPosition.longitude, startPosition.latitude]}><View style={{ padding: 7, backgroundColor: colors.ink, borderRadius: 8, borderWidth: 2, borderColor: 'white' }}><Text style={{ color: 'white', fontSize: 12, fontWeight: '800' }}>START</Text></View></Marker>}
      {segmentStart && <Marker lngLat={[segmentStart.longitude, segmentStart.latitude]}><View accessibilityLabel="Aktivt startmerke" style={{ transform: [{ translateY: -42 }], backgroundColor: colors.ink, padding: 7, borderRadius: 8, borderWidth: 2, borderColor: 'white' }}><Text style={{ color: 'white', fontWeight: '800', fontSize: 10 }}>AKTIV START</Text></View></Marker>}
      {segmentEnd && (!segmentStart || distance(segmentStart, segmentEnd) > 10) && <Marker lngLat={[segmentEnd.longitude, segmentEnd.latitude]}><View style={{ backgroundColor: colors.coral, padding: 7, borderRadius: 8 }}><Text style={{ color: 'white', fontWeight: '800', fontSize: 10 }}>SIST LAGRET</Text></View></Marker>}
      {position && <Marker lngLat={[position.longitude, position.latitude]}><View accessibilityLabel={positionStale ? "Sist kjente posisjon" : "Din posisjon"} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: positionStale ? '#6D7B72' : '#1565E8', borderWidth: 3, borderColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 8 }}><Text style={{ color: 'white', fontWeight: '900', fontSize: 9 }}>{positionStale ? 'SIST' : 'DU'}</Text></View></Marker>}
    </Map>
    <View style={{ position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', gap: 6 }}>
      {(satelliteKey ? ['topo', 'satellite'] as MapBackground[] : []).map(value => <MapControl key={value} title={value === 'topo' ? 'Turkart' : 'Satellitt'} selected={background === value} onPress={() => onBackground(value)} />)}
      <View style={{ flex: 1 }} /><MapControl title={fullscreen ? '↙' : '⛶'} label={fullscreen ? 'Minimer kartet' : 'Åpne kart i fullskjerm'} onPress={onExpand} />
    </View>
    {position && <View style={{ position: 'absolute', right: 10, bottom: 38 }}><MapControl title="◎" label="Finn min posisjon i kartet" onPress={() => { userMoved.current = false; camera.current?.flyTo({ center: [position.longitude, position.latitude], zoom: 16, duration: 400 }); }} /></View>}
    {background === 'satellite' && <Pressable accessibilityRole="link" accessibilityLabel="MapTiler" onPress={() => void Linking.openURL('https://www.maptiler.com/copyright/')} style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: 'white', padding: 3 }}><SvgUri uri="https://api.maptiler.com/resources/logo.svg" width={90} height={24} /></Pressable>}
    {displayed.limited && <View pointerEvents="none" style={{ position: 'absolute', top: 58, left: 8, right: 8, padding: 8, borderRadius: 10, backgroundColor: colors.paper }}><Text style={s.small}>Viser et utvalg. Zoom inn for flere detaljer.</Text></View>}
    {failed && <View style={{ position: 'absolute', top: 58, left: 10, right: 10, padding: 10, borderRadius: 10, backgroundColor: colors.paper }}><Text style={s.small}>Kartbakgrunnen kunne ikke lastes. GPS-sporet lagres fortsatt.</Text><MapControl title="Prøv reservekart" onPress={() => onBackground('overview')} /></View>}
  </View>;
 }
function MapControl({ title, label, selected = false, onPress }: { title: string; label?: string; selected?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label ?? title} accessibilityState={{ selected }} onPress={onPress} style={{ minWidth: 44, minHeight: 44, paddingHorizontal: 10, borderRadius: 12, backgroundColor: selected ? colors.ink : colors.paper, justifyContent: 'center', alignItems: 'center', elevation: 3 }}><Text style={{ color: selected ? colors.paper : colors.ink, fontWeight: '700', fontSize: 13 }}>{title}</Text></Pressable>;
}
