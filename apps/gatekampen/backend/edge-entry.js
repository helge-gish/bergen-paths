// Bundled by scripts/bundle-gatekampen-verifier.cjs for Supabase Edge Functions.
import {validateWalk,verifyWalk} from './verify.ts';
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info'};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers});
  if(request.method!=='POST')return json({error:'POST kreves.'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),anon=Deno.env.get('SUPABASE_ANON_KEY');
    const authorization=request.headers.get('authorization');
    if(!authorization?.startsWith('Bearer '))return json({error:'Logg inn først.'},401);
    const call=async(path,body,privileged=false)=>{
      const r=await fetch(url+path,{method:body===undefined?'GET':'POST',headers:{apikey:privileged?service:anon,Authorization:privileged?`Bearer ${service}`:authorization,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
      if(!r.ok)throw new Error('Tjenesten avviste forespørselen. Kontroller innlogging og gruppemedlemskap.');
      return r.json();
    };
    const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:anon,Authorization:authorization}});
    if(!auth.ok)return json({error:'Innloggingen har utløpt.'},401);
    const user=await auth.json();
    const reader=request.body?.getReader();if(!reader)return json({error:'Mangler tur.'},400);
    const chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>3000000){await reader.cancel();return json({error:'Turen er for stor.'},413);}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    const body=JSON.parse(new TextDecoder().decode(bytes));
    if(typeof body.season_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.season_id))return json({error:'Ugyldig sesong.'},400);
    const trip=validateWalk(body.walk,Date.now());
    const [s]=await call(`/rest/v1/seasons?id=eq.${body.season_id}&select=*`);
    if(!s)return json({error:'Sesongen finnes ikke i dine grupper.'},403);
    const [membership]=await call(`/rest/v1/memberships?group_id=eq.${s.group_id}&player_id=eq.${user.id}&select=joined_at`);
    if(!membership)return json({error:'Du er ikke medlem.'},403);
    if(!await call('/rest/v1/rpc/claim_verification',{p_player:user.id},true))return json({error:'Vent et minutt før du sender flere turer.'},429);
    const [catalogue]=await call(`/rest/v1/catalogues?id=eq.${s.catalogue_id}&select=streets`);
    if(!catalogue?.streets?.length)return json({error:'Gateområdet mangler.'},400);
    const completions=await verifyWalk(trip,catalogue.streets,{startsAt:Date.parse(s.starts_at),endsAt:Date.parse(s.ends_at),joinedAt:Date.parse(membership.joined_at)});
    const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(trip))))].map(b=>b.toString(16).padStart(2,'0')).join('');
    const awarded=await call('/rest/v1/rpc/accept_evidence',{p_season:s.id,p_player:user.id,p_walk:trip.id,p_digest:digest,p_completions:completions},true);
    // Raw GPS points are processed in memory, never inserted into shared tables.
    return json({awarded});
  }catch(error){return json({error:error instanceof Error?error.message:'Kunne ikke kontrollere turen.'},400);}
});
