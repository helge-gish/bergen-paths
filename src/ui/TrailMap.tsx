import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Map, Camera, GeoJSONSource, Layer, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import type { Coordinate, Fix, Peak, Trail, Trip } from '../domain/types';
import { cleanPoints, coordinateBounds, segments } from '../domain/geo';
import { colors, styles as s } from './theme';
import { Icon } from './components';
import { mapSelection, type MapBounds } from '../domain/mapSelection';
import type { Discovery } from '../domain/discoveries';
const EMPTY_POINTS: Fix[] = [];
type Props = { startPosition?: Coordinate; guideStart?: boolean; recenter?: number; fitRoute?: boolean; fitReference?: boolean; selectedDiscovery?: Discovery | null; trips?: Trip[]; trails?: Trail[]; discoveries?: Discovery[]; awards?: Record<string, number>; peaks?: Peak[]; current?: Fix[]; reference?: Fix[]; ghost?: Coordinate | null; position?: Coordinate | null; focus?: Coordinate | null; onPeak?: (peak: Peak) => void; height?: number; };
function lines(paths: Fix[][]): FeatureCollection<LineString> {
  return { type: 'FeatureCollection', features: paths.flatMap(p => segments(cleanPoints(p))).filter(p => p.length > 1).map((p, i) => ({ type: 'Feature', id: i, properties: {}, geometry: { type: 'LineString', coordinates: p.map(f => [f.longitude, f.latitude]) } })) };
}
export function TrailMap({ startPosition, guideStart = false, recenter = 0, fitRoute = false, fitReference = false, selectedDiscovery, trips = [], trails = [], discoveries = [], awards = {}, peaks = [], current = EMPTY_POINTS, reference = EMPTY_POINTS, ghost, position, focus, onPeak, height = 330 }: Props) {
  const camera = useRef<CameraRef>(null);
  const [viewport, setViewport] = useState<MapBounds | null>(null);
  const displayed = useMemo(() => mapSelection(discoveries, viewport ?? (focus ? [focus.longitude - .025, focus.latitude - .012, focus.longitude + .025, focus.latitude + .012] : [-180, -85, 180, 85]), selectedDiscovery), [discoveries, viewport, focus, selectedDiscovery]);
  const [failed, setFailed] = useState(false), [ready, setReady] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const history = useMemo(() => lines([...trips.map(t => t.points), ...trails.map(t => t.points)]), [trips, trails]);
  const live = useMemo(() => lines([current]), [current]);
  const old = useMemo(() => lines([reference]), [reference]);
  const targets = useMemo((): FeatureCollection => ({ type: 'FeatureCollection', features: displayed.items.flatMap<Feature>(item => {
    const properties = { name: item.name, selected: item.id === selectedDiscovery?.id, collected: awards[item.id] !== undefined };
    if (item.kind === 'trail' || item.kind === 'street' || item.kind === 'steps') return (item.streetPaths ?? [item.geometry]).filter(path => path.length > 1).map((path, i) => ({ type: 'Feature' as const, id: `${item.id}/${i}`, properties, geometry: { type: 'LineString' as const, coordinates: path.map(p => [p.longitude, p.latitude]) } }));
    return [{ type: 'Feature' as const, id: item.id, properties, geometry: { type: 'Point' as const, coordinates: [item.longitude, item.latitude] } }];
  }) }), [displayed, awards, selectedDiscovery]);
  const discoveryBounds = useMemo(() => selectedDiscovery
    ? coordinateBounds((selectedDiscovery.streetPaths ?? [selectedDiscovery.geometry]).flat()) : null, [selectedDiscovery]);
  const routeBounds = useMemo(() => fitRoute ? coordinateBounds([...cleanPoints(current), ...cleanPoints(reference)]) : null,
    [fitRoute, current, reference]);
  const referenceBounds = useMemo(() => fitReference ? coordinateBounds(cleanPoints(reference)) : null, [fitReference, reference]);
  const startBounds = useMemo(() => guideStart && startPosition ? coordinateBounds([startPosition, ...(position ? [position] : [])]) : null, [guideStart, startPosition, position]);
  const bounds = startBounds ?? (selectedDiscovery ? discoveryBounds : referenceBounds ?? routeBounds);
  useEffect(() => {
    if (ready && size.width > 0 && size.height > 0 && bounds) camera.current?.fitBounds(bounds, { padding: { top: 30, right: 30, bottom: 38, left: 30 }, duration: 0 });
  }, [bounds, ready, size]);
  useEffect(() => { if (focus && !selectedDiscovery && !fitRoute && !fitReference) camera.current?.flyTo({ center: [focus.longitude, focus.latitude], zoom: 14, duration: 700 }); }, [focus, selectedDiscovery, fitRoute, fitReference]);
  useEffect(() => { if (recenter && position) camera.current?.flyTo({ center: [position.longitude, position.latitude], zoom: 16, duration: 500 }); }, [recenter]);
  return <View testID="trail-map" onLayout={({ nativeEvent: { layout } }) => setSize(previous => previous.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height })} style={{ height, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.pale }}>
    <Map dragPan={true} onRegionDidChange={({ nativeEvent }) => { if (!nativeEvent?.bounds) return; const next: MapBounds = [...nativeEvent.bounds]; setViewport(previous => previous?.every((value, i) => value === next[i]) ? previous : next); }} style={{ flex: 1 }} mapStyle="https://tiles.openfreemap.org/styles/liberty" attribution={true} logo={false} onDidFinishLoadingStyle={() => setReady(true)} onDidFailLoadingMap={() => setFailed(true)} onDidFinishLoadingMap={() => setFailed(false)}>
      <Camera ref={camera} initialViewState={{ center: focus ? [focus.longitude, focus.latitude] : [0, 20], zoom: focus ? 14 : 1.5 }} />
      <GeoJSONSource id="discoveries" data={targets}>
        <Layer id="discovery-paths" type="line" filter={['==', ['geometry-type'], 'LineString']} paint={{ 'line-color': ['case', ['get', 'selected'], colors.coral, ['get', 'collected'], '#426D3A', '#A9B6A0'], 'line-width': ['case', ['get', 'selected'], 5, 2], 'line-opacity': 0.85 }} />
        <Layer id="discovery-dots" type="circle" filter={['==', ['geometry-type'], 'Point']} paint={{ 'circle-radius': 6, 'circle-color': ['case', ['get', 'collected'], colors.ink, colors.yellow], 'circle-stroke-color': colors.paper, 'circle-stroke-width': 2 }} />
        <Layer id="discovery-labels" type="symbol" minzoom={14} filter={['==', ['geometry-type'], 'Point']} layout={{ 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, 1.3] }} paint={{ 'text-color': colors.ink, 'text-halo-color': colors.paper, 'text-halo-width': 1.5 }} />
      </GeoJSONSource>
      <GeoJSONSource id="walked" data={history}><Layer id="walked-line" type="line" paint={{ 'line-color': '#6B8D62', 'line-width': 4, 'line-opacity': 0.65 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} /></GeoJSONSource>
      <GeoJSONSource id="reference" data={old}><Layer id="reference-line" type="line" paint={{ 'line-color': colors.coral, 'line-width': 3, 'line-dasharray': [2, 2] }} /></GeoJSONSource>
      <GeoJSONSource id="live" data={live}><Layer id="live-line" type="line" paint={{ 'line-color': colors.ink, 'line-width': 5 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} /></GeoJSONSource>
      {(selectedDiscovery?.streetEnds ?? []).map((p, i) => <Marker key={`end-${i}`} lngLat={[p.longitude, p.latitude]}><View style={{ width: 14, height: 14, borderRadius: 10, backgroundColor: colors.coral, borderWidth: 2, borderColor: colors.paper }} /></Marker>)}
      {peaks.map(peak => <Marker key={peak.id} lngLat={[peak.longitude, peak.latitude]} onPress={() => onPeak?.(peak)}><View style={{ alignItems: 'center', padding: 4 }}><View style={{ padding: 5, borderRadius: 20, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.ink }}><Icon name="mountain" size={15} /></View><Text style={{ fontSize: 10, fontWeight: '700', color: colors.ink, backgroundColor: '#F7F5EEDD', paddingHorizontal: 4, borderRadius: 4 }}>{peak.name}</Text></View></Marker>)}
      {ghost && <Marker lngLat={[ghost.longitude, ghost.latitude]}><View style={{ padding: 8, backgroundColor: colors.coral, borderRadius: 25, borderWidth: 2, borderColor: 'white' }}><Icon name="ghost" color="white" size={19} /></View></Marker>}
      {startPosition && <Marker lngLat={[startPosition.longitude, startPosition.latitude]}><View style={{ padding: 7, backgroundColor: colors.ink, borderRadius: 8, borderWidth: 2, borderColor: 'white' }}><Text style={{ color: 'white', fontSize: 12, fontWeight: '800' }}>START</Text></View></Marker>}
      {position && <Marker lngLat={[position.longitude, position.latitude]}><View accessibilityLabel="Din posisjon" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#1565E8', borderWidth: 4, borderColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 8 }}><Text style={{ color: 'white', fontWeight: '900', fontSize: 12 }}>DU</Text></View></Marker>}
    </Map>
    {displayed.limited && <View pointerEvents="none" style={{ position: 'absolute', top: 8, left: 8, right: 8, padding: 8, borderRadius: 10, backgroundColor: colors.paper }}><Text style={s.small}>Viser et utvalg. Zoom inn for flere detaljer.</Text></View>}
    {failed && <View style={{ position: 'absolute', top: 10, left: 10, right: 10, padding: 10, borderRadius: 10, backgroundColor: colors.paper }}><Text style={s.small}>Kartbakgrunnen trenger nett. GPS-sporet lagres fortsatt under en aktiv tur.</Text></View>}
  </View>;
}
