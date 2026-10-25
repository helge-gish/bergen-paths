import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { component } from './support/component';
import { ultimaX } from '../games/ultima-x';
import * as sdk from '../packages/herebound-sdk';
import { sharedItems } from '../content/shared-items';
import parchment from '../apps/herebound/assets/parchment-map.json';

test('phone heading follows the short arc across north, expires, and stops in background',async()=>{
 let sample:(v:any)=>void=()=>{},appState:(s:string)=>void=()=>{},tick:()=>void=()=>{},removed=0,now=1000;
 const {usePlayerHeading,relativeHeading}=component('apps/herebound/usePlayerHeading.ts',{
  'react-native':{AppState:{currentState:'active',addEventListener:(_:string,f:any)=>{appState=f;return {remove(){}};}}},
  'expo-location':{watchHeadingAsync:async(f:any)=>{sample=f;return {remove(){removed++;}};}},
 },{Date:{now:()=>now},setInterval:(f:any)=>{tick=f;return 1;},clearInterval(){}});
 let heading:number|null=null;function Probe({enabled=true}:{enabled?:boolean}){heading=usePlayerHeading(enabled);return null;}
 let tree!:ReactTestRenderer;await act(()=>{tree=create(React.createElement(Probe));});
 await act(()=>sample({trueHeading:359,magHeading:20,accuracy:3}));assert.equal(heading,359);
 await act(()=>sample({trueHeading:1,magHeading:20,accuracy:3}));assert.equal(heading,359,'two-degree tremor stays still');
 await act(()=>sample({trueHeading:9,magHeading:20,accuracy:3}));assert.ok(heading!<2,'gentle short-arc movement across north');
 assert.equal(relativeHeading(10,350),20);assert.equal(relativeHeading(0,90),270);
 now+=6000;await act(()=>tick());assert.equal(heading,null);
 await act(()=>sample({trueHeading:-1,magHeading:60,accuracy:1}));assert.equal(heading,60);
 await act(()=>sample({trueHeading:80,magHeading:60,accuracy:0}));assert.equal(heading,null);
 await act(()=>appState('background'));assert.equal(removed,1);assert.equal(heading,null);
 await act(()=>appState('active'));await act(()=>sample({trueHeading:120,accuracy:3}));assert.equal(heading,120);
 await act(()=>tree.update(React.createElement(Probe,{enabled:false})));assert.equal(removed,2);assert.equal(heading,null);
 await act(()=>tree.unmount());
});
test('late heading subscriptions are removed after map closes',async()=>{
 let finish:(x:any)=>void=()=>{},removed=0;
 const {usePlayerHeading}=component('apps/herebound/usePlayerHeading.ts',{
  'react-native':{AppState:{currentState:'active',addEventListener:()=>({remove(){}})}},
  'expo-location':{watchHeadingAsync:()=>new Promise(resolve=>{finish=resolve;})},
 });
 function Probe(){usePlayerHeading(true);return null;}
 let tree!:ReactTestRenderer;await act(()=>{tree=create(React.createElement(Probe));});
 await act(()=>tree.unmount());await act(()=>finish({remove(){removed++;}}));assert.equal(removed,1);
});
test('game chooses its map theme; figure follows map bearing and stale fixes cannot imply live heading',async()=>{
 const stops:any[]=[],flights:any[]=[],enabled:boolean[]=[];
 const Camera=React.forwardRef((props:any,ref:any)=>{React.useImperativeHandle(ref,()=>({setStop:(x:any)=>stops.push(x),flyTo:(x:any)=>flights.push(x)}));return React.createElement('Camera',props);});
 const {FieldMap}=component('apps/herebound/FieldMap.tsx',{
  'react-native':{View:'View',Text:'Text',Pressable:'Pressable'},
  '@maplibre/maplibre-react-native':{Map:'Map',Camera,GeoJSONSource:'GeoJSONSource',Layer:'Layer',Marker:'Marker'},
  '../../packages/herebound-sdk':sdk,'./GamePortal':{GamePortal:'GamePortal'},
  './PlayerMarker':{PlayerMarker:'PlayerMarker'},'./EncounterMarker':{EncounterMarker:'EncounterMarker'},
  './assets/parchment-map.json':parchment,'./usePlayerHeading':{usePlayerHeading:(live:boolean)=>{enabled.push(live);return live?75:null;}},
 });
 const props={pack:ultimaX,position:ultimaX.start.position,positionLive:true};
 let tree!:ReactTestRenderer;await act(()=>{tree=create(React.createElement(FieldMap,props));});
 const map=()=>tree.root.findByType('Map' as any),figure=()=>tree.root.findByType('PlayerMarker' as any);
 assert.equal(JSON.parse(map().props.mapStyle).name,'Herebound · Parchment');assert.equal(figure().props.heading,75);
 await act(()=>map().props.onRegionIsChanging({nativeEvent:{bearing:35}}));assert.equal(figure().props.bearing,35);
 await act(()=>tree.root.findByProps({accessibilityLabel:'Vend kartet mot nord'}).props.onPress());assert.equal(stops[0].bearing,0);assert.equal(stops[0].center,undefined,'north reset preserves panned location');
 await act(()=>tree.root.findByProps({accessibilityLabel:'Tilbake til min posisjon'}).props.onPress());assert.deepEqual(Array.from(flights[0].center),[props.position.longitude,props.position.latitude]);
 assert.ok(tree.root.findByProps({id:'fog'}));
 assert.equal(tree.root.findAllByType('Pressable' as any).length,2,'only north and recenter; no tourist-map switch');
 await act(()=>tree.update(React.createElement(FieldMap,{...props,positionLive:false})));assert.equal(figure().props.stale,true);assert.equal(figure().props.heading,null);assert.equal(enabled.at(-1),false);
 await act(()=>tree.update(React.createElement(FieldMap,{...props,pack:{...ultimaX,mapTheme:undefined}})));assert.equal(map().props.mapStyle,'https://tiles.openfreemap.org/styles/liberty');assert.ok(tree.root.findByProps({id:'fog'}));
 await act(()=>tree.update(React.createElement(FieldMap,{...props,navigation:true})));
 assert.equal(JSON.parse(map().props.mapStyle).name,'Herebound · Parchment','same game style on entrance preview');
 assert.equal(tree.root.findAllByProps({id:'fog'}).length,0,'entrance directions remain visible before starting');
 await act(()=>tree.unmount());
});
test('parchment map keeps real terrain, walking paths, labels and attribution',()=>{
 assert.equal(parchment.sources.openmaptiles.url,'https://tiles.openfreemap.org/planet');
 assert.ok(parchment.layers.some(l=>l.id==='water'));assert.ok(parchment.layers.some(l=>l.id.includes('path')));
 assert.ok(parchment.layers.some(l=>l.type==='symbol'&&l.id.includes('name')));
 assert.match(parchment.sources.openmaptiles.attribution,/OpenStreetMap/);
 assert.doesNotMatch(JSON.stringify(parchment),/__TILEJSON_DOMAIN__/);
 sdk.createRegistry([ultimaX],sharedItems);sdk.createRegistry([{...ultimaX,mapTheme:undefined}],sharedItems);
 assert.throws(()=>sdk.validatePack({...ultimaX,mapTheme:'invalid'} as any),/karttema/);
});
test('new fountain encounter is reachable from the entrance without resetting collected encounters',()=>{
 const e=ultimaX.encounters.find(e=>e.id==='fountain-rowan')!;
 assert.ok(sdk.metersBetween(e.position,ultimaX.start.position)>55);
 assert.ok(sdk.metersBetween(e.position,ultimaX.start.position)<ultimaX.start.radiusMeters);
 assert.equal(ultimaX.version,1);
 assert.ok(!ultimaX.encounters.filter(x=>x!==e).some(x=>x.interaction?.clue.id===e.interaction!.clue.id));
 const registry=sdk.createRegistry([ultimaX],sharedItems),now=1800000000000;
 let account=sdk.newAccount('Test');let n=0;
 const run=(action:any)=>{account=sdk.applyCommand(account,registry,{id:`fountain-${++n}`,expectedRevision:account.revision,action},now).account;};
 run({type:'enter',gameId:ultimaX.id,fix:{...e.position,accuracy:0,timestamp:now,source:'simulation'}});
 run({type:'discover',encounterId:e.id});run({type:'interact',encounterId:e.id});run({type:'interact',encounterId:e.id});
 assert.equal(account.character.inventory['herebound:rowanberry'],2,'one reward even if tapped again');
});
test('avatar glyph rotates only its soft view fan and reflects equipped gear; stale position has no fan',async()=>{
 const {PlayerMarker}=component('apps/herebound/PlayerMarker.tsx',{
  'react-native':{View:'View',Text:'Text'},
  'react-native-svg':{__esModule:true,default:'Svg',G:'G',Circle:'Circle',Ellipse:'Ellipse',Path:'Path',Rect:'Rect',Defs:'Defs',RadialGradient:'RadialGradient',Stop:'Stop'},
  '../../packages/herebound-sdk':sdk,'./usePlayerHeading':{relativeHeading:(a:number,b:number)=>(a-b+360)%360},
 });
 const player={appearance:sdk.DEFAULT_APPEARANCE,equipment:ultimaX.items.filter(i=>i.wearable),level:3,skin:ultimaX.skins![0]};
 let tree!:ReactTestRenderer;await act(()=>{tree=create(React.createElement(PlayerMarker,{player,heading:20,bearing:90}));});
 assert.equal(tree.root.findAllByType('G' as any).find(n=>n.props.rotation!==undefined)!.props.rotation,290);
 assert.ok(tree.root.findByType('RadialGradient' as any));
 assert.equal(tree.root.findAllByType('Path' as any).filter(n=>n.props.fill==='url(#player-view-fan)').length,1);
 assert.ok(tree.root.findAllByType('Rect' as any).some(n=>n.props.fill==='#ae7846'),'equipped satchel visible');
 assert.ok(tree.root.findAllByType('Text' as any).some(n=>n.children.join('')==='DEG · 3'));
 await act(()=>tree.update(React.createElement(PlayerMarker,{player,heading:20,bearing:90,stale:true})));
 assert.ok(!tree.root.findAllByType('G' as any).some(n=>n.props.rotation!==undefined));
 assert.ok(tree.root.findAllByType('Text' as any).some(n=>n.children.join('')==='SIST'));
 await act(()=>tree.unmount());
});
