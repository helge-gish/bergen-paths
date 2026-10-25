import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { component } from './support/component';
import * as names from '../src/domain/areaLabel';
import { completionNotice } from '../src/domain/completionNotice';
import { emptyTrailActivity, type TrailActivity } from '../src/domain/trailActivity';

test('area name prefers local district, avoids duplicate city and numeric house names', () => {
  assert.equal(names.addressLabel({district:'Sandviken', city:'Bergen'}),'Sandviken, Bergen');
  assert.equal(names.addressLabel({district:'Bergen', city:'Bergen'}),'Bergen');
  assert.equal(names.addressLabel({name:'42',city:'Bergen'}),'Bergen');
  assert.equal(names.addressLabel({street:'Breistølen',city:'Bergen'}),'Breistølen, Bergen');
  assert.equal(names.addressLabel({}),null);
  assert.equal(names.areaLabelFallback({latitude:60.40418,longitude:5.32703}),'60.404, 5.327');
});

test('area label uses pinned centre, caches name, ignores stale replies and works without permission', async () => {
  const settings:Record<string,unknown> = {};
  let permission=true;
  const calls:any[]=[];
  const replies:Array<(value:any)=>void>=[];
  const {useAreaName}=component('src/ui/useAreaName.ts', {
    'expo-location':{getForegroundPermissionsAsync:async()=>({granted:permission}),reverseGeocodeAsync:(p:any)=>{calls.push(p);return new Promise(resolve=>replies.push(resolve));}},
    '../domain/areaLabel':names,'../data/native':{getStore:()=>({setting:(k:string,f:any)=>settings[k]??f,setSetting:(k:string,v:any)=>settings[k]=v})},
  });
  function Probe({latitude=60.40418,recording=false}) {return React.createElement('Label',{value:useAreaName({latitude,longitude:5.32703},recording)});}
  let tree!:ReactTestRenderer;
  await act(()=>{tree=create(React.createElement(Probe));});
  assert.equal(calls[0].latitude,60.40418); assert.equal(calls[0].longitude,5.32703);
  await act(()=>tree.update(React.createElement(Probe,{latitude:60.5})));
  await act(()=>replies[0]([{district:'Old place'}]));
  assert.equal(tree.root.findByType('Label' as any).props.value,'60.500, 5.327');
  await act(()=>replies[1]([{district:'Sandviken',city:'Bergen'}]));
  assert.equal(tree.root.findByType('Label' as any).props.value,'Sandviken, Bergen');
  await act(()=>tree.unmount());
  await act(()=>{tree=create(React.createElement(Probe,{latitude:60.5}));});
  assert.equal(calls.length,2);
  assert.equal(tree.root.findByType('Label' as any).props.value,'Sandviken, Bergen');
  permission=false;
  await act(()=>tree.update(React.createElement(Probe,{latitude:60.6})));
  assert.equal(calls.length,2);
  assert.equal(tree.root.findByType('Label' as any).props.value,'60.600, 5.327');
  permission=true;
  await act(()=>tree.update(React.createElement(Probe,{latitude:60.6,recording:true})));
  await act(()=>replies[2]([]));
  assert.equal(tree.root.findByType('Label' as any).props.value,'60.600, 5.327');
  await act(()=>tree.unmount());
});

test('completion notice survives screen lock, is dismissible and never replays old history', () => {
  const now=Date.now();
  const event:TrailActivity={id:'new',tripId:'tour',itemId:'trail',referenceId:'trail',name:'Sti uten navn',source:'nature',direction:'forward',status:'completed',startedAt:now-180000,timestamp:now-120000,seconds:60};
  const report={...emptyTrailActivity(),log:[event]};
  assert.equal(completionNotice(report,'tour',[],now)?.id,'new');
  assert.equal(completionNotice(report,'tour',['new'],now),null);
  assert.equal(completionNotice(report,null,[],now)?.id,'new');
  assert.equal(completionNotice(report,null,[],now+3600000),null);
  assert.equal(completionNotice(report,'tour',[],now+3600000)?.id,'new');
});
