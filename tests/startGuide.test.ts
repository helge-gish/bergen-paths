import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { component } from './support/component';
import * as gate from '../src/domain/startGate';
import type { Fix } from '../src/domain/types';

test('start zone requires fresh accurate GPS; arrival buzz is once per entry, background return rechecks and walking directions use fixed start', async t => {
  let emit: (fix: Fix) => void = () => {}, appState: (state: string) => void = () => {}, vibrations = 0, ready = false, opened = '';
  const { StartGuide } = component('src/ui/StartGuide.tsx', {
    'react-native': { View: 'View', Text: 'Text', Vibration: { vibrate: () => { vibrations++; } }, Linking: { openURL: async (url: string) => { opened = url; } }, AppState: { currentState: 'active', addEventListener: (_: string, cb: typeof appState) => { appState = cb; return { remove() {} }; } } },
    'expo-location': { Accuracy: { High: 4 }, requestForegroundPermissionsAsync: async () => ({ granted: true }), watchPositionAsync: async (_: unknown, cb: typeof emit) => { emit = cb; return { remove() {} }; } },
    '../domain/startGate': gate, '../services/tracking': { toFix: (fix: Fix) => fix }, './TrailMap': { TrailMap: 'TrailMap' }, './components': { Button: 'Button' }, './theme': { styles: {} },
  });
  const point = { latitude: 60, longitude: 5 };
  const fix = (meters: number, extra: Partial<Fix> = {}): Fix => ({ ...point, latitude: point.latitude + meters / 111195, timestamp: Date.now(), accuracy: 4, altitude: null, altitudeAccuracy: null, speed: null, ...extra });
  const props = { destination: { id: 'trail', point, saved: false }, onReady: (value: boolean) => { ready = value; } };
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(StartGuide, props)); });
  t.after(async () => act(() => tree.unmount()));
  assert.equal(ready, false);
  await act(() => emit(fix(100))); assert.equal(ready, false); assert.equal(vibrations, 0);
  await act(() => emit(fix(5, { accuracy: 50 }))); assert.equal(ready, false);
  await act(() => emit(fix(5, { timestamp: Date.now() - 20000 }))); assert.equal(ready, false);
  await act(() => emit(fix(20))); assert.equal(ready, true); assert.equal(vibrations, 1);
  assert.match(JSON.stringify(tree.toJSON()), /Du er ved start/);
  await act(() => emit(fix(27))); assert.equal(ready, false);
  await act(() => emit(fix(23))); assert.equal(ready, true); assert.equal(vibrations, 1);
  await act(() => tree.root.findByProps({ title: 'Åpne gangvei i Google Maps' }).props.onPress());
  assert.match(opened, /destination=60,5&travelmode=walking/);
  await act(() => appState('background')); assert.equal(ready, false);
  await act(() => appState('active')); assert.equal(ready, false);
  await act(() => emit(fix(15))); assert.equal(ready, true); assert.equal(vibrations, 1);
  await act(() => emit(fix(55))); assert.equal(ready, false);
  await act(() => emit(fix(20))); assert.equal(ready, true); assert.equal(vibrations, 2);
  await act(() => tree.update(React.createElement(StartGuide, { ...props, destination: { ...props.destination, id: 'different', point: { latitude: 61, longitude: 5 } } })));
  assert.equal(ready, false); assert.equal(vibrations, 2);
});
