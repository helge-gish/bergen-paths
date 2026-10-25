import * as SecureStore from 'expo-secure-store';
import type { Trip } from '../../src/domain/types';
const url=process.env.EXPO_PUBLIC_GATEKAMPEN_SUPABASE_URL?.replace(/\/$/,'')??'';
const key=process.env.EXPO_PUBLIC_GATEKAMPEN_SUPABASE_KEY??'';
export const onlineConfigured=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)&&!!key;
type Auth={access_token:string;refresh_token:string;expires_at:number;user:{id:string}};
const storageKey='gatekampen-auth-v1';
let refreshing:Promise<Auth>|null=null;
async function raw(path:string,body?:unknown,token?:string,method=body===undefined?'GET':'POST') {
  if(!onlineConfigured)throw new Error('Vennegrupper åpner når nettjenesten er koblet til. Gatesamlingen virker på mobilen.');
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),25000);
  try{
    const response=await fetch(url+path,{method,headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:c.signal});
    const text=await response.text();const data=text?JSON.parse(text):null;
    if(!response.ok)throw new Error(data?.msg??data?.message??data?.error_description??data?.error??`Nettjenesten svarte ${response.status}.`);
    return data;
  }finally{clearTimeout(timer);}
}
export async function account():Promise<Auth|null>{const value=await SecureStore.getItemAsync(storageKey);return value?JSON.parse(value):null;}
async function storeAuth(data:any){const auth:Auth={...data,expires_at:data.expires_at??Math.floor(Date.now()/1000)+data.expires_in};await SecureStore.setItemAsync(storageKey,JSON.stringify(auth));return auth;}
async function token(){const a=await account();if(!a)throw new Error('Logg inn først.');if(a.expires_at*1000>Date.now()+60000)return a.access_token;
  if(!refreshing)refreshing=raw('/auth/v1/token?grant_type=refresh_token',{refresh_token:a.refresh_token}).then(storeAuth).finally(()=>{refreshing=null;});return (await refreshing).access_token;
}
export async function sendCode(email:string){return raw('/auth/v1/otp',{email,create_user:true});}
export async function signIn(email:string,code:string){await storeAuth(await raw('/auth/v1/verify',{email,token:code,type:'email'}));}
export async function signOut(){const a=await account();try{if(a)await raw('/auth/v1/logout',{},a.access_token);}finally{await SecureStore.deleteItemAsync(storageKey);}}
export async function rpc(name:string,body:unknown={}){return raw('/rest/v1/rpc/'+name,body,await token());}
export async function availableCatalogues():Promise<{id:string;name:string}[]>{return raw('/rest/v1/catalogues?select=id,name&published_at=not.is.null',undefined,await token());}
export async function groups():Promise<{id:string;name:string}[]>{return raw('/rest/v1/groups?select=id,name',undefined,await token());}
export type Board={name:string;season_id:string;season_name:string;starts_at:string;ends_at:string;total:number;team:number;players:{id:string;name:string;streets:number}[]};
export async function board(id:string):Promise<Board>{return rpc('group_board',{p_group:id});}
export async function uploadWalk(season:string,trip:Trip){return raw('/functions/v1/gatekampen-verify',{season_id:season,walk:trip},await token());}
