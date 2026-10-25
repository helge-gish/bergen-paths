import React,{useEffect,useMemo,useRef,useState} from 'react';
import {View,Text} from 'react-native';
import {Map,Camera,GeoJSONSource,Layer,Marker,type CameraRef} from '@maplibre/maplibre-react-native';
import type {Discovery,Progress} from '../../src/domain/discoveries';
import type {Fix,Coordinate} from '../../src/domain/types';
import type {Area} from './domain';
import {Button,colors} from './ui';
export function StreetMap({streets,progress,area,position,selected,onSelect,onFull,full=false}:{streets:Discovery[];progress:Record<string,Progress>;area:Area;position:Fix|null;selected:string|null;onSelect:(id:string)=>void;onFull:()=>void;full?:boolean}){
 const camera=useRef<CameraRef>(null),[failed,setFailed]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{if(!ready||!selected)return;const street=streets.find(s=>s.id===selected);if(!street)return;const points=(street.streetPaths??[street.geometry]).flat();camera.current?.fitBounds([Math.min(...points.map(p=>p.longitude))-.0002,Math.min(...points.map(p=>p.latitude))-.0001,Math.max(...points.map(p=>p.longitude))+.0002,Math.max(...points.map(p=>p.latitude))+.0001],{padding:{top:80,right:40,bottom:80,left:40},duration:450});},[selected,ready,streets]);
 const line=(points:Coordinate[])=>points.map(p=>[p.longitude,p.latitude]);
 const data=useMemo(()=>({type:'FeatureCollection' as const,features:streets.map(s=>({type:'Feature' as const,id:s.id,properties:{id:s.id,status:progress[s.id]?.collected?'done':progress[s.id]?.fraction>0?'partial':'new',selected:s.id===selected},geometry:{type:'MultiLineString' as const,coordinates:(s.streetPaths??[s.geometry]).map(line)}}))}),[streets,progress,selected]);
 const boundary={type:'Feature' as const,properties:{},geometry:{type:'Polygon' as const,coordinates:[line(area.polygon)]}};
 return <View style={{flex:1,minHeight:340,backgroundColor:colors.pale}}><Map style={{flex:1}} mapStyle="https://tiles.openfreemap.org/styles/liberty" attribution logo={false} onDidFailLoadingMap={()=>setFailed(true)} onDidFinishLoadingMap={()=>{setFailed(false);setReady(true);}}>
 <Camera ref={camera} initialViewState={{center:[area.center.longitude,area.center.latitude],zoom:14.7}}/>
 <GeoJSONSource id="area" data={boundary}><Layer id="area-border" type="line" paint={{'line-color':colors.blue,'line-width':2,'line-dasharray':[2,3],'line-opacity':.45}}/></GeoJSONSource>
 <GeoJSONSource id="streets" data={data} onPress={event=>{const id=event.nativeEvent.features?.[0]?.properties?.id;if(typeof id==='string')onSelect(id);}}>
 <Layer id="street-halo" type="line" paint={{'line-color':'#fff','line-width':7,'line-opacity':.8}}/>
 <Layer id="street-colors" type="line" paint={{'line-color':['match',['get','status'],'done',colors.green,'partial',colors.orange,'#71809B'],'line-width':['case',['get','selected'],7,4],'line-opacity':.9}}/>
 <Layer id="street-touch" type="line" paint={{'line-color':'#fff','line-width':24,'line-opacity':.01}}/>
 </GeoJSONSource>
 {position&&<Marker lngLat={[position.longitude,position.latitude]}><View style={{width:22,height:22,borderRadius:11,borderWidth:3,borderColor:'white',backgroundColor:Date.now()-position.timestamp<30000?'#2479FF':'#727B8A'}}/></Marker>}
 </Map>
 <View style={{position:'absolute',top:10,right:10}}><Button secondary title={full?'↙ Minimer':'⛶ Fullskjerm'} onPress={onFull}/></View>
 <View style={{position:'absolute',bottom:32,right:10}}><Button secondary title="◎ Meg" disabled={!position} onPress={()=>{if(position)camera.current?.flyTo({center:[position.longitude,position.latitude],zoom:17,duration:400});}}/></View>
 {failed&&<View style={{position:'absolute',left:10,bottom:8,padding:10,backgroundColor:'white'}}><Text>Kartbakgrunnen kunne ikke lastes.</Text></View>}
 </View>;
}
