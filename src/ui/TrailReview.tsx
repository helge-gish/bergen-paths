import {useState} from 'react';
import {Modal,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {Discovery} from '../domain/discoveries';
import {needsDiscoveryName} from '../domain/discoveryGroups';
import {Button} from './components';
import {colors,styles as s} from './theme';
export function TrailReview({item,value,onSave,onClose}:{item:Discovery;value?:{name?:string;stars?:number};onSave:(value:{name?:string;stars?:number})=>void;onClose:()=>void}){
 const [name,setName]=useState(value?.name??''),[stars,setStars]=useState(value?.stars??0);
 const unnamed=needsDiscoveryName(item);
 return <Modal onRequestClose={onClose}><SafeAreaView style={s.screen}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
  <Text style={s.heading}>Sti fullført</Text><Text style={s.subheading}>{value?.name??(unnamed?'En sti uten navn':item.name)}</Text>
  <Text style={s.body}>Gi stjerner</Text><View style={{flexDirection:'row',justifyContent:'space-between'}}>{[1,2,3,4,5].map(n=><Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} stjerner`} accessibilityState={{selected:stars===n}} onPress={()=>setStars(n)} style={{minWidth:48,minHeight:54,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:36,color:n<=stars?colors.coral:colors.muted}}>{n<=stars?'★':'☆'}</Text></Pressable>)}</View>
  {unnamed&&<><Text style={s.body}>Navn (valgfritt)</Text><TextInput accessibilityLabel="Ditt navn på stien" value={name} onChangeText={setName} maxLength={80} placeholder="Gi stien et navn" style={[s.body,{borderColor:colors.line,borderWidth:1,borderRadius:12,padding:14}]} /></>}
  <Text style={s.small}>Dine navn og stjerner lagres på mobilen.</Text>
  <Button title="Lagre" disabled={!stars&&!name.trim()} onPress={()=>onSave({...value,...(unnamed&&name.trim()?{name:name.trim()}:{}),...(stars?{stars}:{})})} /><Button secondary title="Senere" onPress={onClose} />
 </ScrollView></SafeAreaView></Modal>;
}
