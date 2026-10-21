import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { component } from './support/component';
import * as neighborhood from '../src/domain/neighborhood';
import { neighborhoodStreets, streetRows } from '../src/domain/neighborhood';
import * as rows from '../src/domain/discoveryRows';
const { NeighborhoodCard, NeighborhoodDetails } = component('src/ui/Neighborhood.tsx', {
  'react-native': { View:'View',Text:'Text',Pressable:'Pressable' },
  '../domain/discoveryRows':rows, '../domain/neighborhood':neighborhood,
  './DiscoveryRows':{ DiscoveryRows:({rows,renderItem}:any)=>React.createElement(React.Fragment,null,...rows.map(renderItem)) },
  './components':{Button:'Button',Icon:'Icon'},'./theme':{colors:{},styles:{}},
});
const area={latitude:60,longitude:5,radius:3000,name:'Bergen'};
const items=[{...area,id:'a',name:'Testgaten',kind:'street' as const,geometry:[area,{...area,latitude:60.001}],fetchedAt:0,sourceUrl:''}];
test('main metric exposes incomplete checks and errors, not a finished zero or hundred percent', async t=>{
 let tree!:ReactTestRenderer;
 const result=neighborhoodStreets(streetRows(items),area,{});
 const props={results:{street:result,steps:neighborhoodStreets([],area,{}),trail:neighborhoodStreets([],area,{})},area,pending:true,error:null,live:false,onPress(){}};
 await act(()=>{tree=create(React.createElement(NeighborhoodCard,props));});
 t.after(async()=>act(()=>tree.unmount()));
 assert.match(JSON.stringify(tree.toJSON()),/Sjekker lagrede turer/);
 assert.match(JSON.stringify(tree.toJSON()),/sist kjente posisjon/);
 await act(()=>tree.update(React.createElement(NeighborhoodCard,{...props,pending:false,error:'Feil'})));
 assert.match(JSON.stringify(tree.toJSON()),/Tursjekken må prøves igjen/);
 assert.doesNotMatch(JSON.stringify(tree.toJSON()),/Sjekker lagrede turer/);
 await act(()=>tree.update(React.createElement(NeighborhoodCard,{...props,area:null,result:neighborhoodStreets([],null,{})})));
 assert.equal(tree.root.findAllByProps({accessibilityRole:'progressbar'}).length,0);
});
test('street drilldown filters completed streets and opens the actual mapped street',async t=>{
 let tree!:ReactTestRenderer, selected:any;
 const progress={a:{fraction:1,collected:true,firstVisit:1}};
 const result=neighborhoodStreets(streetRows(items),area,progress);
 await act(()=>{tree=create(React.createElement(NeighborhoodDetails,{results:{street:result,steps:neighborhoodStreets([],area,{}),trail:neighborhoodStreets([],area,{})},initialKind:'street',area,pending:false,error:null,live:true,progress,syncError:null,busy:false,onSync(){},onRetry(){},onMap(item:any){selected=item;}}));});
 t.after(async()=>act(()=>tree.unmount()));
 const controls=tree.root.findAllByType('Pressable' as any);
 await act(()=>controls.find(n=>n.findAllByType('Text' as any).some(text=>Array.isArray(text.props.children)&&text.props.children[0]==='Fullført'))!.props.onPress());
 await act(()=>tree.root.findByProps({accessibilityLabel:'Vis Testgaten i kartet'}).props.onPress());
 assert.equal(selected,items[0]);
});
