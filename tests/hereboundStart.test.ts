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
async function setup(permission: () => Promise<{ granted: boolean }> = async () => ({ granted: false }), initial=sdk.newAccount('Eira')) {
  let value: string | null = JSON.stringify(initial);
  let failWrite=false;
  const store: sdk.Persistence = { async read() { return value; }, async write(next) { if(failWrite)throw new Error('Disk full');value = next; } };
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
  return { tree, click, store, buttons, timers, listeners, failWrite:(fail:boolean)=>{failWrite=fail;}, emitGps: async (latitude:number,accuracy:number) => { await act(async()=>gpsListener?.({coords:{...ultimaX.start.position,latitude,accuracy},timestamp:Clock.now()})); }, gpsReads: () => gpsReads, saved: () => JSON.parse(value!), now: (next: number) => { time = next; }, close: async () => { await act(async () => tree.unmount()); } };
}

test('main tabs have no simulator, camera demo or global journal; denied GPS cannot start a game',async()=>{
 const ui=await setup();try{
  for(const label of ['Finn spill','Mine spill','Profil'])assert.ok(ui.buttons().some(b=>text(b)===label));
  assert.doesNotMatch(text(ui.tree.root),/Start prøve|Fortsett prøve|SIMULATOR|HJEMMEPRØVE|Journal|Test kamera/);
  await ui.click('Finn spill nær meg');assert.equal(ui.saved().currentGame,null);assert.equal(ui.gpsReads(),0);
  await ui.click('Mine spill');assert.match(text(ui.tree.root),/Spill du starter/);
  await ui.click('Profil');assert.equal(ui.tree.root.findAllByType('CharacterScreen' as any).length,1);
 }finally{await ui.close();}
});
async function start(ui:Awaited<ReturnType<typeof setup>>){await ui.click('Finn spill nær meg');await ui.click('Se spill');await ui.click('Start spill');}
test('start, tabs, clock ticks and resume keep exactly one field game and clearly name the active game',async()=>{
 const ui=await setup(async()=>({granted:true}));try{
  await start(ui);assert.equal(ui.saved().activeMode,'field');assert.match(text(ui.tree.root),/ULTIMA X/);
  assert.equal(ui.tree.root.findAllByType('FieldScene' as any).length,1);
  for(let i=0;i<5;i++)await act(async()=>ui.timers.forEach(t=>t()));
  assert.equal(ui.tree.root.findAllByType('FieldScene' as any).length,1);
  await ui.click('Mine spill');assert.equal(ui.tree.root.findAllByType('FieldScene' as any).length,0);
  assert.equal(ui.buttons().filter(b=>text(b)==='Fortsett').length,1);
  await ui.click('Fortsett');assert.equal(ui.tree.root.findAllByType('FieldScene' as any).length,1);
  assert.deepEqual(Object.keys(ui.saved().fieldGames),['ultima-x']);assert.deepEqual(ui.saved().games,{});
  await ui.click('Finn spill');assert.ok(ui.buttons().some(b=>text(b)==='Fortsett'));assert.ok(!ui.buttons().some(b=>text(b)==='Se spill'));
  await ui.click('Fortsett');assert.deepEqual(Object.keys(ui.saved().fieldGames),['ultima-x']);
 }finally{await ui.close();}
});
test('leaving the discovery tab cancels a pending permission result without jumping back into a game',async()=>{
 let resolve!:(value:{granted:boolean})=>void;const pending=new Promise<{granted:boolean}>(r=>{resolve=r;});
 const ui=await setup(()=>pending);try{
  await ui.click('Finn spill nær meg');await ui.click('Profil');await act(async()=>resolve({granted:true}));
  assert.equal(ui.gpsReads(),0);assert.equal(ui.saved().currentGame,null);assert.equal(ui.tree.root.findAllByType('CharacterScreen' as any).length,1);
 }finally{await ui.close();}
});
test('AR authorizes meetings and notes belong to the opened game',async()=>{
 const ui=await setup(async()=>({granted:true}));try{
  await start(ui);const maren=ultimaX.encounters.find(e=>e.id==='maren')!;
  let scene=ui.tree.root.findByType('FieldScene' as any);await act(async()=>scene.props.onSelect(maren));
  assert.ok(ui.buttons().find(b=>text(b)==='Undersøk stedet')?.props.disabled);
  await ui.click('Finn dette i AR');scene=ui.tree.root.findByType('FieldScene' as any);assert.equal(scene.props.initialTarget,'maren');
  await act(async()=>scene.props.onArSelect(maren));await ui.click('Undersøk stedet');await ui.click('Den forsvunne vokteren');
  assert.ok(ui.saved().fieldGames['ultima-x'].journal.some((j:any)=>j.id==='missing-keeper'));
  await ui.click('Spor og notater · 1');assert.match(text(ui.tree.root),/ULTIMA X/);assert.match(text(ui.tree.root),/Ivers siste besøk/);
  await ui.click('← Tilbake til spillet');await ui.click('Mine spill');assert.doesNotMatch(text(ui.tree.root),/Ivers siste besøk/);
 }finally{await ui.close();}
});
test('abandon requires confirmation, survives failed save, and next start creates one fresh adventure',async()=>{
 const ui=await setup(async()=>({granted:true}));try{
  await start(ui);await ui.click('Mine spill');const character=ui.saved().character;
  await ui.click('Avbryt spill');await ui.click('Behold spillet');assert.ok(ui.saved().fieldGames['ultima-x']);
  await ui.click('Avbryt spill');ui.failWrite(true);await ui.click('Ja, avbryt');assert.ok(ui.saved().fieldGames['ultima-x']);assert.match(text(ui.tree.root),/Noe gikk galt/);
  ui.failWrite(false);await ui.click('Ja, avbryt');assert.deepEqual(ui.saved().fieldGames,{});assert.equal(ui.saved().currentGame,null);assert.deepEqual(ui.saved().character,character);
  await ui.click('Finn spill i nærheten');await start(ui);assert.equal(ui.saved().fieldGames['ultima-x'].visits,1);assert.deepEqual(Object.keys(ui.saved().fieldGames),['ultima-x']);
 }finally{await ui.close();}
});
test('existing field saves open in Mine spill; old simulator saves remain stored but never become duplicate games',async()=>{
 const now=Date.now()-100,fix={...ultimaX.start.position,accuracy:5,timestamp:now,source:'gps' as const};
 let a=sdk.applyCommand(sdk.newAccount('Eira'),registry,{id:'old-field',expectedRevision:0,action:{type:'enter',gameId:ultimaX.id,mode:'field',fix}},now,fix).account;
 a.games[ultimaX.id]=JSON.parse(JSON.stringify(a.fieldGames![ultimaX.id]));
 const ui=await setup(async()=>({granted:true}),a);try{
  assert.equal(ui.buttons().filter(b=>text(b)==='Fortsett').length,1);assert.equal(ui.tree.root.findAllByType('FieldScene' as any).length,0);
  assert.ok(ui.saved().games[ultimaX.id]);await ui.click('Fortsett');assert.equal(ui.tree.root.findAllByType('FieldScene' as any).length,1);
  assert.equal(ui.saved().activeMode,'field');assert.deepEqual(Object.keys(ui.saved().fieldGames),['ultima-x']);
 }finally{await ui.close();}
});
