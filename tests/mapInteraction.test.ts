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
import * as gate from '../src/domain/startGate';
import * as position from '../src/domain/position';
import type { Fix, Trip } from '../src/domain/types';
const native = { View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal', ScrollView: 'ScrollView', useWindowDimensions: () => ({ height: 800 }), Linking: { openURL: () => {} } };
const theme = { colors: { ink: '#123', paper: '#fff' }, styles: {} };
const details = component('src/ui/MapDetails.tsx', { 'react-native': native, '../domain/mapPresentation': presentation, '../domain/trailFacts': facts, '../domain/metrics': metrics, '../domain/discoveryGroups': groups, './theme': theme });
const cameraMoves: any[] = [];
let mapHeading:number|null=null;
const Camera = React.forwardRef((props: any, ref) => {
  React.useImperativeHandle(ref, () => ({ flyTo: (value: any) => cameraMoves.push(value), fitBounds() {} }));
  return React.createElement('Camera', props);
});
const { TrailMap } = component('src/ui/TrailMap.tsx', {
  './useMapHeading': { useMapHeading: (enabled:boolean) => enabled?mapHeading:null },
  'react-native': native, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, 'react-native-svg': { SvgUri: 'SvgUri' },
  '../data/native': { getStore: () => ({ setting: () => null, setSetting: () => {} }) }, '../domain/mapStyles': styles,
  '@maplibre/maplibre-react-native': { Map: 'Map', Camera, GeoJSONSource: 'GeoJSONSource', RasterSource: 'RasterSource', Layer: 'Layer', Marker: 'Marker' },
  '../domain/geo': geo, '../domain/metrics': metrics, './theme': theme, './components': { Icon: 'Icon' }, '../domain/mapSelection': selection, '../domain/mapPresentation': presentation, './MapDetails': details,
});

test('MEG facing arrow follows compass relative to the rotated map and hides without heading',async()=>{
 mapHeading=90;let tree!:ReactTestRenderer;
 await act(()=>{tree=create(React.createElement(TrailMap,{position:{latitude:60,longitude:5},showHeading:true}));});
 const marker=()=>tree.root.findByProps({accessibilityLabel:'Din posisjon, mobilen peker 90 grader'});
 const rotation=()=>marker().findAllByType('View' as any).find(n=>n.props.style?.transform)?.props.style.transform[0].rotate;
 assert.equal(rotation(),'90deg');
 await act(()=>tree.root.findByType('Map' as any).props.onRegionDidChange({nativeEvent:{bounds:[4.9,59.9,5.1,60.1],bearing:30}}));
 assert.equal(rotation(),'60deg');
 mapHeading=null;
 await act(()=>tree.update(React.createElement(TrailMap,{position:{latitude:60,longitude:5},showHeading:true})));
 assert.ok(tree.root.findByProps({accessibilityLabel:'Din posisjon, retning utilgjengelig'}));
 await act(()=>tree.unmount());
});

test('AR guides to a fixed saved-stretch start, signals arrival once and never requires a new trip',async()=>{
 const now=Date.now(),first:Fix={latitude:60,longitude:5,timestamp:now-500000,accuracy:4,altitude:null,altitudeAccuracy:null,speed:null};
 const points=Array.from({length:11},(_,i)=>({...first,latitude:60+i*.0001,timestamp:first.timestamp+i*10000}));
 const near={...points[8],timestamp:now};let receive:(v:Fix)=>void=()=>{};
 const spoken:string[]=[];
 const {TrailFinder}=component('src/ui/TrailFinder.tsx',{
  '../domain/startGate':gate,'../services/voice':{speak:async(v:string)=>{spoken.push(v);}},
  'react-native':{...native,AppState:{currentState:'active',addEventListener:()=>({remove(){}})}},
  'expo-location':{Accuracy:{High:4},requestForegroundPermissionsAsync:async()=>({granted:true}),watchPositionAsync:async(_:any,callback:typeof receive)=>{receive=callback;return{remove(){}};}},
  '../domain/trailFinder':finder,'../domain/position':position,'../domain/metrics':metrics,
  '../data/native':{getStore:()=>({lastPosition:()=>near,setting:(_:string,f:any)=>f})},'../services/tracking':{toFix:(v:Fix)=>v},
  './ReadingPanel':{ReadingText:'Text',ReadingButton:'Button'},
  './TrailCamera':{TrailCamera:(props:any)=>React.createElement('TrailCamera',props,props.detailsOpen?props.details:null)},'./TrailMap':{TrailMap},'./components':{Button:'Button'},'./theme':theme,
 });
 let tree!:ReactTestRenderer;await act(()=>{tree=create(React.createElement(TrailFinder,{embedded:true,items:[],trails:[{id:'own',name:'Min bakke',points,tripId:'old',createdAt:now-100000}],trips:[],busy:false,initialTargetId:'saved:own',onRefresh(){},onMap(){}}));});
 const camera=()=>tree.root.findByType('TrailCamera' as any);
 assert.equal(camera().props.detailsOpen,true);
 assert.equal(tree.root.findAllByProps({title:'Velg sti og start tur'}).length,0);
 await act(()=>tree.root.findByProps({title:'Finn starten'}).props.onPress());
 assert.equal(camera().props.detailsOpen,false);assert.equal(camera().props.selected.coordinate.latitude,60);
 assert.match(camera().props.selected.name,/Start:/);assert.ok(camera().props.selected.meters>80);
 await act(()=>receive({...first,timestamp:Date.now(),latitude:60.0005}));
 assert.equal(camera().props.selected.coordinate.latitude,60);assert.equal(spoken.length,0);
 await act(()=>receive({...first,timestamp:Date.now()}));assert.equal(spoken.length,1);assert.match(spoken[0],/ved starten/);
 await act(()=>receive({...first,timestamp:Date.now(),latitude:60.00001}));assert.equal(spoken.length,1);
 await act(()=>tree.unmount());
});

test('Finn sti renders saved and growing live tracks without fresh GPS, across fullscreen and camera switches', async t => {
  const point = (i: number): Fix => ({ latitude: 60 + i * .0001, longitude: 5, timestamp: 1_000_000 + i * 10000, accuracy: 4, altitude: null, altitudeAccuracy: null, speed: null });
  const points = [point(0), point(1), point(2)];
  const saved: Trip = { id: 'saved', name: 'Min tur', points, startedAt: points[0].timestamp, endedAt: points[2].timestamp, ghostId: null, audioEnabled: false, lastCueAt: 0 };
  const { TrailFinder } = component('src/ui/TrailFinder.tsx', {
    '../domain/startGate': gate, '../services/voice': {speak:async()=>{}},
    'react-native': { ...native, AppState: { currentState: 'background', addEventListener: () => ({ remove() {} }) } },
    'expo-location': {}, '../domain/trailFinder': finder, '../domain/position': position, '../domain/metrics': metrics,
    '../data/native': { getStore: () => ({ lastPosition: () => points[2] }) }, '../services/tracking': { toFix: (value: Fix) => value },
    './ReadingPanel': { ReadingText: 'Text', ReadingButton: 'Button' },
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
  assert.equal(tree.root.findAllByProps({ accessibilityLabel: 'Start på strekket du lager' }).length, 1);
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
    '../domain/startGate': gate, '../services/voice': {speak:async()=>{}},
    'react-native': { ...native, AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
    'expo-location': { Accuracy: { High: 4 }, requestForegroundPermissionsAsync: async () => ({ granted: true }), watchPositionAsync: async (options: unknown, callback: typeof receive) => { requests.push(options); receive = callback; return { remove() { removed++; } }; } },
    '../domain/trailFinder': finder, '../domain/position': position, '../domain/metrics': metrics,
    '../data/native': { getStore: () => ({ lastPosition: () => point }) }, '../services/tracking': { toFix: (value: Fix) => value },
    './ReadingPanel': { ReadingText: 'Text', ReadingButton: 'Button' },
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

test('Explore switches map/AR without losing map view or growing track; hiding scanner releases GPS, including during a trip', async t => {
  const { ExploreSurface } = component('src/ui/ExploreSurface.tsx', { 'react-native': native, './theme': theme });
  let watches = 0, removed = 0;
  const point: Fix = { latitude: 60, longitude: 5, timestamp: Date.now(), accuracy: 4, altitude: null, altitudeAccuracy: null, speed: null };
  const item = { id: 'way/scan', name: 'Fjellstien', kind: 'trail', latitude: 60.001, longitude: 5, geometry: [{ ...point, latitude: 60.001 }, { ...point, latitude: 60.002 }], fetchedAt: 0, sourceUrl: '' };
  const { TrailFinder } = component('src/ui/TrailFinder.tsx', {
    '../domain/startGate': gate, '../services/voice': {speak:async()=>{}},
    'react-native': { ...native, AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
    'expo-location': { Accuracy: { High: 4 }, requestForegroundPermissionsAsync: async () => ({ granted: true }), watchPositionAsync: async () => { watches++; return { remove() { removed++; } }; } },
    '../domain/trailFinder': finder, '../domain/position': position, '../domain/metrics': metrics,
    '../data/native': { getStore: () => ({ lastPosition: () => point }) }, '../services/tracking': { toFix: (value: Fix) => value },
    './ReadingPanel': { ReadingText: 'Text', ReadingButton: 'Button' },
    './TrailCamera': { TrailCamera: (props: any) => React.createElement('TrailCamera', props, props.detailsOpen ? props.details : null) }, './TrailMap': { TrailMap }, './components': { Button: 'Button' }, './theme': theme,
  });
  let mapped: any, started: any;
  function Explore({ enabled = true, recording = false, current = [point] }: { enabled?: boolean; recording?: boolean; current?: Fix[] }) {
    const [mode, setMode] = React.useState('map');
    return React.createElement(ExploreSurface, { mode, onMode: setMode, enabled,
      map: React.createElement(TrailMap, { position: point, current }),
      camera: React.createElement(TrailFinder, { embedded: true, items: [item], trails: [], trips: [], current, busy: false, onRefresh() {},
        onStart: recording ? undefined : (target: any) => { started = target; },
        onMap: (target: any) => { mapped = target; setMode('map'); } }),
    });
  }
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(Explore)); });
  t.after(async () => act(() => tree.unmount()));
  const mode = (label: string) => tree.root.findAllByType('Pressable' as any).find(node => node.findAllByType('Text' as any).some(text => text.props.children === label))!;
  const camera = () => tree.root.findByType('TrailCamera' as any);
  const map = tree.root.findByType('Map' as any);
  const view = { bounds: [4.9, 59.9, 5.1, 60.1], center: [5.01, 60.01], zoom: 16, userInteraction: true };
  await act(() => map.props.onRegionDidChange({ nativeEvent: view }));
  assert.equal(watches, 0);
  await act(() => mode('Finn sti/strekk').props.onPress());
  assert.equal(watches, 1); assert.equal(tree.root.findByType('Map' as any), map);
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /Finn en sti i nærheten og start/);
  await act(() => camera().props.onSelect(camera().props.targets[0]));
  await act(() => tree.root.findByProps({ title: 'Velg sti og start tur' }).props.onPress());
  assert.equal(started.name, item.name); assert.ok(finder.trailStart(started));
  await act(() => tree.root.findByProps({ title: 'Vis på kartet' }).props.onPress());
  assert.equal(mapped.name, item.name); assert.equal(removed, 1);
  assert.equal(tree.root.findAllByType('TrailCamera' as any).length, 0);
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Åpne kart i fullskjerm' }).props.onPress());
  assert.deepEqual(tree.root.findByType('Camera' as any).props.initialViewState, view);
  await act(() => tree.root.findAllByProps({ accessibilityLabel: 'Minimer kartet' })[0].props.onPress());

  await act(() => tree.update(React.createElement(Explore, { recording: true, current: [point, { ...point, latitude: 60.0001, timestamp: point.timestamp + 10000 }] })));
  await act(() => mode('Finn sti/strekk').props.onPress());
  assert.equal(watches, 2);
  assert.equal(tree.root.findByProps({ id: 'live' }).props.data.features[0].geometry.coordinates.length, 2);
  await act(() => camera().props.onSelect(camera().props.targets[0]));
  assert.equal(tree.root.findAllByProps({ title: 'Velg sti og start tur' }).length, 0);
  assert.ok(tree.root.findByProps({ title: 'Vis på kartet' }));
  await act(() => tree.update(React.createElement(Explore, { recording: true, enabled: false })));
  assert.equal(removed, 2); assert.equal(tree.root.findAllByType('TrailCamera' as any).length, 0);
  await act(() => tree.update(React.createElement(Explore, { recording: true, enabled: true })));
  assert.equal(watches, 3);
  await act(() => mode('Kart').props.onPress());
  assert.equal(removed, 3);
});

test('map trail start action closes fullscreen before handing off; absent while recording', async t => {
  const item = { id: 'way/1', name: 'Fjellstien', kind: 'trail', osmHighway: 'path', latitude: 60, longitude: 5, geometry: [{ latitude: 60, longitude: 5 }, { latitude: 60.001, longitude: 5 }], fetchedAt: 0, sourceUrl: '' };
  let tree!: ReactTestRenderer, selected: any;
  const props = { position: item, discoveries: [item], onStartTrail: (value: any) => { selected = value; } };
  await act(() => { tree = create(React.createElement(TrailMap, props)); });
  t.after(async () => act(() => tree.unmount()));
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Åpne kart i fullskjerm' }).props.onPress());
  const source = tree.root.findByProps({ id: 'discoveries' });
  await act(() => source.props.onPress({ nativeEvent: { features: source.props.data.features, lngLat: [5, 60.0005] }, stopPropagation() {} }));
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Finn start med AR' }).props.onPress());
  assert.equal(selected.id, item.id); assert.equal(tree.root.findAllByType('Modal' as any).length, 0);
  await act(() => tree.update(React.createElement(TrailMap, { ...props, onStartTrail: undefined })));
  assert.equal(tree.root.findAllByProps({ accessibilityLabel: 'Finn start med AR' }).length, 0);
  assert.match(JSON.stringify(tree.toJSON()), /Fjellstien/);
});

test('selected distance stays in the fullscreen viewport; recenter preserves selection and refreshes stale GPS', async t => {
  const item = { id: 'steps/nearby', name: 'Trappen ved Bontelabo', kind: 'steps', latitude: 60, longitude: 5, geometry: [{ latitude: 60, longitude: 5 }, { latitude: 60.001, longitude: 5 }], fetchedAt: 0, sourceUrl: '' };
  const here = { latitude: 60.0005, longitude: 5.0004 };
  let requests = 0, tree!: ReactTestRenderer;
  const props = { position: here, selectedDiscovery: item, onLocate: () => requests++ };
  await act(() => { tree = create(React.createElement(TrailMap, props)); });
  t.after(async () => act(() => tree.unmount()));
  // React children contain owner references, so inspect host text instead.
  const label = () => tree.root.findByProps({ testID: 'map-selected-distance' }).findAllByType('Text' as any).map(n => n.props.children).join(' ');
  assert.match(label(), /Trappen ved Bontelabo.*Ca. 20 m unna · luftlinje/);
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Åpne kart i fullskjerm' }).props.onPress());
  assert.match(label(), /20 m unna/);
  cameraMoves.length = 0;
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Finn min posisjon i kartet' }).props.onPress());
  assert.deepEqual(Array.from(cameraMoves.at(-1).center), [here.longitude, here.latitude]);
  assert.equal(requests, 0);
  assert.equal(tree.root.findByProps({ id: 'discoveries' }).props.data.features[0].properties.selected, true);
  await act(() => tree.update(React.createElement(TrailMap, { ...props, position: { ...here, longitude: 5.004 }, positionStale: true })));
  assert.match(label(), /220 m unna.*Fra sist kjente posisjon/);
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Finn min posisjon i kartet' }).props.onPress());
  assert.equal(requests, 1);
  assert.deepEqual(Array.from(cameraMoves.at(-1).center), [5.004, here.latitude]);
  await act(() => tree.update(React.createElement(TrailMap, { ...props, locating: true })));
  assert.equal(tree.root.findByProps({ accessibilityLabel: 'Finn min posisjon i kartet' }).props.disabled, false);
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Finn min posisjon i kartet' }).props.onPress());
  assert.equal(requests, 1); // Can recenter on the known fix during an ongoing GPS request.
  await act(() => tree.root.findAllByProps({ accessibilityLabel: 'Minimer kartet' })[0].props.onPress());
  assert.match(label(), /20 m unna/);
  await act(() => tree.update(React.createElement(TrailMap, { ...props, position: null })));
  assert.match(label(), /Trenger posisjon for avstand/);
});
