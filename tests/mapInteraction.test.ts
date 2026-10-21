import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { component } from './support/component';
import * as presentation from '../src/domain/mapPresentation';
import * as selection from '../src/domain/mapSelection';
import * as geo from '../src/domain/geo';
import * as styles from '../src/domain/mapStyles';
import * as facts from '../src/domain/trailFacts';
import * as metrics from '../src/domain/metrics';
import * as groups from '../src/domain/discoveryGroups';
import * as finder from '../src/domain/trailFinder';
import * as position from '../src/domain/position';
import type { Fix, Trip } from '../src/domain/types';
const native = { View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal', ScrollView: 'ScrollView', useWindowDimensions: () => ({ height: 800 }), Linking: { openURL: () => {} } };
const theme = { colors: { ink: '#123', paper: '#fff' }, styles: {} };
const details = component('src/ui/MapDetails.tsx', { 'react-native': native, '../domain/mapPresentation': presentation, '../domain/trailFacts': facts, '../domain/metrics': metrics, '../domain/discoveryGroups': groups, './theme': theme });
const { TrailMap } = component('src/ui/TrailMap.tsx', {
  'react-native': native, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, 'react-native-svg': { SvgUri: 'SvgUri' },
  '../data/native': { getStore: () => ({ setting: () => null, setSetting: () => {} }) }, '../domain/mapStyles': styles,
  '@maplibre/maplibre-react-native': { Map: 'Map', Camera: 'Camera', GeoJSONSource: 'GeoJSONSource', RasterSource: 'RasterSource', Layer: 'Layer', Marker: 'Marker' },
  '../domain/geo': geo, './theme': theme, './components': { Icon: 'Icon' }, '../domain/mapSelection': selection, '../domain/mapPresentation': presentation, './MapDetails': details,
});

test('Finn sti renders saved and growing live tracks without fresh GPS, across fullscreen and camera switches', async t => {
  const point = (i: number): Fix => ({ latitude: 60 + i * .0001, longitude: 5, timestamp: 1_000_000 + i * 10000, accuracy: 4, altitude: null, altitudeAccuracy: null, speed: null });
  const points = [point(0), point(1), point(2)];
  const saved: Trip = { id: 'saved', name: 'Min tur', points, startedAt: points[0].timestamp, endedAt: points[2].timestamp, ghostId: null, audioEnabled: false, lastCueAt: 0 };
  const { TrailFinder } = component('src/ui/TrailFinder.tsx', {
    'react-native': { ...native, AppState: { currentState: 'background', addEventListener: () => ({ remove() {} }) } },
    'expo-location': {}, '../domain/trailFinder': finder, '../domain/position': position, '../domain/metrics': metrics,
    '../data/native': { getStore: () => ({ lastPosition: () => points[2] }) }, '../services/tracking': { toFix: (value: Fix) => value },
    './TrailCamera': { TrailCamera: (props: any) => React.createElement('TrailCamera', props, props.detailsOpen ? props.details : null) }, './TrailMap': { TrailMap }, './components': { Button: 'Button' }, './theme': theme,
  });
  let tree!: ReactTestRenderer;
  const props = { items: [], trails: [], trips: [saved], current: undefined, busy: false, onRefresh() {}, onMap() {} };
  await act(() => { tree = create(React.createElement(TrailFinder, props)); });
  t.after(async () => act(() => tree.unmount()));
  const source = (id: string) => tree.root.findByProps({ id }).props.data;
  const recorded = () => JSON.parse(JSON.stringify(source('walked').features[0].geometry.coordinates));
  assert.deepEqual(recorded(), points.map(p => [p.longitude, p.latitude]));
  assert.match(JSON.stringify(tree.toJSON()), /Tidligere turer/);
  assert.match(JSON.stringify(tree.toJSON()), /Sist kjente posisjon/);
  assert.equal(source('live').features.length, 0);

  const current = [point(3), point(4)];
  await act(() => tree.update(React.createElement(TrailFinder, { ...props, current, segmentStart: current[0] })));
  assert.match(JSON.stringify(tree.toJSON()), /Ditt spor/);
  assert.equal(source('live').features[0].geometry.coordinates.length, 2);
  assert.equal(tree.root.findAllByProps({ accessibilityLabel: 'Aktivt startmerke' }).length, 1);
  const layers = tree.root.findAllByType('GeoJSONSource' as any).map(node => node.props.id);
  assert.ok(layers.indexOf('walked') > layers.indexOf('discoveries'));
  assert.ok(layers.indexOf('live') > layers.indexOf('walked'));

  await act(() => tree.root.findByProps({ accessibilityLabel: 'Åpne kart i fullskjerm' }).props.onPress());
  await act(() => tree.update(React.createElement(TrailFinder, { ...props, current: [...current, point(5)] })));
  assert.equal(source('live').features[0].geometry.coordinates.length, 3);
  assert.deepEqual(recorded(), points.map(p => [p.longitude, p.latitude]));
  await act(() => tree.root.findAllByProps({ accessibilityLabel: 'Minimer kartet' })[0].props.onPress());
  const mode = (label: string) => tree.root.findAllByType('Pressable' as any).find(node => node.findAllByType('Text' as any).some(text => text.props.children === label))!;
  await act(() => mode('Kamera · AR').props.onPress());
  assert.equal(tree.root.findAllByType('Map' as any).length, 0);
  await act(() => mode('Kart').props.onPress());
  assert.deepEqual(recorded(), points.map(p => [p.longitude, p.latitude]));
  assert.equal(source('live').features[0].geometry.coordinates.length, 3);
  await act(() => tree.update(React.createElement(TrailFinder, { ...props, trips: [] })));
  assert.equal(source('walked').features.length, 0);
  assert.equal(source('live').features.length, 0);
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /Tidligere turer/);
});
test('tap opens honest trail info; selection and camera position survive fullscreen/minimize; close clears only inspection', async t => {
  let tree!: ReactTestRenderer;
  const item = { id: 'way/1', name: 'Skredderdalen', kind: 'trail', osmHighway: 'path', latitude: 60, longitude: 5, geometry: [{ latitude: 60, longitude: 5 }, { latitude: 60.001, longitude: 5 }], fetchedAt: 0, sourceUrl: '' };
  await act(() => { tree = create(React.createElement(TrailMap, { position: item, discoveries: [item] })); });
  t.after(async () => act(() => tree.unmount()));
  const source = () => tree.root.findByProps({ id: 'discoveries' });
  let stopped = false;
  await act(() => source().props.onPress({ nativeEvent: { features: source().props.data.features, lngLat: [5, 60.0005] }, stopPropagation: () => { stopped = true; } }));
  assert.ok(stopped); assert.match(JSON.stringify(tree.toJSON()), /Skredderdalen/);
  assert.match(JSON.stringify(tree.toJSON()), /Ikke registrert/);
  assert.equal(source().props.data.features[0].properties.selected, true);
  const view = { bounds: [4.9, 59.9, 5.1, 60.1], center: [5.01, 60.01], zoom: 16, userInteraction: true };
  await act(() => tree.root.findByType('Map' as any).props.onRegionDidChange({ nativeEvent: view }));
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Åpne kart i fullskjerm' }).props.onPress());
  assert.equal(tree.root.findAllByType('Map' as any).length, 1);
  assert.deepEqual(tree.root.findByType('Camera' as any).props.initialViewState, view);
  assert.match(JSON.stringify(tree.toJSON()), /Skredderdalen/);
  await act(() => tree.root.findAllByProps({ accessibilityLabel: 'Minimer kartet' })[0].props.onPress());
  assert.equal(tree.root.findAllByType('Map' as any).length, 1);
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Lukk stiinfo' }).props.onPress());
  assert.equal(tree.root.findAllByProps({ accessibilityLabel: 'Lukk stiinfo' }).length, 0);
  assert.equal(source().props.data.features[0].properties.selected, false);
});

test('finder keeps asking for GPS while stationary and supplies named streets to camera mode', async t => {
  const now = Date.now();
  const point: Fix = { latitude: 60, longitude: 5, timestamp: now, accuracy: 4, altitude: null, altitudeAccuracy: null, speed: null };
  const street = { id: 'gate', name: 'Gjeble Pedersens gate', kind: 'street', latitude: 60, longitude: 5, geometry: [point, { ...point, latitude: 60.001 }], fetchedAt: now, sourceUrl: '' };
  const requests: any[] = []; let receive: (value: Fix) => void = () => {}, removed = 0;
  const { TrailFinder } = component('src/ui/TrailFinder.tsx', {
    'react-native': { ...native, AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
    'expo-location': { Accuracy: { High: 4 }, requestForegroundPermissionsAsync: async () => ({ granted: true }), watchPositionAsync: async (options: unknown, callback: typeof receive) => { requests.push(options); receive = callback; return { remove() { removed++; } }; } },
    '../domain/trailFinder': finder, '../domain/position': position, '../domain/metrics': metrics,
    '../data/native': { getStore: () => ({ lastPosition: () => point }) }, '../services/tracking': { toFix: (value: Fix) => value },
    './TrailCamera': { TrailCamera: (props: any) => React.createElement('TrailCamera', props, props.detailsOpen ? props.details : null) }, './TrailMap': { TrailMap }, './components': { Button: 'Button' }, './theme': theme,
  });
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(TrailFinder, { items: [street], trails: [], trips: [], current: undefined, busy: false, onRefresh() {}, onMap() {}, onStart() {} })); });
  t.after(async () => act(() => tree.unmount()));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].distanceInterval, 0); assert.equal(requests[0].timeInterval, 1000);
  assert.equal(tree.root.findAllByProps({ accessibilityLabel: 'Velg Gjeble Pedersens gate' }).length, 0);
  const mode = tree.root.findAllByType('Pressable' as any).find(node => node.findAllByType('Text' as any).some(text => text.props.children === 'Kamera · AR'))!;
  await act(() => mode.props.onPress());
  const camera = () => tree.root.findByType('TrailCamera' as any);
  assert.equal(camera().props.targets[0].name, 'Gjeble Pedersens gate');
  await act(() => receive({ ...point, timestamp: now + 1000 }));
  assert.equal(camera().props.position.timestamp, now + 1000);
  await act(() => camera().props.onSelect(camera().props.targets[0]));
  assert.ok(tree.root.findByProps({ title: 'Velg gate og start tur' }));
  assert.equal(camera().props.detailsOpen, true);
  assert.equal(camera().props.selected.name, street.name);
  await act(() => camera().props.onCloseDetails());
  assert.equal(camera().props.detailsOpen, false);
  assert.equal(camera().props.targets.length, 1);
  await act(() => camera().props.onRetryGps());
  assert.equal(requests.length, 2); assert.equal(removed, 1);
});
