import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { create, act, type ReactTestRenderer } from 'react-test-renderer';
import { cameraTarget } from '../src/domain/trailFinder';
import { usablePosition } from '../src/domain/position';
import { shortDistance } from '../src/domain/metrics';
const require = createRequire(import.meta.url);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Execute the real component with React's renderer. Only native boundaries are
// replaced; hooks, effects, timeout, retry remount and JSX remain production code.
function harness(granted = true) {
  const permission = { granted, canAskAgain: true };
  const refresh = async () => permission;
  const mocks: Record<string, unknown> = {
    react: React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { View: 'View', Modal: 'Modal', Text: 'Text', Pressable: 'Pressable', Linking: { openSettings: async () => {} }, StyleSheet: { absoluteFillObject: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [permission, refresh, refresh] },
    expo: { requireOptionalNativeModule: () => null },
    '../domain/trailFinder': { cameraTarget }, '../domain/position': { usablePosition }, '../domain/metrics': { shortDistance },
    './components': { Button: 'Button' }, './theme': { styles: {} },
  };
  const source = readFileSync(new URL('../src/ui/TrailCamera.tsx', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports: any = {};
  runInNewContext(js, { exports, require: (id: string) => { assert.ok(id in mocks, `unmocked native boundary ${id}`); return mocks[id]; }, setTimeout, clearTimeout });
  const props = { active: true, position: null, targets: [], now: Date.now(), onSelect: () => {} };
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
  assert.equal(modal.findAllByType('CameraView' as any).length, 1);
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Minimer kameraet' }).props.onPress());
  await layout(tree); assert.equal(cameras(tree).length, 1);
  assert.equal(tree.root.findAllByType('Modal' as any).length, 0);
});
