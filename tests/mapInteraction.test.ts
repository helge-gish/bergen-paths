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
const native = { View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal', ScrollView: 'ScrollView', useWindowDimensions: () => ({ height: 800 }), Linking: { openURL: () => {} } };
const theme = { colors: { ink: '#123', paper: '#fff' }, styles: {} };
const details = component('src/ui/MapDetails.tsx', { 'react-native': native, '../domain/mapPresentation': presentation, '../domain/trailFacts': facts, '../domain/metrics': metrics, '../domain/discoveryGroups': groups, './theme': theme });
const { TrailMap } = component('src/ui/TrailMap.tsx', {
  'react-native': native, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, 'react-native-svg': { SvgUri: 'SvgUri' },
  '../data/native': { getStore: () => ({ setting: () => null, setSetting: () => {} }) }, '../domain/mapStyles': styles,
  '@maplibre/maplibre-react-native': { Map: 'Map', Camera: 'Camera', GeoJSONSource: 'GeoJSONSource', RasterSource: 'RasterSource', Layer: 'Layer', Marker: 'Marker' },
  '../domain/geo': geo, './theme': theme, './components': { Icon: 'Icon' }, '../domain/mapSelection': selection, '../domain/mapPresentation': presentation, './MapDetails': details,
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
