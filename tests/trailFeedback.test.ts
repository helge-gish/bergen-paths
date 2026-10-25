import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {component} from './support/component';
import * as groups from '../src/domain/discoveryGroups';
import * as activity from '../src/domain/trailActivity';
import * as cues from '../src/domain/trailCues';
import type {Discovery} from '../src/domain/discoveries';
import type {Fix,Trip} from '../src/domain/types';
import * as workout from '../src/domain/workout';

test('completed unnamed trail can be rated and named; named trail only asks for stars',async()=>{
 const {TrailReview}=component('src/ui/TrailReview.tsx',{'react-native':{Modal:'Modal',Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',TextInput:'TextInput',View:'View'},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'../domain/discoveryGroups':groups,'./components':{Button:'Button'},'./theme':{colors:{},styles:{}}});
 let tree!:ReactTestRenderer,saved:any,closed=0;
 const item={id:'trail',name:'Sti',kind:'trail',unnamed:true};
 await act(()=>{tree=create(React.createElement(TrailReview,{item,onSave:(v:any)=>saved=v,onClose:()=>closed++}));});
 assert.equal(tree.root.findByProps({title:'Lagre'}).props.disabled,true);
 await act(()=>tree.root.findByProps({accessibilityLabel:'4 stjerner'}).props.onPress());
 await act(()=>tree.root.findByType('TextInput' as any).props.onChangeText('  Min hemmelige sti  '));
 await act(()=>tree.root.findByProps({title:'Lagre'}).props.onPress());
 assert.equal(saved.name,'Min hemmelige sti');assert.equal(saved.stars,4);
 await act(()=>tree.root.findByProps({title:'Senere'}).props.onPress());assert.equal(closed,1);
 await act(()=>tree.unmount());
 await act(()=>{tree=create(React.createElement(TrailReview,{item:{...item,unnamed:false,name:'Skredderdalen'},value:{stars:4},onSave:(v:any)=>saved=v,onClose(){}}));});
 assert.equal(tree.root.findAllByType('TextInput' as any).length,0);
 assert.equal(tree.root.findByProps({accessibilityLabel:'4 stjerner'}).props.accessibilityState.selected,true);
 await act(()=>tree.unmount());
});

test('map heading releases sensors in background, on AR switch and on unmount',async()=>{
 let receive:(v:any)=>void=()=>{},state:(s:string)=>void=()=>{},started=0,removed=0,listenersRemoved=0;
 const {useMapHeading}=component('src/ui/useMapHeading.ts',{'react-native':{AppState:{currentState:'active',addEventListener:(_:string,cb:typeof state)=>{state=cb;return{remove(){listenersRemoved++;}};}}},'expo-location':{watchHeadingAsync:async(cb:typeof receive)=>{receive=cb;started++;return{remove(){removed++;}};}}});
 function Probe({enabled=true}){return React.createElement('Heading',{value:useMapHeading(enabled)});}
 let tree!:ReactTestRenderer;await act(()=>{tree=create(React.createElement(Probe));});
 await act(()=>receive({trueHeading:90,magHeading:84,accuracy:2}));assert.equal(tree.root.findByType('Heading' as any).props.value,90);
 await act(()=>receive({trueHeading:-1,magHeading:84,accuracy:0}));assert.equal(tree.root.findByType('Heading' as any).props.value,null);
 await act(()=>state('background'));assert.equal(removed,1);
 await act(()=>state('active'));assert.equal(started,2);
 await act(()=>tree.update(React.createElement(Probe,{enabled:false})));assert.equal(removed,2);
 await act(()=>tree.update(React.createElement(Probe,{enabled:true})));assert.equal(started,3);
 await act(()=>tree.unmount());assert.equal(removed,3);assert.equal(listenersRemoved,1);
});

test('background GPS announces completion once, upgrades old muted recordings and honors trail voice off',async()=>{
 const start=Date.now()-400000;
 const points:Fix[]=Array.from({length:41},(_,i)=>({latitude:60+i*.0001,longitude:5,timestamp:start+i*10000,accuracy:4,speed:1.1,altitude:null,altitudeAccuracy:null}));
 const item:Discovery={id:'forest',name:'Skogsti',kind:'trail',osmHighway:'path',surface:'ground',latitude:60,longitude:5,geometry:points,sourceUrl:'',fetchedAt:start};
 let active:Trip={id:'walk',name:'',startedAt:start,endedAt:null,points,ghostId:null,audioEnabled:false,lastCueAt:0};
 const settings:Record<string,any>={natureDiscoveries:[item]},spoken:string[]=[];
 const store={active:()=>active,trails:()=>[],setting:(k:string,f:any)=>settings[k]??f,setSetting:(k:string,v:any)=>settings[k]=v,setAudio:(_:string,v:boolean)=>active={...active,audioEnabled:v}};
 const {syncTrailActivity}=component('src/services/trailActivity.ts',{'../data/native':{getStore:()=>store},'../domain/trailActivity':activity,'../domain/trailCues':cues,'./voice':{speak:async(text:string)=>{spoken.push(text);}}});
 await syncTrailActivity();assert.equal(spoken.length,1);assert.match(spoken[0],/fullført stien/);assert.equal(active.audioEnabled,true);
 await syncTrailActivity();assert.equal(spoken.length,1);
 settings.trailVoice=false;active={...active,id:'second'};await syncTrailActivity();assert.equal(spoken.length,1);
 settings.trailVoice=true;await syncTrailActivity();assert.equal(spoken.length,1,'enabling voice must not replay muted history');
});

test('workout pause, resume, stop and a different new session keep the same trip',async()=>{
 let now=Date.now(),trip:Trip={id:'same-walk',name:'',startedAt:now,endedAt:null,points:[],ghostId:null,audioEnabled:true,lastCueAt:0,workout:workout.createWorkout(now,true,'4x4')};
 let tree!:ReactTestRenderer;const changes:string[]=[],coaches:any[]=[];
 const store={active:()=>trip,updateWorkout:(_:string,action:any)=>{changes.push(action);trip={...trip,workout:workout.changeWorkout(trip.workout!,action,now)};}};
 const {WorkoutCard}=component('src/ui/Workout.tsx',{'react-native':{Alert:{alert(){}},Pressable:'Pressable',Switch:'Switch',Text:'Text',View:'View'},'../domain/workout':workout,'./theme':{colors:{},styles:{}},'./components':{Button:'Button',Icon:'Icon'},'../services/tripStatus':{syncTripStatus:async()=>{}},'../data/native':{getStore:()=>store},'../services/workoutCoach':{syncWorkoutCoach:async(v:Trip)=>{coaches.push(v.workout);},workoutVoiceError:()=>null}});
 const refresh=()=>tree.update(React.createElement(WorkoutCard,{trip,now,onChange:refresh}));
 await act(()=>{tree=create(React.createElement(WorkoutCard,{trip,now,onChange:refresh}));});
 now+=30000;await act(()=>tree.root.findByProps({title:'Pause trening'}).props.onPress());
 assert.equal(trip.workout!.elapsedMs,30000);assert.equal(trip.workout!.runningSince,null);
 now+=60000;await act(()=>tree.root.findByProps({title:'Fortsett trening'}).props.onPress());
 assert.equal(trip.workout!.elapsedMs,30000);assert.equal(trip.workout!.runningSince,now);
 now+=10000;await act(()=>tree.root.findByProps({title:'Avslutt trening'}).props.onPress());
 assert.equal(trip.workout!.endedAt,now);assert.equal(trip.endedAt,null);assert.equal(trip.id,'same-walk');
 const previous=trip.workout!;trip={...trip,workoutHistory:[previous],workout:workout.createWorkout(now,true,'walk-jog')};
 await act(refresh);assert.ok(tree.root.findByProps({title:'Avslutt trening'}));assert.equal(trip.workoutHistory![0].elapsedMs,40000);
 assert.deepEqual(changes,['pause','resume','stop']);assert.equal(coaches.length,3);
 await act(()=>tree.unmount());
});
