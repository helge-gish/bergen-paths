import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

test('Gatekampen Auth: OTP contract, refresh deduplication, expiry recovery and offline logout',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'gatekampen-auth-')),file=join(folder,'api.cjs');
 const originalFetch=globalThis.fetch;
 try{
  await build({stdin:{contents:`export * from './apps/gatekampen/api';export {memory} from 'expo-secure-store';`,resolveDir:process.cwd(),loader:'ts'},outfile:file,bundle:true,platform:'node',format:'cjs',plugins:[{name:'secure-store-adapter',setup(b){b.onResolve({filter:/^expo-secure-store$/},()=>({path:'secure',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`export const memory=new Map();export const getItemAsync=async k=>memory.get(k)??null;export const setItemAsync=async(k,v)=>{memory.set(k,v)};export const deleteItemAsync=async k=>{memory.delete(k)};`,loader:'js'}));}}]});
  const api=createRequire(join(process.cwd(),'package.json'))(file);
  const requests:{path:string;body:any;token:string|null}[]=[];
  let response:(path:string)=>Promise<Response>=async()=>Response.json({});
  globalThis.fetch=async(input,init)=>{const path=new URL(String(input)).pathname+new URL(String(input)).search;requests.push({path,body:init?.body?JSON.parse(String(init.body)):undefined,token:new Headers(init?.headers).get('Authorization')});return response(path);};
  await api.sendCode('  Helge@Example.com ');
  assert.deepEqual(requests.at(-1)?.body,{email:'helge@example.com',create_user:true});
  const auth={access_token:'access',refresh_token:'refresh',expires_in:3600,user:{id:'player-1',user_metadata:{large:'not stored'}},extra:'not stored'};
  response=async()=>Response.json(auth);
  await api.signIn(' Helge@Example.com ',' 123456 ');
  assert.deepEqual(requests.at(-1)?.body,{email:'helge@example.com',token:'123456',type:'email'});
  assert.deepEqual(Object.keys(await api.account()).sort(),['access_token','expires_at','refresh_token','user']);
  assert.deepEqual((await api.account()).user,{id:'player-1'});
  response=async()=>Response.json({});
  await assert.rejects(()=>api.signIn('helge@example.com','123456'),/kunne ikke fullføres/);
  assert.equal((await api.account()).access_token,'access');

  // Three parallel reads after expiry must consume one rotating refresh token.
  const expire=async()=>{api.memory.set('gatekampen-auth-v1',JSON.stringify({...await api.account(),expires_at:1}));};
  await expire();let refreshCount=0;
  response=async path=>{if(path.includes('grant_type=refresh_token')){refreshCount++;await new Promise(resolve=>setTimeout(resolve,10));return Response.json({...auth,access_token:'new-access',refresh_token:'new-refresh'});}return Response.json([]);};
  await Promise.all([api.groups(),api.availableCatalogues(),api.profile()]);
  assert.equal(refreshCount,1);
  assert.ok(requests.slice(-3).every(r=>r.token==='Bearer new-access'));
  assert.equal((await api.account()).refresh_token,'new-refresh');

  // A transient connection failure preserves the account; a rejected refresh
  // clears it so the screen can offer login instead of trapping the player.
  await expire();response=async()=>{throw new TypeError('offline');};
  await assert.rejects(()=>api.groups(),/offline/);assert.ok(await api.account());
  response=async()=>Response.json({message:'Invalid Refresh Token'},{status:400});
  await assert.rejects(()=>api.groups(),/Logg inn på nytt/);assert.equal(await api.account(),null);

  response=async()=>Response.json(auth);await api.signIn('helge@example.com','123456');
  response=async()=>new Response('<html>upstream failure</html>',{status:502});
  await assert.rejects(()=>api.groups(),/ikke som forventet/);
  response=async()=>Response.json({error_code:'email_address_not_authorized'},{status:403});
  await assert.rejects(()=>api.sendCode('friend@example.com'),/ikke åpnet for denne adressen/);
  response=async()=>{throw new TypeError('offline');};
  await assert.rejects(()=>api.signOut(),/offline/);assert.equal(await api.account(),null);

  // Logout waits for an existing refresh and cannot be undone by its result.
  response=async()=>Response.json(auth);await api.signIn('helge@example.com','123456');await expire();
  let started!:()=>void,release!:()=>void;
  const start=new Promise<void>(resolve=>{started=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});
  response=async path=>{if(path.includes('grant_type=refresh_token')){started();await gate;return Response.json(auth);}return Response.json([]);};
  const pending=api.groups();await start;const logout=api.signOut();release();await Promise.all([pending,logout]);
  assert.equal(await api.account(),null);
 }finally{globalThis.fetch=originalFetch;rmSync(folder,{recursive:true,force:true});}
});
