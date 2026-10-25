import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {component} from './support/component';

const native={Text:'Text',TextInput:'TextInput',View:'View',Share:{share:async()=>{}}};
const ui={Button:'Button',Card:'Card',styles:{}};
const store={setting:(_key:string,fallback:unknown)=>fallback,saveSetting:()=>{}};
test('Gatekampen groups restore profile, hide owner actions from members and retain selection after failed load',async t=>{
 let fail=false,profile:{display_name:string}|null={display_name:'Helge'};
 const opened:string[]=[];
 const api={onlineConfigured:true,account:async()=>({user:{id:'me'}}),profile:async()=>profile,groups:async()=>[{id:'mine',name:'Min gruppe',owner_id:'me'},{id:'other',name:'Vennens gruppe',owner_id:'friend'}],availableCatalogues:async()=>[{id:'sandviken',name:'Sandviken'}],board:async(id:string)=>{opened.push(id);if(fail)throw Error('offline');return {name:id,season_name:'Oktober',season_id:'season',starts_at:'2026-10-01',ends_at:'2026-10-29',team:0,total:10,players:[]};},rpc:async()=>{}};
 const {Groups}=component('apps/gatekampen/Groups.tsx',{'react-native':native,'./ui':ui,'./api':api,'./store':store});
 let tree!:ReactTestRenderer;
 await act(async()=>{tree=create(React.createElement(Groups,{trips:[]}));});
 t.after(async()=>act(()=>tree.unmount()));
 assert.equal(tree.root.findByProps({accessibilityLabel:'Visningsnavn'}).props.value,'Helge');
 const press=async(title:string)=>{await act(async()=>tree.root.findByProps({title}).props.onPress());};
 await press('Vennens gruppe');assert.equal(tree.root.findAllByProps({title:'Inviter venner'}).length,0);
 await press('Min gruppe');assert.equal(tree.root.findAllByProps({title:'Inviter venner'}).length,1);
 fail=true;await press('Vennens gruppe');fail=false;await press('Oppdater resultater');
 assert.equal(opened.at(-1),'mine');
 await act(()=>tree.unmount());
 profile=null;
 await act(async()=>{tree=create(React.createElement(Groups,{trips:[]}));});
 await act(()=>{tree.root.findByProps({accessibilityLabel:'Invitasjonskode'}).props.onChangeText('code');tree.root.findByProps({accessibilityLabel:'Gruppenavn'}).props.onChangeText('Meyermarken');});
 assert.equal(tree.root.findByProps({title:'Bli med'}).props.disabled,true);
 assert.equal(tree.root.findByProps({title:'Start en sesong · 28 dager'}).props.disabled,true);
 await act(()=>tree.root.findByProps({accessibilityLabel:'Visningsnavn'}).props.onChangeText('Helge'));
 await press('Lagre navn');
 assert.equal(tree.root.findByProps({title:'Bli med'}).props.disabled,false);
 assert.equal(tree.root.findByProps({title:'Start en sesong · 28 dager'}).props.disabled,false);
});

test('Gatekampen OTP is tied to the requested address and changing email resets code entry',async t=>{
 let sent='';const api={onlineConfigured:true,account:async()=>null,sendCode:async(email:string)=>{sent=email;}};
 const {Groups}=component('apps/gatekampen/Groups.tsx',{'react-native':native,'./ui':ui,'./api':api,'./store':store});
 let tree!:ReactTestRenderer;
 await act(async()=>{tree=create(React.createElement(Groups,{trips:[]}));});
 t.after(async()=>act(()=>tree.unmount()));
 await act(()=>tree.root.findByProps({accessibilityLabel:'E-postadresse'}).props.onChangeText(' HELGE@example.com '));
 await act(async()=>tree.root.findByProps({title:'Send kode'}).props.onPress());
 assert.equal(sent,'helge@example.com');
 assert.equal(tree.root.findAllByProps({accessibilityLabel:'Kode fra e-posten'}).length,1);
 assert.equal(tree.root.findByProps({title:'Ny kode om 60 s'}).props.disabled,true);
 await act(()=>tree.root.findByProps({accessibilityLabel:'E-postadresse'}).props.onChangeText('another@example.com'));
 assert.equal(tree.root.findAllByProps({accessibilityLabel:'Kode fra e-posten'}).length,0);
});
