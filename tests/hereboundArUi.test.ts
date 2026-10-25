import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { component } from './support/component';
import { ultimaX } from '../games/ultima-x';
import * as sdk from '../packages/herebound-sdk';
const native={Text:'Text',View:'View',Pressable:'Pressable',ScrollView:'ScrollView',Modal:'Modal'};
const berries=ultimaX.encounters.find(e=>e.id==='rowan')!, merchant=ultimaX.encounters.find(e=>e.id==='maren')!;
const text=(tree:ReactTestRenderer)=>tree.root.findAllByType('Text' as any).map(n=>n.children.join('')).join(' ');
test('AR labels match the selected actor and only a visible anchored target can open its action',async()=>{
 let selected:string[]=[], change:(s:string)=>void=()=>{};
 const {FieldCamera}=component('apps/herebound/FieldCamera.tsx',{
  'react-native':{...native,Linking:{},AppState:{currentState:'active',addEventListener:(_:string,fn:typeof change)=>{change=fn;return {remove(){}};}}},
  'react-native-svg':{__esModule:true,default:'Svg',Line:'Line',Circle:'Circle'},
  expo:{requireOptionalNativeModule:()=>({availability:async()=>'ready'}),requireNativeView:()=>'NativeAr'},
  'expo-camera':{useCameraPermissions:()=>[{granted:true},async()=>{}]},
 });
 let tree!:ReactTestRenderer;
 const render=(encounter=berries,demo=false)=>React.createElement(FieldCamera,{encounter,lit:false,meters:8,onSelect:(e:any)=>selected.push(e.id),demo});
 await act(async()=>{tree=create(render());});
 const ar=()=>tree.root.findByType('NativeAr' as any);
 assert.match(text(tree),/Rognebær/);assert.match(text(tree),/8 m til funnsted/);
 assert.match(text(tree),/funnet dukker opp automatisk/);
 assert.equal(tree.root.findAllByType('Pressable' as any).length,0,'no placement button before the actor appears');
 await act(()=>ar().props.onInteract({nativeEvent:{id:berries.id}}));assert.deepEqual(selected,[]);
 await act(()=>ar().props.onState({nativeEvent:{state:'anchored',targetId:berries.id,reason:''}}));
 await act(()=>ar().props.onTarget({nativeEvent:{id:berries.id,x:.5,y:.4,visible:true}}));
 assert.match(text(tree),/Undersøk rognebær/);
 await act(()=>ar().props.onInteract({nativeEvent:{id:merchant.id}}));assert.deepEqual(selected,[]);
 await act(()=>ar().props.onInteract({nativeEvent:{id:berries.id}}));assert.deepEqual(selected,['rowan']);
 await act(()=>ar().props.onTarget({nativeEvent:{id:berries.id,x:1,y:.4,visible:false}}));
 assert.match(text(tree),/Utenfor bildet/);assert.doesNotMatch(text(tree),/Undersøk rognebær/);
 await act(()=>tree.update(render(merchant)));
 assert.equal(ar().props.scene.id,'maren');assert.doesNotMatch(text(tree),/Rognebær/);
 await act(()=>ar().props.onState({nativeEvent:{state:'anchored',targetId:berries.id,reason:''}}));
 await act(()=>ar().props.onTarget({nativeEvent:{id:berries.id,x:.5,y:.4,visible:true}}));
 assert.doesNotMatch(text(tree),/Snakk \/ handle/);
 await act(()=>ar().props.onState({nativeEvent:{state:'anchored',targetId:merchant.id,reason:''}}));
 await act(()=>ar().props.onTarget({nativeEvent:{id:merchant.id,x:.5,y:.4,visible:true}}));
 assert.match(text(tree),/Snakk \/ handle/);
 await act(()=>tree.root.findByProps({accessibilityLabel:'Plasser på nytt'}).props.onPress());
 assert.doesNotMatch(text(tree),/Snakk \/ handle/);assert.equal(ar().props.placement,1);
 await act(()=>change('background'));assert.equal(tree.root.findAllByType('NativeAr' as any).length,0);
 await act(()=>change('active'));assert.equal(ar().props.scene.id,'maren');assert.doesNotMatch(text(tree),/Snakk \/ handle/);
 await act(()=>tree.update(render(berries,true)));
 await act(()=>ar().props.onState({nativeEvent:{state:'anchored',targetId:berries.id,reason:''}}));
 await act(()=>ar().props.onTarget({nativeEvent:{id:berries.id,x:.5,y:.4,visible:true}}));
 await act(()=>ar().props.onInteract({nativeEvent:{id:berries.id}}));assert.deepEqual(selected,['rowan']);
 assert.match(text(tree),/ingen spillbelønning/);
 await act(()=>tree.unmount());
});
test('AR keeps one camera owner across fullscreen, named target selection stays stable when GPS leaves its range',async()=>{
 const {FieldScene}=component('apps/herebound/FieldScene.tsx',{
  'react-native':native,'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
  '../../packages/herebound-sdk':sdk,'./FieldMap':{FieldMap:'FieldMap'},'./FieldCamera':{FieldCamera:'FieldCamera'},
 });
 const now=Date.now(),fix={...berries.position,accuracy:5,timestamp:now,source:'gps' as const};
 const progress={packVersion:1,position:fix,discovered:ultimaX.encounters.map(e=>e.id),journal:[],stock:{},visits:1};
 const props={pack:ultimaX,progress,fix,now,initialTarget:berries.id,onSelect(){},onArSelect(){}};
 let tree!:ReactTestRenderer;await act(()=>{tree=create(React.createElement(FieldScene,props));});
 const camera=()=>tree.root.findByType('FieldCamera' as any);
 assert.equal(camera().props.encounter.id,'rowan');assert.ok(camera().props.meters<1);
 assert.ok(tree.root.findByProps({accessibilityLabel:'Velg Marens bod'}));
 const pressText=async(label:string)=>{const el=tree.root.findAllByType('Pressable' as any).find(n=>n.findAllByType('Text' as any).some(t=>t.children.join('')===label))!;assert.ok(el,label);await act(()=>el.props.onPress());};
 await pressText('⛶');assert.equal(tree.root.findAllByType('FieldCamera' as any).length,1);assert.equal(camera().props.encounter.id,'rowan');
 await pressText('↙');assert.equal(tree.root.findAllByType('FieldCamera' as any).length,1);
 await act(()=>tree.update(React.createElement(FieldScene,{...props,fix:{...fix,latitude:fix.latitude+.01}})));
 assert.equal(camera().props.encounter,undefined);assert.match(camera().props.emptyMessage,/Rognebær er utenfor rekkevidde/);
 await act(()=>tree.update(React.createElement(FieldScene,{...props,initialTarget:'maren'})));
 assert.equal(camera().props.encounter.id,'maren');
 await act(()=>tree.unmount());
});
