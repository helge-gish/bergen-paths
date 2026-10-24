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
  let gpsListener: ((value: any)=>void) | undefined;
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
    'expo-location': { Accuracy: { High: 4 }, requestForegroundPermissionsAsync: permission, getForegroundPermissionsAsync: permission, watchPositionAsync: async (_:unknown,cb:(value:any)=>void) => {gpsListener=cb;return {remove(){}};}, getCurrentPositionAsync: async () => { gpsReads++; return { coords: { ...ultimaX.start.position, accuracy: 5 }, timestamp: Clock.now() }; } },
    'expo-file-system': {}, 'expo-sharing': {},
    '../../packages/herebound-sdk': sdk, './registry': { registry }, './storage': { persistence: store },
    './GamePortal': { GamePortal: () => React.createElement('GamePortal') },
    './FieldCamera': { FieldCamera: () => React.createElement('FieldCamera') },
    './CharacterScreen': { CharacterScreen: () => React.createElement('CharacterScreen') },
    './FieldScene': { FieldScene: (props: any) => React.createElement('FieldScene', props) }, './FieldMap': { FieldMap: () => React.createElement('FieldMap') },
    './Map': { PortalArt: () => null, WorldMap: () => React.createElement('Map') },
  }, { Date: Clock, setInterval: (cb: () => void) => { timers.push(cb); return timers.length; }, clearInterval() {} });
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(Herebound, { games: registry, store })); });
  const buttons = () => tree.root.findAllByType('Pressable' as any);
  const click = async (label: string) => { const b = buttons().find(b => text(b) === label); assert.ok(b, `Missing button: ${label}`); assert.ok(!b.props.disabled, `Disabled: ${label}`); await act(async () => { b.props.onPress(); }); };
  return { tree, click, store, buttons, timers, listeners, emitGps: async (latitude:number,accuracy:number) => { await act(async()=>gpsListener?.({coords:{...ultimaX.start.position,latitude,accuracy},timestamp:Clock.now()})); }, gpsReads: () => gpsReads, saved: () => JSON.parse(value!), now: (next: number) => { time = next; }, close: async () => { await act(async () => tree.unmount()); } };
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


test('field UI starts from GPS catalogue and requires opening a discovered meeting through AR', async () => {
  const ui=await setup(async()=>({granted:true}));
  try {
    await ui.click('Finn spill nær meg');
    await ui.click('Se startsted →');
    await ui.click('Start ute');
    assert.equal(ui.saved().activeMode,'field');
    const maren=ultimaX.encounters.find(e=>e.id==='maren')!;
    let scene=ui.tree.root.findByType('FieldScene' as any);
    await act(async()=>scene.props.onSelect(maren));
    const inspect=ui.buttons().find(b=>text(b)==='Undersøk stedet');
    assert.ok(inspect?.props.disabled,'Map selection cannot authorize a field action');
    await ui.click('Finn dette i AR');
    scene=ui.tree.root.findByType('FieldScene' as any);
    assert.equal(scene.props.initialTarget,'maren');
    await act(async()=>scene.props.onArSelect(maren));
    await ui.click('Undersøk stedet');
    assert.ok(ui.saved().fieldGames['ultima-x'].discovered.includes('maren'));
  } finally {await ui.close();}
});


test('reported simulator bounce: one tap opens a meeting directly and actions keep it open across ticks', async()=>{
 const ui=await setup();try{
  await ui.click('Start prøve');
  const rowan=ultimaX.encounters.find(e=>e.id==='rowan')!;
  const map=ui.tree.root.findByType('Map' as any);
  // The simple map mock does not retain props; open the real location row.
  const row=ui.buttons().find(b=>text(b).includes('Rognebær') && text(b).includes('unna'))!;
  assert.ok(row);await act(async()=>row.props.onPress());
  assert.ok(ui.saved().games['ultima-x'].discovered.includes(rowan.id));
  assert.ok(ui.buttons().some(b=>text(b)==='Plukk 2 rognebær'));
  assert.ok(!ui.buttons().some(b=>text(b)==='Undersøk stedet'));
  await ui.click('Plukk 2 rognebær');
  for(let i=0;i<6;i++)await act(async()=>ui.timers.forEach(t=>t()));
  assert.ok(ui.buttons().some(b=>text(b)==='Fullført ✓'));
  assert.equal(ui.saved().character.inventory['herebound:rowanberry'],2);
  assert.equal(ui.tree.root.findAllByType('Map' as any).length,0,'Meeting must stay open');
  await ui.click('← Tilbake til verdenen');
  assert.equal(ui.tree.root.findAllByType('Map' as any).length,1);
 }finally{await ui.close();}
});

test('start details stay open during GPS refresh, expose camera and admit nominal start zone', async()=>{
 const ui=await setup(async()=>({granted:true}));try{
  await ui.click('Finn spill nær meg');await ui.click('Se startsted →');
  await ui.click('Test kamera · AR');assert.equal(ui.tree.root.findAllByType('FieldCamera' as any).length,1);
  await ui.click('Oppdater GPS');assert.ok(ui.buttons().some(b=>text(b)==='Start ute'));
  await ui.emitGps(ultimaX.start.position.latitude+.0006,25);
  assert.ok(text(ui.tree.root).includes('Du er i startsonen'));
  await ui.click('Start ute');assert.equal(ui.saved().activeMode,'field');
 }finally{await ui.close();}
});
