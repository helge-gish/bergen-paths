import * as SecureStore from 'expo-secure-store';
import type { Trip } from '../../src/domain/types';
import {supabaseUrl,supabasePublishableKey} from './publicConfig';
const url=process.env.EXPO_PUBLIC_GATEKAMPEN_SUPABASE_URL?.replace(/\/$/,'')??supabaseUrl;
const key=process.env.EXPO_PUBLIC_GATEKAMPEN_SUPABASE_KEY??supabasePublishableKey;
export const onlineConfigured=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)&&!!key;
type Auth={access_token:string;refresh_token:string;expires_at:number;user:{id:string}};
const storageKey='gatekampen-auth-v1';
let refreshing:Promise<Auth>|null=null;
export class ApiError extends Error {
  constructor(message:string,public status:number){super(message);}
}
async function raw(path:string,body?:unknown,token?:string,method=body===undefined?'GET':'POST') {
  if(!onlineConfigured)throw new Error('Vennegrupper åpner når nettjenesten er koblet til. Gatesamlingen virker på mobilen.');
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),25000);
  try{
    const response=await fetch(url+path,{method,headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:c.signal});
    const text=await response.text();let data:any=null;
    try{data=text?JSON.parse(text):null;}catch{throw new ApiError('Nettjenesten svarte ikke som forventet. Prøv igjen.',response.status);}
    if(!response.ok){
      const code=data?.error_code??data?.code;
      const message=code==='email_address_not_authorized'?'E-postinnlogging er ikke åpnet for denne adressen ennå.':code==='over_email_send_rate_limit'||response.status===429?'Vent litt før du prøver igjen.':code==='otp_expired'?'Koden er utløpt eller feil. Be om en ny kode.':data?.msg??data?.message??data?.error_description??data?.error??`Nettjenesten svarte ${response.status}.`;
      throw new ApiError(message,response.status);
    }
    return data;
  }catch(e){if(c.signal.aborted)throw new Error('Nettjenesten bruker for lang tid. Prøv igjen.');throw e;}finally{clearTimeout(timer);}
}
export async function account():Promise<Auth|null>{const value=await SecureStore.getItemAsync(storageKey);return value?JSON.parse(value):null;}
async function storeAuth(data:any){
  const expires_at=data.expires_at??Math.floor(Date.now()/1000)+data.expires_in;
  if(typeof data.access_token!=='string'||!data.access_token||typeof data.refresh_token!=='string'||!data.refresh_token||typeof data.user?.id!=='string'||!Number.isFinite(expires_at))throw new Error('Innloggingen kunne ikke fullføres. Be om en ny kode.');
  const auth:Auth={access_token:data.access_token,refresh_token:data.refresh_token,expires_at,user:{id:data.user.id}};
  await SecureStore.setItemAsync(storageKey,JSON.stringify(auth));return auth;
}
async function token(){const a=await account();if(!a)throw new Error('Logg inn først.');if(a.expires_at*1000>Date.now()+60000)return a.access_token;
  if(!refreshing)refreshing=raw('/auth/v1/token?grant_type=refresh_token',{refresh_token:a.refresh_token}).then(storeAuth).catch(async e=>{
    if(e instanceof ApiError&&[400,401,403].includes(e.status)){await SecureStore.deleteItemAsync(storageKey);throw new Error('Innloggingen har utløpt. Logg inn på nytt.');}throw e;
  }).finally(()=>{refreshing=null;});return (await refreshing).access_token;
}
export async function sendCode(email:string){return raw('/auth/v1/otp',{email:email.trim().toLowerCase(),create_user:true});}
export async function signIn(email:string,code:string){await storeAuth(await raw('/auth/v1/verify',{email:email.trim().toLowerCase(),token:code.trim(),type:'email'}));}
export async function signOut(){
  // Finish an in-flight refresh before deleting the session, so it cannot sign
  // the player back in after logout. Offline logout still clears this device.
  if(refreshing)await refreshing.catch(()=>{});
  const a=await account();try{if(a)await raw('/auth/v1/logout',{},a.access_token);}finally{await SecureStore.deleteItemAsync(storageKey);}
}
export async function rpc(name:string,body:unknown={}){return raw('/rest/v1/rpc/'+name,body,await token());}
export async function availableCatalogues():Promise<{id:string;name:string}[]>{return raw('/rest/v1/catalogues?select=id,name&published_at=not.is.null',undefined,await token());}
export async function profile():Promise<{display_name:string}|null>{const rows=await raw('/rest/v1/profiles?select=display_name',undefined,await token());return rows[0]??null;}
export async function groups():Promise<{id:string;name:string;owner_id:string}[]>{return raw('/rest/v1/groups?select=id,name,owner_id',undefined,await token());}
export type Board={name:string;season_id:string;season_name:string;starts_at:string;ends_at:string;total:number;team:number;players:{id:string;name:string;streets:number}[]};
export async function board(id:string):Promise<Board>{return rpc('group_board',{p_group:id});}
export async function uploadWalk(season:string,trip:Trip){return raw('/functions/v1/gatekampen-verify',{season_id:season,walk:trip},await token());}
