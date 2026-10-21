import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { component } from './support/component';
import { groundGuide } from '../src/domain/groundAr';
import type { CameraHeading, NearbyTrail } from '../src/domain/trailFinder';
import type { Fix } from '../src/domain/types';
const now = 100000;
const target = { id: 'stairs', bearing: 270, meters: 50 } as NearbyTrail;
const heading: CameraHeading = { bearing: 250, pitch: -50, reliable: true, timestamp: now, quality: 'approximate' };
const position: Fix = { latitude: 60, longitude: 5, timestamp: now, accuracy: 4, speed: null, altitude: null, altitudeAccuracy: null };

test('ground guides require selection, fresh positioning and trustworthy azimuth; deadline protects native rendering from frozen JS', () => {
  assert.deepEqual(groundGuide(target, heading, position, now), { id: 'stairs', bearing: 270, heading: 250, validUntil: now + 2500 });
  assert.equal(groundGuide(null, heading, position, now), null);
  assert.equal(groundGuide(target, { ...heading, reliable: false }, position, now), null);
  assert.equal(groundGuide(target, heading, position, now + 2600), null);
  assert.equal(groundGuide(target, heading, { ...position, accuracy: 30 }, now), null);
  assert.equal(groundGuide({ ...target, meters: 3 }, heading, position, now), null);
  assert.equal(groundGuide(target, { ...heading, pitch: -85 }, position, now), null);
  assert.ok(groundGuide(target, { ...heading, pitch: -65 }, position, now));
  assert.equal(groundGuide(target, heading, { ...position, timestamp: now - 29500 }, now)?.validUntil, now + 500);
});
function harness(native: any) {
  return component('src/ui/GroundCamera.tsx', {
    'expo-camera': { CameraView: 'CameraView' },
    expo: { requireOptionalNativeModule: () => native, requireNativeView: () => 'NativeGround' },
  }).GroundCamera;
}
test('ARCore exclusively owns supported preview; native failure releases it before mounting fallback, retry requires remount', async t => {
  let checks = 0, ready = 0; const states: any[] = [];
  const Component = harness({ availability: async () => { checks++; return 'ready'; } });
  const props = { active: true, guide: groundGuide(target, heading, position, now), style: {}, onReady: () => { ready++; }, onError() {}, onGroundState: (value: any) => states.push(value) };
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(Component, props)); });
  t.after(async () => act(() => tree.unmount()));
  assert.equal(tree.root.findAllByType('CameraView' as any).length, 0);
  await act(() => tree.root.findByType('NativeGround' as any).props.onState({ nativeEvent: { state: 'searching', reason: 'For mørkt', ready: true } }));
  assert.equal(ready, 1); assert.equal(states.at(-1).reason, 'For mørkt');
  await act(() => tree.update(React.createElement(Component, { ...props, guide: null })));
  assert.equal(checks, 1); assert.equal(tree.root.findByType('NativeGround' as any).props.guide, null);
  await act(() => tree.root.findByType('NativeGround' as any).props.onState({ nativeEvent: { state: 'unavailable', reason: 'Camera released', ready: false } }));
  assert.equal(tree.root.findAllByType('NativeGround' as any).length, 0);
  assert.equal(tree.root.findAllByType('CameraView' as any).length, 1);
  await act(() => tree.root.findByType('CameraView' as any).props.onCameraReady());
  assert.equal(ready, 2);
  await act(() => tree.update(React.createElement(Component, { ...props, active: false })));
  assert.equal(tree.toJSON(), null);
});
test('missing AR services keep ordinary camera usable and expose installation without prompting automatically', async t => {
  let installs = 0; const states: any[] = [];
  const Component = harness({ availability: async () => 'install', install: async () => { installs++; return false; } });
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(Component, { active: true, guide: null, style: {}, onReady() {}, onError() {}, onGroundState: (v: any) => states.push(v) })); });
  t.after(async () => act(() => tree.unmount()));
  assert.equal(installs, 0); assert.equal(states.at(-1).state, 'install');
  assert.equal(tree.root.findAllByType('CameraView' as any).length, 1);
  assert.equal(tree.root.findAllByType('NativeGround' as any).length, 0);
});
test('availability response after closing scanner cannot reopen the camera', async () => {
  let respond!: (value: string) => void; const states: any[] = [];
  const Component = harness({ availability: () => new Promise<string>(resolve => { respond = resolve; }) });
  let tree!: ReactTestRenderer;
  const props = { active: true, guide: null, style: {}, onReady() {}, onError() {}, onGroundState: (v: any) => states.push(v) };
  await act(() => { tree = create(React.createElement(Component, props)); });
  await act(() => tree.update(React.createElement(Component, { ...props, active: false })));
  await act(() => respond('ready'));
  assert.equal(tree.toJSON(), null); assert.equal(states.length, 0);
  await act(() => tree.unmount());
});
