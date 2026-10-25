// Run with NODE_PATH pointing at an installed @electric-sql/pglite package.
// Real PostgreSQL in WASM; Supabase JWT context/auth.users are test fixtures.
const {PGlite}=require('@electric-sql/pglite');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth to authenticated,service_role;
 grant execute on function auth.uid() to authenticated,service_role;`);
 for(const file of ['apps/gatekampen/schema.sql','apps/gatekampen/backend/002_competitions.sql'])await db.exec(fs.readFileSync(path.join(root,file),'utf8'));
 const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
 for(const id of ids)await db.query('insert into auth.users values($1)',[id]);
 const catalogue=(await db.query(`insert into public.catalogues(name,source_version,streets,published_at) values('Nordnes','test','[{"id":"street/one","kind":"street"}]',now()) returning id`)).rows[0].id;
 const login=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[id,role]);await db.exec('set role '+role);};
 const scalar=async(sql,params=[])=>Object.values((await db.query(sql,params)).rows[0])[0];
 for(let i=0;i<3;i++){await login(ids[i]);await db.query('select public.save_profile($1)',['Player '+i]);}
 await login(ids[0]);
 const group=await scalar('select public.create_group($1,$2)',['Venner',catalogue]);
 const season=await scalar('select id from public.seasons where group_id=$1',[group]);
 const invite=await scalar('select public.create_invite($1)',[group]);
 assert.equal(invite.length,32);
 await login(ids[2]);assert.equal((await db.query('select * from public.groups')).rows.length,0);
 await assert.rejects(()=>db.query('select public.group_board($1)',[group]));
 await assert.rejects(()=>db.query('select public.create_invite($1)',[group]));
 await assert.rejects(()=>db.query('insert into public.memberships(group_id,player_id) values($1,$2)',[group,ids[2]]));
 await assert.rejects(()=>db.query(`insert into public.verified_completions values($1,$2,'street/one',gen_random_uuid(),now())`,[season,ids[2]]));
 assert.equal(await scalar('select public.join_group($1)',['WRONG']),null);
 assert.equal(await scalar('select public.join_group($1)',[invite]),null); // invalid attempt rate limit persisted
 await login(ids[1]);assert.equal(await scalar('select public.join_group($1)',[invite]),group);
 let board=await scalar('select public.group_board($1)',[group]);assert.equal(board.players.length,2);assert.equal(board.team,0);
 await assert.rejects(()=>db.query('select public.accept_evidence($1,$2,$3,$4,$5)',[season,ids[1],'walk','hash','[]']));
 await login(ids[0],'service_role');
 for(let i=0;i<6;i++)assert.equal(await scalar('select public.claim_verification($1)',[ids[0]]),true);
 assert.equal(await scalar('select public.claim_verification($1)',[ids[0]]),false);
 const stamp=await scalar('select now()');
 const completions=JSON.stringify([{street_id:'street/one',completed_at:stamp}]);
 assert.equal(await scalar('select public.accept_evidence($1,$2,$3,$4,$5)',[season,ids[0],'walk','hash',completions]),1);
 assert.equal(await scalar('select public.accept_evidence($1,$2,$3,$4,$5)',[season,ids[0],'walk','hash',completions]),0);
 await assert.rejects(()=>db.query('select public.accept_evidence($1,$2,$3,$4,$5)',[season,ids[0],'walk','different',completions]));
 await assert.rejects(()=>db.query('select public.accept_evidence($1,$2,$3,$4,$5)',[season,ids[2],'walk','hash',completions]));
 await assert.rejects(()=>db.query('select public.accept_evidence($1,$2,$3,$4,$5)',[season,ids[1],'outside','hash',JSON.stringify([{street_id:'not-in-catalogue',completed_at:stamp}])]));
 await assert.rejects(()=>db.query('select public.accept_evidence($1,$2,$3,$4,$5)',[season,ids[1],'old','hash',JSON.stringify([{street_id:'street/one',completed_at:'2020-01-01'}])]));
 assert.equal(await scalar('select public.accept_evidence($1,$2,$3,$4,$5)',[season,ids[1],'second','hash',completions]),1);
 await login(ids[0]);board=await scalar('select public.group_board($1)',[group]);assert.equal(board.team,1);assert.deepEqual(board.players.map(p=>Number(p.streets)),[1,1]);
 await db.exec('reset role');
 await assert.rejects(()=>db.query("update public.catalogues set streets='[]' where id=$1",[catalogue]));
 await assert.rejects(()=>db.query('delete from public.catalogues where id=$1',[catalogue]));
 assert.equal(Number(await scalar("select count(*) from private.evidence_receipts where walk_id in ('old','outside')")),0);
 await db.close();console.log('PASS: PostgreSQL migrations, private membership, invite rate limit, authorization, immutable catalogue, evidence rollback, replay, individual and team scores.');
})().catch(e=>{console.error(e);process.exit(1)});
