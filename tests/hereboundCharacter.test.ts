import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, createRegistry, decodeAccount, DEFAULT_APPEARANCE, levelForXp, levelProgress, newAccount, prepareCharacter, Session, xpForLevel } from '../packages/herebound-sdk';
import type { Account, Action, Persistence } from '../packages/herebound-sdk';
import { registry } from '../apps/herebound/registry';
import { ultimaX } from '../games/ultima-x';
let sequence=0;
const now=1_800_000_000_000;
const fix=(id='maren',source:'gps'|'simulation'='simulation')=>({...ultimaX.encounters.find(e=>e.id===id)!.position,source,accuracy:0,timestamp:now});
const command=(a:Account,action:Action)=>({id:`character-${++sequence}`,expectedRevision:a.revision,action});
const act=(a:Account,action:Action)=>applyCommand(a,registry,command(a,action),now).account;
const start=()=>act(newAccount('Eira'),{type:'enter',gameId:ultimaX.id,fix:fix()});
function visit(a:Account,id:string) { a=act(a,{type:'travel',position:fix(id)});return act(a,{type:'discover',encounterId:id}); }
function levelTwo(){let a=start();for(const id of ['maren','rowan','stash'])a=visit(a,id);return a;}
function finish(){let a=visit(start(),'maren');a=act(a,{type:'trade',encounterId:'maren',itemId:'ultima-x:garlic',direction:'buy',quantity:1});a=visit(a,'rowan');a=act(a,{type:'interact',encounterId:'rowan'});a=visit(a,'lantern');a=act(a,{type:'talk',encounterId:'lantern',topicId:'mark'});return act(a,{type:'interact',encounterId:'lantern'});}

test('levels use cumulative platform XP, exact thresholds and a bounded top level',()=>{
 assert.equal(levelForXp(0),1);assert.equal(levelForXp(29),1);assert.equal(levelForXp(30),2);assert.equal(levelForXp(89),2);assert.equal(levelForXp(90),3);
 for(let level=1;level<=50;level++){assert.equal(levelForXp(xpForLevel(level)),level);if(level>1)assert.equal(levelForXp(xpForLevel(level)-1),level-1);}
 assert.deepEqual(levelProgress(40),{level:2,start:30,end:90,earned:10,needed:50,fraction:1/6});assert.equal(levelProgress(1_000_000).end,null);
});

test('discoveries level up and unlock a skin once; replay and field mode cannot farm XP',()=>{
 let a=levelTwo();assert.equal(a.character.xp,30);assert.equal(a.character.level,2);assert.ok(a.character.ownedSkins['herebound:fernweave']);
 a=visit(a,'maren');assert.equal(a.character.xp,30);
 a=applyCommand(a,registry,command(a,{type:'enter',gameId:ultimaX.id,mode:'field',fix:fix()}),now,fix('maren','gps')).account;
 a=applyCommand(a,registry,command(a,{type:'discover',encounterId:'maren'}),now,fix('maren','gps'),'maren').account;
 assert.equal(a.character.xp,30);
});

test('loot can be worn, persists on reload and is not a second inventory or weight copy',()=>{
 let a=visit(start(),'stash');a=act(a,{type:'interact',encounterId:'stash'});const weight=a.items['ultima-x:satchel'].weightGrams;
 a=act(a,{type:'equip',slot:'back',itemId:'ultima-x:satchel'});assert.equal(a.character.inventory['ultima-x:satchel'],1);assert.equal(a.character.equipment.back,'ultima-x:satchel');assert.equal(a.items['ultima-x:satchel'].weightGrams,weight);
 assert.deepEqual(decodeAccount(JSON.stringify(a)),a);
 assert.throws(()=>act(a,{type:'equip',slot:'hand',itemId:'ultima-x:satchel'}),/eie/);
 assert.throws(()=>act(a,{type:'equip',slot:'hand',itemId:'ultima-x:staff'}),/eie/);
 a=act(a,{type:'equip',slot:'back',itemId:null});assert.equal(a.character.equipment.back,undefined);assert.equal(a.character.inventory['ultima-x:satchel'],1);
});

test('selling the last equipped item clears its slot; selling a spare keeps the equipped copy',()=>{
 let a=visit(start(),'maren');a=act(a,{type:'trade',encounterId:'maren',itemId:'ultima-x:staff',quantity:2,direction:'buy'});a=act(a,{type:'equip',slot:'hand',itemId:'ultima-x:staff'});
 a=act(a,{type:'trade',encounterId:'maren',itemId:'ultima-x:staff',quantity:1,direction:'sell'});assert.equal(a.character.equipment.hand,'ultima-x:staff');
 a=act(a,{type:'trade',encounterId:'maren',itemId:'ultima-x:staff',quantity:1,direction:'sell'});assert.equal(a.character.equipment.hand,undefined);assert.doesNotThrow(()=>decodeAccount(JSON.stringify(a)));
});

test('skins require ownership and level; purchase is atomic and never double charges',()=>{
 let a=start();assert.throws(()=>act(a,{type:'buy-skin',skinId:'herebound:stormbound'}),/nivå/);assert.throws(()=>act(a,{type:'wear-skin',skinId:'ultima-x:keeper'}),/låst/);
 a=levelTwo();const cmd=command(a,{type:'buy-skin',skinId:'herebound:stormbound'}),once=applyCommand(a,registry,cmd,now);
 assert.equal(once.account.character.credits,12);assert.ok(once.account.character.ownedSkins['herebound:stormbound']);assert.equal(applyCommand(once.account,registry,cmd,now).account,once.account);
 assert.throws(()=>act(once.account,{type:'buy-skin',skinId:'herebound:stormbound'}),/allerede/);
 a=act(once.account,{type:'wear-skin',skinId:'herebound:stormbound'});assert.equal(a.character.skin,'herebound:stormbound');assert.equal(a.character.credits,12);
 assert.throws(()=>act(a,{type:'buy-skin',skinId:'ultima-x:keeper'}),/salgs/);
 const poor=levelTwo();poor.character.credits=0;assert.throws(()=>act(poor,{type:'buy-skin',skinId:'herebound:stormbound'}),/mynt/);assert.equal(poor.character.credits,0);
});

test('adventure awards wearable charm and exclusive skin; both follow the character with game unloaded',()=>{
 let a=finish();assert.ok(a.character.ownedSkins['ultima-x:keeper']);assert.equal(a.character.inventory['ultima-x:keeper-light'],1);
 a=act(a,{type:'wear-skin',skinId:'ultima-x:keeper'});a=act(a,{type:'equip',slot:'charm',itemId:'ultima-x:keeper-light'});
 const xp=a.character.xp;a=act(a,{type:'interact',encounterId:'lantern'});assert.equal(a.character.xp,xp);assert.equal(a.character.inventory['ultima-x:keeper-light'],1);
 a=act(a,{type:'leave'});const empty=createRegistry([]);let b=decodeAccount(JSON.stringify(a));prepareCharacter(b,empty);
 b=applyCommand(b,empty,command(b,{type:'appearance',appearance:{...DEFAULT_APPEARANCE,body:'man'}}),now).account;
 assert.equal(b.character.skin,'ultima-x:keeper');assert.equal(b.character.equipment.charm,'ultima-x:keeper-light');assert.equal(b.character.appearance.body,'man');assert.equal(b.character.xp,xp);
});

test('0.2 save upgrade preserves XP, items and coin; grants earned rewards without replaying adventure',()=>{
 const legacy:any=finish();legacy.character.xp=125;legacy.character.level=1;
 for(const key of ['appearance','equipment','ownedSkins','skin','xpClaims'])delete legacy.character[key];delete legacy.skins;
 delete legacy.items['ultima-x:staff'].wearable;
 const a=decodeAccount(JSON.stringify(legacy));prepareCharacter(a,registry);
 assert.equal(a.character.xp,125);assert.equal(a.character.level,3);assert.equal(a.character.credits,18);assert.ok(a.character.ownedSkins['herebound:fernweave']);assert.ok(a.character.ownedSkins['ultima-x:keeper']);assert.equal(a.items['ultima-x:staff'].wearable?.slot,'hand');
 const b=visit(a,'maren');assert.equal(b.character.xp,125);assert.deepEqual(decodeAccount(JSON.stringify(b)),b);
});

test('appearance validates choices and failed persistence does not show a purchase as completed',async()=>{
 let a=levelTwo();assert.throws(()=>act(a,{type:'appearance',appearance:{...DEFAULT_APPEARANCE,body:'invalid'} as any}),/utseende/);
 let raw=JSON.stringify(a), fail=true;
 const store:Persistence={read:async()=>raw,write:async value=>{if(fail)throw Error('Disk full');raw=value;}};
 const session=new Session(registry,store);a=(await session.load())!;const cmd=command(a,{type:'buy-skin',skinId:'herebound:stormbound'});
 await assert.rejects(session.dispatch(cmd),/Disk full/);assert.equal(JSON.parse(raw).character.credits,20);assert.equal(JSON.parse(raw).character.ownedSkins['herebound:stormbound'],undefined);
 fail=false;const result=await session.dispatch(cmd);assert.equal(result.account.character.credits,12);
});
