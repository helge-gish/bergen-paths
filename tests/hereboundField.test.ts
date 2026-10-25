import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, createRegistry, newAccount, decodeAccount, progressFor, isRevealed, fogFeature, metersBetween, Session, canEnter, canMeet, entryStatus } from '../packages/herebound-sdk';
import type { Account, Action, GamePack, PositionFix } from '../packages/herebound-sdk';
import { ultimaX } from '../games/ultima-x';
import { sharedItems } from '../content/shared-items';
const registry = createRegistry([ultimaX], sharedItems);
const at = (id: string) => ultimaX.encounters.find(e=>e.id===id)!;
let clock=1_800_000_000_000, id=0;
const gps=(position=ultimaX.start.position, accuracy=5):PositionFix=>({...position,accuracy,timestamp:clock,source:'gps'});
const cmd=(a:Account,action:Action)=>({id:`field-${++id}`,expectedRevision:a.revision,action});
const perform=(a:Account,action:Action,position=gps(),ar:string|null=null)=>applyCommand(a,registry,cmd(a,action),clock,position,ar).account;
function enter(a=newAccount('Frida')) {return perform(a,{type:'enter',gameId:ultimaX.id,mode:'field',fix:gps()});}
function move(a:Account,point=ultimaX.start.position){clock+=15_000;return perform(a,{type:'observe'},gps(point));}

test('field entry trusts host GPS, not a fix supplied by a game command',()=>{
  const a=newAccount('F');const action:Action={type:'enter',gameId:ultimaX.id,mode:'field',fix:gps()};
  assert.throws(()=>applyCommand(a,registry,cmd(a,action),clock),/posisjonskilde/);
  assert.throws(()=>applyCommand(a,registry,cmd(a,action),clock,gps({latitude:59.91,longitude:10.75})),/Meyermarken/);
  assert.throws(()=>perform(a,action,{...gps(),source:'simulation'}));
  assert.equal(enter(a).activeMode,'field');
});

test('berries become visible before collection range; AR and physical proximity are both required',()=>{
  let a=enter();const berry=at('rowan');
  assert.ok(isRevealed(ultimaX,progressFor(a)!,berry.position));
  const outside=gps({...berry.position,latitude:berry.position.latitude+.0004});
  assert.ok(metersBetween(outside,berry.position)+5>berry.radiusMeters);
  assert.throws(()=>perform(a,{type:'discover',encounterId:'rowan'},outside,'rowan'),/møtestedet/);
  a=move(a,berry.position);
  assert.throws(()=>perform(a,{type:'discover',encounterId:'rowan'},gps(berry.position)),/AR/);
  a=perform(a,{type:'discover',encounterId:'rowan'},gps(berry.position),'rowan');
  assert.throws(()=>perform(a,{type:'interact',encounterId:'rowan'},gps(berry.position),'maren'),/AR/);
  a=perform(a,{type:'interact',encounterId:'rowan'},gps(berry.position),'rowan');
  a=perform(a,{type:'interact',encounterId:'rowan'},gps(berry.position),'rowan');
  assert.equal(a.character.inventory['herebound:rowanberry'],2);
  assert.equal(a.inventoryEvents.length,1);
});

test('field chapter supports finding lantern first, gathering, trade and lighting it exactly once',()=>{
  let a=enter();
  a=move(a,at('lantern').position);
  a=perform(a,{type:'discover',encounterId:'lantern'},gps(at('lantern').position),'lantern');
  a=perform(a,{type:'talk',encounterId:'lantern',topicId:'mark'},gps(at('lantern').position),'lantern');
  const before=JSON.stringify(a);
  assert.throws(()=>perform(a,{type:'interact',encounterId:'lantern'},gps(at('lantern').position),'lantern'),/trenger/);
  assert.equal(JSON.stringify(a),before);
  a=move(a,at('rowan').position);
  a=perform(a,{type:'discover',encounterId:'rowan'},gps(at('rowan').position),'rowan');
  a=perform(a,{type:'interact',encounterId:'rowan'},gps(at('rowan').position),'rowan');
  a=move(a,at('maren').position);
  a=perform(a,{type:'discover',encounterId:'maren'},gps(),'maren');
  a=perform(a,{type:'trade',encounterId:'maren',itemId:'ultima-x:garlic',quantity:1,direction:'buy'},gps(),'maren');
  a=move(a,at('lantern').position);
  a=perform(a,{type:'interact',encounterId:'lantern'},gps(at('lantern').position),'lantern');
  const xp=a.character.xp;
  a=perform(a,{type:'interact',encounterId:'lantern'},gps(at('lantern').position),'lantern');
  assert.equal(a.character.inventory['ultima-x:keeper-light'],1);
  assert.equal(a.character.inventory['ultima-x:garlic'],0);
  assert.equal(a.character.inventory['herebound:rowanberry'],1);
  assert.equal(a.character.credits,18);
  assert.equal(a.character.xp,xp);
  assert.ok(progressFor(a)!.journal.some(j=>j.id==='first-light'));
  const persisted=decodeAccount(JSON.stringify(a));
  assert.ok(isRevealed(ultimaX,progressFor(persisted)!,at('rowan').position));
  assert.deepEqual(progressFor(persisted)?.revealed,progressFor(a)?.revealed);
});

test('simulator and field exploration stay separate; invalid GPS and teleport commands cannot reveal terrain',()=>{
  let a=newAccount('F');
  a=perform(a,{type:'enter',gameId:ultimaX.id,fix:{...gps(),source:'simulation'}});
  a=perform(a,{type:'travel',position:at('lantern').position});
  a=perform(a,{type:'discover',encounterId:'lantern'});
  a=enter(a);
  assert.equal(progressFor(a)!.discovered.length,0);
  assert.ok(a.games[ultimaX.id].discovered.includes('lantern'));
  const before=JSON.stringify(progressFor(a)?.revealed);
  for(const bad of [{...gps(),timestamp:clock-31000},gps(at('lantern').position,60),{...gps(),source:'simulation' as const}]) assert.throws(()=>perform(a,{type:'observe'},bad));
  assert.throws(()=>perform(a,{type:'travel',position:at('lantern').position}));
  clock+=1000;
  assert.throws(()=>perform(a,{type:'observe'},gps({latitude:gps().latitude+.001,longitude:gps().longitude})),/hoppet/);
  assert.equal(JSON.stringify(progressFor(a)?.revealed),before);
});

test('restored field session has no implicit GPS or AR grant',async()=>{
  const saved=enter();let raw=JSON.stringify(saved);
  const session=new Session(registry,{async read(){return raw;},async write(value){raw=value;}});
  const loaded=(await session.load())!;
  session.openArEncounter('maren');
  await assert.rejects(session.dispatch(cmd(loaded,{type:'discover',encounterId:'maren'})),/GPS/);
  session.setPosition({...gps(),timestamp:Date.now()});session.closeArEncounter();
  await assert.rejects(session.dispatch(cmd(loaded,{type:'discover',encounterId:'maren'})),/AR/);
  session.openArEncounter('maren');
  assert.ok((await session.dispatch(cmd(loaded,{type:'discover',encounterId:'maren'}))).account.fieldGames![ultimaX.id].discovered.includes('maren'));
});

test('global currency migrates old gold unchanged; local denominations never multiply the portable balance',()=>{
  const legacy:any=newAccount('Old');legacy.character.gold=37;delete legacy.character.credits;
  const a=decodeAccount(JSON.stringify(legacy));assert.equal(a.character.credits,37);assert.ok(!('gold' in a.character));
  const shell:GamePack={...ultimaX,currency:{name:'skjell',unitsPerCredit:10}};
  const r=createRegistry([shell],sharedItems);
  let state=applyCommand(a,r,cmd(a,{type:'enter',gameId:shell.id,fix:{...gps(),source:'simulation'}}),clock).account;
  state=applyCommand(state,r,cmd(state,{type:'discover',encounterId:'maren'}),clock).account;
  const result=applyCommand(state,r,cmd(state,{type:'trade',encounterId:'maren',itemId:'ultima-x:garlic',quantity:1,direction:'buy'}),clock);
  assert.equal(result.account.character.credits,35);assert.match(result.message,/20 skjell/);
  assert.throws(()=>createRegistry([{...shell,currency:{name:'x',unitsPerCredit:1.5}}],sharedItems));
});

test('fog geometry has valid closed disjoint revealed-cell holes',()=>{
  const a=enter(),rings=fogFeature(ultimaX,progressFor(a)!.revealed).geometry.coordinates;
  assert.ok(rings.length>1);
  for(const ring of rings){assert.equal(ring.length,5);assert.deepEqual(ring[0],ring[4]);assert.ok(ring.flat().every(Number.isFinite));}
});


test('field start and meeting zones remain usable with ordinary GPS error; stale and distant fixes fail',()=>{
 const near=gps({...ultimaX.start.position,latitude:ultimaX.start.position.latitude+.0006},25);
 assert.ok(canEnter(ultimaX,near,clock,false));
 assert.equal(entryStatus(ultimaX,near,clock,false).ready,true);
 assert.ok(enter(newAccount('Zone')));
 assert.doesNotThrow(()=>perform(newAccount('Zone'),{type:'enter',gameId:ultimaX.id,mode:'field',fix:near},near));
 const far=gps({...ultimaX.start.position,latitude:ultimaX.start.position.latitude+.0012},5);
 assert.equal(canEnter(ultimaX,far,clock,false),false);assert.match(entryStatus(ultimaX,far,clock,false).text,/igjen til sonen/);
 assert.equal(entryStatus(ultimaX,{...near,accuracy:100},clock,false).ready,false);
 assert.equal(entryStatus(ultimaX,{...near,timestamp:clock-31_000},clock,false).ready,false);
 const e=at('rowan'),atBerry=gps({...e.position,latitude:e.position.latitude+.0001},20);
 assert.ok(canMeet(e,atBerry,clock));assert.equal(canMeet(e,{...atBerry,accuracy:50},clock),false);
});
