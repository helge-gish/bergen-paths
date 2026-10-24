import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { component } from './support/component';
import * as sdk from '../packages/herebound-sdk';
import { registry } from '../apps/herebound/registry';
import { ultimaX } from '../games/ultima-x';

function text(node: ReactTestInstance | string): string {
  return typeof node === 'string' ? node : node.children.map(text).join('');
}
async function setup(permission: () => Promise<{ granted: boolean }> = async () => ({ granted: false })) {
  let value: string | null = JSON.stringify(sdk.newAccount('Eira'));
  const store: sdk.Persistence = { async read() { return value; }, async write(next) { value = next; } };
  const timers: (() => void)[] = [];
  const listeners: Record<string, (state: string) => void> = {};
  let time = Date.now() - 1000, gpsReads = 0;
  class Clock extends Date { static now() { return time++; } }
  const view = 'View';
  const native = {
    View: view, Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', TextInput: 'TextInput', ActivityIndicator: 'Spinner',
    StyleSheet: { create: (styles: unknown) => styles }, Platform: { OS: 'android' }, Linking: { openURL: async () => {} },
    BackHandler: { addEventListener: () => ({ remove() {} }) },
    AppState: { addEventListener: (_: string, cb: (state: string) => void) => { listeners.app = cb; return { remove() {} }; } },
  };
  const { Herebound } = component('apps/herebound/App.tsx', {
    'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: view, SafeAreaProvider: view },
    'expo-status-bar': { StatusBar: () => null },
    'expo-location': { Accuracy: { High: 4 }, requestForegroundPermissionsAsync: permission, getCurrentPositionAsync: async () => { gpsReads++; return { coords: { ...ultimaX.start.position, accuracy: 5 }, timestamp: Clock.now() }; } },
    'expo-file-system': {}, 'expo-sharing': {},
    '../../packages/herebound-sdk': sdk, './registry': { registry }, './storage': { persistence: store },
    './Map': { PortalArt: () => null, WorldMap: () => React.createElement('Map') },
  }, { Date: Clock, setInterval: (cb: () => void) => { timers.push(cb); return timers.length; }, clearInterval() {} });
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(Herebound, { games: registry, store })); });
  const buttons = () => tree.root.findAllByType('Pressable' as any);
  const click = async (label: string) => { const b = buttons().find(b => text(b) === label); assert.ok(b, `Missing button: ${label}`); assert.ok(!b.props.disabled, `Disabled: ${label}`); await act(async () => { b.props.onPress(); }); };
  return { tree, click, store, buttons, timers, listeners, gpsReads: () => gpsReads, saved: () => JSON.parse(value!), now: (next: number) => { time = next; }, close: async () => { await act(async () => tree.unmount()); } };
}

test('simulator starts in one tap without GPS and timer ticks never bounce back to catalogue', async () => {
  const ui = await setup();
  try {
    await ui.click('Start prøve');
    assert.equal(ui.saved().currentGame, 'ultima-x');
    assert.deepEqual(ui.saved().games['ultima-x'].position, ultimaX.start.position);
    assert.equal(ui.gpsReads(), 0);
    for (let i = 0; i < 5; i++) await act(async () => ui.timers.forEach(t => t()));
    assert.equal(ui.tree.root.findAllByType('Map' as any).length, 1);
    assert.ok(!ui.buttons().some(b => text(b) === 'Start prøve'));
    // Catalogue refresh must use one instant even when Date.now changes on EVERY read.
    await ui.click('← Spilloversikt');
    await act(async () => ui.timers.forEach(t => t()));
    assert.ok(ui.buttons().some(b => text(b) === 'Se startsted →'));
    await ui.click('Fortsett prøve');
    assert.equal(ui.saved().currentGame, 'ultima-x');
  } finally { await ui.close(); }
});

test('a delayed GPS permission result cannot undo a simulator start or launch a late GPS request', async () => {
  let resolve!: (value: { granted: boolean }) => void;
  const waiting = new Promise<{ granted: boolean }>(r => { resolve = r; });
  const ui = await setup(() => waiting);
  try {
    await ui.click('Finn spill nær meg');
    await ui.click('Start prøve');
    await act(async () => resolve({ granted: true }));
    assert.equal(ui.saved().currentGame, 'ultima-x');
    assert.equal(ui.gpsReads(), 0);
    assert.equal(ui.tree.root.findAllByType('Map' as any).length, 1);
  } finally { await ui.close(); }
});

test('foreground after a long pause refreshes simulator time and keeps the open start details visible', async () => {
  const ui = await setup();
  try {
    await ui.click('Start prøve');
    await ui.click('← Spilloversikt');
    await ui.click('Se startsted →');
    ui.now(Date.now() + 60_000);
    await act(async () => ui.listeners.app('active'));
    assert.ok(ui.buttons().some(b => text(b) === 'Vis startpunkt på kart'));
    assert.ok(ui.buttons().some(b => text(b) === 'Fortsett prøve' && !b.props.disabled));
    // Return to the real clock before the actual Session validates the command.
    ui.now(Date.now() - 500);
    await act(async () => ui.listeners.app('active'));
    await ui.click('Fortsett prøve');
    assert.equal(ui.saved().currentGame, 'ultima-x');
  } finally { await ui.close(); }
});
