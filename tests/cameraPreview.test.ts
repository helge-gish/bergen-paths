import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { create, act, type ReactTestRenderer } from 'react-test-renderer';
import { cameraTarget, cameraPositionReady, cameraHeadingFresh, cameraPlaceType } from '../src/domain/trailFinder';
import { freshPosition, usablePosition } from '../src/domain/position';
import { groundGuide } from '../src/domain/groundAr';
import { shortDistance } from '../src/domain/metrics';
const require = createRequire(import.meta.url);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Execute the real component with React's renderer. Only native boundaries are
// replaced; hooks, effects, timeout, retry remount and JSX remain production code.
function harness(granted = true, sensor: unknown = null) {
  const permission = { granted, canAskAgain: true };
  const refresh = async () => permission;
  const mocks: Record<string, unknown> = {
    react: React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { View: 'View', Modal: 'Modal', ScrollView: 'ScrollView', Text: 'Text', Pressable: 'Pressable', Linking: { openSettings: async () => {} }, StyleSheet: { absoluteFillObject: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } } },
    'react-native-svg': { __esModule: true, default: 'Svg', Circle: 'Circle', Polyline: 'Polyline' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [permission, refresh, refresh] },
    expo: { requireOptionalNativeModule: () => sensor },
    '../domain/trailFinder': { cameraTarget, cameraPositionReady, cameraHeadingFresh, cameraPlaceType }, '../domain/position': { freshPosition, usablePosition }, '../domain/metrics': { shortDistance },
    './ReadingPanel': { ReadingPanel: (props: any) => React.createElement('ScrollView', {}, props.children), ReadingButton: 'Button' },
    './GroundCamera': { GroundCamera: (props: any) => React.createElement('CameraView', { ...props, onCameraReady: props.onReady, onMountError: props.onError }), installGroundAr: async () => false }, '../domain/groundAr': { groundGuide },
    './components': { Button: 'Button' }, './theme': { styles: {} },
  };
  const source = readFileSync(new URL('../src/ui/TrailCamera.tsx', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports: any = {};
  runInNewContext(js, { exports, require: (id: string) => { assert.ok(id in mocks, `unmocked native boundary ${id}`); return mocks[id]; }, setTimeout, clearTimeout });
  const props = { active: true, position: null, targets: [], now: Date.now(), onSelect: () => {}, onRetryGps: () => {} };
  return { Component: exports.TrailCamera, props, permission };
}
const cameras = (tree: ReactTestRenderer) => tree.root.findAllByType('CameraView' as any);
const content = (tree: ReactTestRenderer) => JSON.stringify(tree.toJSON());
const layout = async (tree: ReactTestRenderer) => act(() => tree.root.findAll(node => typeof node.props.onLayout === 'function')[0].props.onLayout({ nativeEvent: { layout: { width: 320 } } }));

test('camera waits for a measured surface and keeps startup status outside the preview', async t => {
  const h = harness(); let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(h.Component, h.props)); });
  t.after(async () => act(() => tree.unmount()));
  assert.equal(cameras(tree).length, 0); assert.match(content(tree), /Åpner kameraet/);
  await layout(tree);
  assert.equal(cameras(tree).length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(cameras(tree)[0].props.style)), { width: 320, height: 380 });
  const status = tree.root.findByProps({ accessibilityLiveRegion: 'polite' });
  assert.equal(status.findAllByType('CameraView' as any).length, 0);
  await act(() => cameras(tree)[0].props.onCameraReady());
  assert.match(content(tree), /Venter på fersk/); assert.doesNotMatch(content(tree), /Åpner kameraet/);
});
test('silent startup times out, releases camera, and retry creates a fresh measured session', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = harness(); let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(h.Component, h.props)); });
  t.after(async () => act(() => tree.unmount()));
  await layout(tree);
  await act(() => t.mock.timers.tick(10000));
  assert.equal(cameras(tree).length, 0); assert.match(content(tree), /Kameraet svarte ikke/);
  await act(() => tree.root.findByProps({ title: 'Prøv kamera igjen' }).props.onPress());
  assert.doesNotMatch(content(tree), /Kameraet svarte ikke/);
  await layout(tree); assert.equal(cameras(tree).length, 1);
  await act(() => cameras(tree)[0].props.onCameraReady());
  await act(() => t.mock.timers.tick(20000));
  assert.equal(cameras(tree).length, 1); assert.doesNotMatch(content(tree), /Kameraet svarte ikke/);
});
test('denied permission never mounts camera; background releases it and foreground reopens', async t => {
  const h = harness(false); let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(h.Component, h.props)); });
  t.after(async () => act(() => tree.unmount()));
  assert.equal(cameras(tree).length, 0); assert.match(content(tree), /Tillat kamera/);
  h.permission.granted = true;
  await act(() => tree.update(React.createElement(h.Component, { ...h.props })));
  await layout(tree); assert.equal(cameras(tree).length, 1);
  await act(() => tree.update(React.createElement(h.Component, { ...h.props, active: false })));
  assert.equal(cameras(tree).length, 0); assert.match(content(tree), /Kameraet er pauset/);
  await act(() => tree.update(React.createElement(h.Component, h.props)));
  assert.equal(cameras(tree).length, 1); assert.match(content(tree), /Åpner kameraet/);
});
test('native mount failure is visible and retryable without GPS', async t => {
  const h = harness(); let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(h.Component, h.props)); });
  t.after(async () => act(() => tree.unmount()));
  await layout(tree);
  await act(() => cameras(tree)[0].props.onMountError({ nativeEvent: { message: 'CAMERA_IN_USE' } }));
  assert.equal(cameras(tree).length, 0); assert.match(content(tree), /Kameraet kunne ikke åpnes/);
  assert.ok(tree.root.findByProps({ title: 'Prøv kamera igjen' }));
});
test('CameraX compatibility patch is repeatable and fails closed on upstream changes', () => {
  assert.ok(require('../package.json').expo.autolinking.android.buildFromSource.includes('expo-camera'));
  const { patchCameraPreview } = require('../scripts/patch-camera-preview.cjs');
  const before = 'private var previewView = PreviewView(context).apply {\n    elevation = 0f\n  }';
  const after = patchCameraPreview(before);
  assert.match(after, /implementationMode = PreviewView.ImplementationMode.COMPATIBLE/);
  assert.equal(patchCameraPreview(after), after);
  assert.throws(() => patchCameraPreview('private var newPreview = PreviewView(context)'), /review Android camera compatibility/);
});

test('fullscreen and minimize keep only one camera mounted', async t => {
  const h = harness(); let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(h.Component, h.props)); });
  t.after(async () => act(() => tree.unmount()));
  await layout(tree); assert.equal(cameras(tree).length, 1);
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Åpne kamera i fullskjerm' }).props.onPress());
  assert.equal(cameras(tree).length, 0);
  await layout(tree); assert.equal(cameras(tree).length, 1);
  const modal = tree.root.findByType('Modal' as any);
  assert.equal(modal.props.hardwareAccelerated, true);
  assert.equal(tree.root.findAllByProps({ accessibilityLiveRegion: 'polite' }).length, 0);
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Vis GPS- og kompasstatus' }).props.onPress());
  assert.ok(tree.root.findByProps({ accessibilityLiveRegion: 'polite' }));
  await act(() => tree.root.findByProps({ title: 'Lukk status' }).props.onPress());
  assert.equal(tree.root.findAllByProps({ accessibilityLiveRegion: 'polite' }).length, 0);
  assert.equal(modal.findAllByType('CameraView' as any).length, 1);
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Minimer kameraet' }).props.onPress());
  await layout(tree); assert.equal(cameras(tree).length, 1);
  assert.equal(tree.root.findAllByType('Modal' as any).length, 0);
});

test('GPS quality changes do not restart compass; nearby hints remain selectable and readiness is explicit', async t => {
  let starts = 0, stops = 0, gpsRetries = 0, selected: any;
  let emit: (value: any) => void = () => {};
  const sensor = { start: async () => { starts++; return true; }, stop: async () => { stops++; }, addListener: (_name: string, fn: typeof emit) => { emit = fn; return { remove() {} }; } };
  const h = harness(true, sensor); let tree!: ReactTestRenderer;
  const now = 1_000_000;
  const position = { latitude: 60, longitude: 5, timestamp: now, accuracy: 60, altitude: null, altitudeAccuracy: null, speed: null };
  const target = { id: 'gate', name: 'Gjeble Pedersens gate', item: { kind: 'street' }, meters: 100, bearing: 0, facts: { length: 200, ascent: null } };
  const props = { ...h.props, position, now, targets: [target], onRetryGps: () => { gpsRetries++; }, onSelect: (value: any) => { selected = value; } };
  await act(() => { tree = create(React.createElement(h.Component, props)); });
  t.after(async () => act(() => tree.unmount()));
  await layout(tree); await act(() => cameras(tree)[0].props.onCameraReady());
  await act(() => emit({ bearing: 0, pitch: 0, reliable: false, timestamp: now }));
  assert.equal(starts, 1); assert.equal(stops, 0);
  assert.ok(tree.root.findByProps({ testID: 'camera-proximity' }));
  assert.match(content(tree), /GPS: upresis · ±60 m/); assert.match(content(tree), /Kompass: usikkert/);
  assert.equal(tree.root.findAllByProps({ title: 'Prøv kamera igjen' }).length, 0);
  await act(() => tree.root.findByProps({ title: 'Oppdater GPS' }).props.onPress());
  assert.equal(gpsRetries, 1); assert.equal(starts, 1);
  // Selection callback is covered in the integrated expanded-panel test below.
  await act(() => tree.update(React.createElement(h.Component, { ...props, position: { ...position, accuracy: 4 } })));
  await act(() => emit({ bearing: 0, pitch: 0, reliable: true, timestamp: now }));
  assert.match(content(tree), /Klar · trykk/);
  assert.ok(tree.root.findByProps({ accessibilityLabel: 'Velg Gjeble Pedersens gate' }));
  assert.equal(tree.root.findAllByProps({ title: 'Oppdater GPS' }).length, 0);
  const later = now + 31000;
  await act(() => tree.update(React.createElement(h.Component, { ...props, position: { ...position, accuracy: 4 }, now: later })));
  await act(() => emit({ bearing: 0, pitch: 0, reliable: true, timestamp: later }));
  assert.match(content(tree), /Ved sist kjente posisjon/);
  assert.equal(tree.root.findAllByProps({ accessibilityLabel: 'Velg Gjeble Pedersens gate' }).length, 0);
  assert.equal(starts, 1); assert.equal(stops, 0);
  await act(() => tree.update(React.createElement(h.Component, { ...props, position: { ...position, accuracy: 4, timestamp: later }, now: later })));
  assert.match(content(tree), /Klar · trykk/); assert.equal(starts, 1);
  await act(() => emit({ bearing: 0, pitch: 0, reliable: false, timestamp: later }));
  assert.match(content(tree), /Retningen er usikker/);
  assert.ok(tree.root.findByProps({ testID: 'camera-proximity' }));
  await act(() => tree.update(React.createElement(h.Component, { ...props, active: false })));
  assert.equal(stops, 1);
});

test('being on a street does not hide a different visible trail; close street uses an unplaced proximity hint', async t => {
  let emit: (value: any) => void = () => {};
  const h = harness(true, { start: async () => true, stop: async () => {}, addListener: (_: string, fn: typeof emit) => { emit = fn; return { remove() {} }; } });
  const now = 1_000_000, position = { latitude: 60, longitude: 5, timestamp: now, accuracy: 15, altitude: null, altitudeAccuracy: null, speed: null };
  const near = { id: 'near', name: 'Gjeble Pedersens gate', item: { kind: 'street' }, meters: 3, bearing: 0, facts: { length: 200, ascent: null } };
  const far = { ...near, id: 'far', name: 'Fjellstien', item: { kind: 'trail' }, meters: 100 };
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(h.Component, { ...h.props, position, now, targets: [near, far] })); });
  t.after(async () => act(() => tree.unmount()));
  await layout(tree); await act(() => cameras(tree)[0].props.onCameraReady());
  await act(() => emit({ bearing: 0, pitch: 0, reliable: true, timestamp: now }));
  assert.match(content(tree), /Klar · trykk/);
  assert.ok(tree.root.findByProps({ testID: 'callout-far' }));
  assert.equal(tree.root.findAllByProps({ testID: 'callout-near' }).length, 0);
  assert.ok(tree.root.findByProps({ accessibilityLabel: 'Velg Fjellstien' }));
  assert.ok(tree.root.findByProps({ accessibilityLabel: 'Velg Gjeble Pedersens gate fra nærlisten' }));
  assert.equal(tree.root.findAllByProps({ accessibilityLabel: 'Velg Gjeble Pedersens gate' }).length, 0);
});

test('tap expands readable info in fullscreen, preserves other targets and offers start/map actions', async t => {
  const h = harness();
  const first = { id: 'a', name: 'Fjellstien', item: { kind: 'trail' }, meters: 100, bearing: 0, facts: { length: 500, ascent: null } };
  const second = { ...first, id: 'b', name: 'Gjeble Pedersens gate', item: { kind: 'street' } };
  let started: any, mapped: any;
  function Finder() {
    const [selected, setSelected] = React.useState<any>(null), [open, setOpen] = React.useState(false);
    return React.createElement(h.Component, { ...h.props, targets: [first, second], selected, detailsOpen: open,
      onSelect: (target: any) => { setSelected(target); setOpen(true); }, onCloseDetails: () => setOpen(false),
      details: selected && React.createElement('View', {}, React.createElement('Text', {}, selected.name, ' · 500 m · Vanskelighetsgrad: Ikke registrert'),
        React.createElement('Button', { title: 'Start tur', onPress: () => { started = selected; } }),
        React.createElement('Button', { title: 'Vis på kartet', onPress: () => { mapped = selected; } })) });
  }
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(Finder)); });
  t.after(async () => act(() => tree.unmount()));
  await layout(tree); await act(() => cameras(tree)[0].props.onCameraReady());
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Velg Fjellstien fra nærlisten' }).props.onPress());
  assert.equal(tree.root.findAllByType('Modal' as any).length, 1);
  const panel = tree.root.findByProps({ testID: 'camera-selection-details' });
  assert.match(panel.findAllByType('Text' as any).map(node => node.props.children).flat().join(' '), /500 m/);
  await act(() => panel.findByProps({ title: 'Start tur' }).props.onPress()); assert.equal(started, first);
  await act(() => panel.findByProps({ title: 'Vis på kartet' }).props.onPress()); assert.equal(mapped, first);
  await layout(tree); await act(() => cameras(tree)[0].props.onCameraReady());
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Tilbake til kamera' }).props.onPress());
  assert.equal(tree.root.findAllByProps({ testID: 'camera-selection-details' }).length, 0);
  assert.ok(tree.root.findByProps({ accessibilityLabel: 'Vis info om Fjellstien' }));
  assert.ok(tree.root.findByProps({ accessibilityLabel: 'Velg Gjeble Pedersens gate fra nærlisten' }));
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Vis info om Fjellstien' }).props.onPress());
  assert.ok(tree.root.findByProps({ testID: 'camera-selection-details' }));
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Minimer kameraet' }).props.onPress());
  assert.ok(tree.root.findByProps({ testID: 'camera-selection-details' }));
});

test('approximate compass draws dashed hints with uncertainty rings; calibration and stale sensor can retry alone', async t => {
  let emit: (value: any) => void = () => {}, starts = 0, stops = 0;
  const h = harness(true, { start: async () => { starts++; return true; }, stop: async () => { stops++; }, addListener: (_: string, callback: typeof emit) => { emit = callback; return { remove() {} }; } });
  const now = 1_000_000, position = { latitude: 60, longitude: 5, timestamp: now, accuracy: 4, altitude: null, altitudeAccuracy: null, speed: null };
  const target = { id: 'a', name: 'Fjellstien', item: { kind: 'trail' }, meters: 100, bearing: 0, facts: { length: 500, ascent: null } };
  const props = { ...h.props, position, now, targets: [target] };
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(h.Component, props)); });
  t.after(async () => act(() => tree.unmount()));
  await layout(tree); await act(() => cameras(tree)[0].props.onCameraReady());
  const preview = cameras(tree)[0];
  const reading = { bearing: 0, pitch: 0, timestamp: now, reliable: false, quality: 'unreliable', source: 'rotation', accuracy: 0, errorDegrees: 90 };
  await act(() => emit(reading));
  assert.match(content(tree), /Android-status/); assert.match(content(tree), /Kompass: usikkert/);
  assert.equal(tree.root.findAllByProps({ testID: 'callout-a' }).length, 0);
  await act(() => tree.root.findByProps({ title: 'Prøv kompass igjen' }).props.onPress());
  assert.equal(starts, 2); assert.equal(stops, 1); assert.equal(cameras(tree)[0], preview);
  await act(() => emit({ ...reading, reliable: true, quality: 'approximate', source: 'magnetic', accuracy: 2, errorDegrees: null }));
  assert.match(content(tree), /Omtrentlig retning/); assert.match(content(tree), /Magnetisk kompass/);
  assert.ok(tree.root.findByProps({ accessibilityLabel: 'Velg Fjellstien' }));
  assert.equal(tree.root.findAllByProps({ testID: 'callout-a' }).length, 0);
  assert.ok(tree.root.findByProps({ testID: 'approximate-callout-a' }));
  assert.equal(tree.root.findByProps({ testID: 'uncertainty-a' }).props.r, 18);
  await act(() => emit({ ...reading, reliable: true, quality: 'precise', accuracy: 0, errorDegrees: 10 }));
  assert.ok(tree.root.findByProps({ testID: 'callout-a' }));
  assert.equal(tree.root.findAllByProps({ testID: 'approximate-callout-a' }).length, 0);
  await act(() => tree.update(React.createElement(h.Component, { ...props, now: now + 3000 })));
  assert.equal(tree.root.findAllByProps({ testID: 'callout-a' }).length, 0);
  assert.ok(tree.root.findByProps({ title: 'Prøv kompass igjen' }));
  assert.match(content(tree), /Kompass: venter/);
});

test('ground anchor status follows native tracking and target identity; stale GPS falls back to proximity without promising an anchor', async t => {
  let emit: (value: any) => void = () => {};
  const h = harness(true, { start: async () => true, stop: async () => {}, addListener: (_: string, callback: typeof emit) => { emit = callback; return { remove() {} }; } });
  const now = 1_000_000, position = { latitude: 60, longitude: 5, timestamp: now, accuracy: 4, altitude: null, altitudeAccuracy: null, speed: null };
  const target = { id: 'a', name: 'Fjellstien', item: { kind: 'trail' }, meters: 100, bearing: 0, facts: { length: 500, ascent: null } };
  const props = { ...h.props, position, now, selected: target, targets: [target] };
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(h.Component, props)); });
  t.after(async () => act(() => tree.unmount()));
  await layout(tree); await act(() => cameras(tree)[0].props.onCameraReady());
  await act(() => emit({ bearing: 0, pitch: -65, reliable: true, quality: 'approximate', timestamp: now }));
  assert.equal(cameras(tree)[0].props.guide.id, 'a');
  await act(() => cameras(tree)[0].props.onGroundState({ state: 'searching', reason: 'For mørkt til å feste i underlaget', ready: true }));
  assert.match(content(tree), /For mørkt/);
  assert.doesNotMatch(content(tree), /Løft mobilen/);
  assert.equal(tree.root.findAllByProps({ testID: 'approximate-callout-a' }).length, 0);
  await act(() => cameras(tree)[0].props.onGroundState({ state: 'anchored', targetId: 'a', reason: 'Lokal retningspil', ready: true }));
  assert.match(content(tree), /Pil mot/);
  assert.equal(tree.root.findAllByProps({ testID: 'approximate-callout-a' }).length, 0);
  await act(() => tree.update(React.createElement(h.Component, { ...props, detailsOpen: true, details: React.createElement('Text', {}, 'Stiinfo') })));
  assert.equal(cameras(tree)[0].props.guide, null);
  assert.ok(tree.root.findByProps({ title: 'Vis retning i kamera' }));
  await act(() => tree.update(React.createElement(h.Component, { ...props, now: now + 31000 })));
  assert.equal(cameras(tree)[0].props.guide, null);
  assert.equal(tree.root.findAllByProps({ testID: 'ground-guide-status' }).length, 0);
  assert.ok(tree.root.findByProps({ testID: 'camera-proximity' }));
});
