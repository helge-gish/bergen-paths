-- Apply after schema.sql in a dedicated Supabase project.
-- Every mutation checks auth.uid(); table writes remain unavailable to clients.
create table private.evidence_receipts (
  season_id uuid not null references public.seasons(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  walk_id text not null,
  digest text not null,
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  primary key(season_id,player_id,walk_id)
);
alter table private.evidence_receipts enable row level security;
revoke all on private.evidence_receipts from anon, authenticated;
grant select on private.evidence_receipts to service_role;
create table private.join_attempts(player_id uuid primary key references public.profiles(id), attempted_at timestamptz not null);
alter table private.join_attempts enable row level security;
revoke all on private.join_attempts from anon, authenticated;

create function private.save_profile(p_name text) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or char_length(trim(p_name)) not between 2 and 40 then raise exception 'Velg et visningsnavn på 2–40 tegn.'; end if;
  insert into public.profiles(id,display_name) values(auth.uid(),trim(p_name)) on conflict(id) do update set display_name=excluded.display_name;
end; $$;

create function private.create_group(p_name text,p_catalogue uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare g uuid; c public.catalogues; begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid()) then raise exception 'Lagre visningsnavnet først.'; end if;
  if char_length(trim(p_name)) not between 2 and 60 then raise exception 'Gruppenavnet må ha 2–60 tegn.'; end if;
  -- Serialize per owner so concurrent requests cannot bypass the group cap.
  perform 1 from public.profiles where id=auth.uid() for update;
  if (select count(*) from public.groups where owner_id=auth.uid())>=10 then raise exception 'Du har allerede ti grupper.'; end if;
  select * into c from public.catalogues where id=p_catalogue and published_at is not null;
  if not found or jsonb_array_length(c.streets)=0 then raise exception 'Velg et publisert gateområde.'; end if;
  insert into public.groups(owner_id,name) values(auth.uid(),trim(p_name)) returning id into g;
  insert into public.memberships(group_id,player_id) values(g,auth.uid());
  insert into public.seasons(group_id,catalogue_id,name,starts_at,ends_at) values(g,c.id,c.name,now(),now()+interval '28 days');
  return g;
end; $$;

create function private.create_invite(p_group uuid) returns text language plpgsql security definer set search_path='' as $$
declare token text; begin
  perform 1 from public.groups where id=p_group and owner_id=auth.uid() for update;
  if not found then raise exception 'Bare gruppeeieren kan invitere.'; end if;
  token=upper(replace(gen_random_uuid()::text,'-',''));
  delete from private.group_invites where group_id=p_group;
  insert into private.group_invites(token_hash,group_id,expires_at,max_uses) values(encode(sha256(convert_to(token,'UTF8')),'hex'),p_group,now()+interval '7 days',30);
  return token;
end; $$;

create function private.join_group(p_code text) returns uuid language plpgsql security definer set search_path='' as $$
declare inv private.group_invites; previous timestamptz; begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid()) then raise exception 'Lagre visningsnavnet først.'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  select attempted_at into previous from private.join_attempts where player_id=auth.uid();
  if previous>now()-interval '5 seconds' then return null; end if;
  insert into private.join_attempts values(auth.uid(),now()) on conflict(player_id) do update set attempted_at=excluded.attempted_at;
  -- Invalid codes return null rather than raising, preserving the rate limit.
  select * into inv from private.group_invites where token_hash=encode(sha256(convert_to(upper(trim(p_code)),'UTF8')),'hex') for update;
  if not found or inv.expires_at<=now() or inv.used>=inv.max_uses then return null; end if;
  if exists(select 1 from public.memberships where group_id=inv.group_id and player_id=auth.uid()) then return inv.group_id; end if;
  insert into public.memberships(group_id,player_id) values(inv.group_id,auth.uid());
  update private.group_invites set used=used+1 where token_hash=inv.token_hash;
  return inv.group_id;
end; $$;

create function private.group_board(p_group uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.seasons; total integer; begin
  if not private.is_group_member(p_group) then raise exception 'Gruppen er privat.'; end if;
  select * into s from public.seasons where group_id=p_group order by starts_at desc limit 1;
  select jsonb_array_length(streets) into total from public.catalogues where id=s.catalogue_id;
  return jsonb_build_object('name',(select name from public.groups where id=p_group),'season_id',s.id,'season_name',s.name,'starts_at',s.starts_at,'ends_at',s.ends_at,'total',total,
    'team',(select count(distinct street_id) from public.verified_completions where season_id=s.id),
    'players',(select coalesce(jsonb_agg(row_to_json(r) order by r.streets desc,r.name),'[]') from (
      select p.id,p.display_name as name,count(v.street_id) as streets from public.memberships m join public.profiles p on p.id=m.player_id
      left join public.verified_completions v on v.player_id=m.player_id and v.season_id=s.id where m.group_id=p_group group by p.id,p.display_name) r));
end; $$;

create function private.accept_evidence(p_season uuid,p_player uuid,p_walk text,p_digest text,p_completions jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare s public.seasons; joined timestamptz; receipt private.evidence_receipts; entry jsonb; awarded integer=0; begin
  -- Only the Edge verifier's service role can execute this function.
  if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'Servertilgang kreves.'; end if;
  select * into s from public.seasons where id=p_season for update;
  select joined_at into joined from public.memberships where group_id=s.group_id and player_id=p_player;
  if s.id is null or joined is null or now()>s.ends_at+interval '7 days' then raise exception 'Sesongen kan ikke motta denne turen.'; end if;
  select * into receipt from private.evidence_receipts where season_id=p_season and player_id=p_player and walk_id=p_walk;
  if found then
    if receipt.digest<>p_digest then raise exception 'Turen er allerede sendt med annet innhold.'; end if;
    return 0;
  end if;
  if jsonb_typeof(p_completions)<>'array' or jsonb_array_length(p_completions)>5000 then raise exception 'Ugyldig resultat.'; end if;
  insert into private.evidence_receipts(season_id,player_id,walk_id,digest) values(p_season,p_player,p_walk,p_digest) returning * into receipt;
  for entry in select * from jsonb_array_elements(p_completions) loop
    if (entry->>'completed_at')::timestamptz<greatest(s.starts_at,joined) or (entry->>'completed_at')::timestamptz>=s.ends_at or (entry->>'completed_at')::timestamptz>now()+interval '10 seconds'
      or not exists(select 1 from public.catalogues c,jsonb_array_elements(c.streets) street where c.id=s.catalogue_id and street->>'id'=entry->>'street_id') then raise exception 'Resultatet er utenfor sesongen.'; end if;
    insert into public.verified_completions(season_id,player_id,street_id,evidence_id,completed_at) values(s.id,p_player,entry->>'street_id',receipt.id,(entry->>'completed_at')::timestamptz)
      on conflict(season_id,player_id,street_id) do nothing;
    if found then awarded=awarded+1; end if;
  end loop;
  return awarded;
end; $$;

create function private.freeze_catalogue() returns trigger language plpgsql set search_path='' as $$
begin if old.published_at is not null then raise exception 'Publiserte gateområder er fryst. Lag en ny versjon.'; end if; return new; end; $$;
create trigger catalogue_immutable before update or delete on public.catalogues for each row execute function private.freeze_catalogue();
revoke all on function private.save_profile(text),private.create_group(text,uuid),private.create_invite(uuid),private.join_group(text),private.group_board(uuid),private.accept_evidence(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function private.save_profile(text),private.create_group(text,uuid),private.create_invite(uuid),private.join_group(text),private.group_board(uuid) to authenticated;
grant execute on function private.accept_evidence(uuid,uuid,text,text,jsonb) to service_role;
grant select on public.profiles,public.groups,public.memberships,public.catalogues,public.seasons,public.verified_completions to authenticated;

-- Public API wrappers run as the caller; privileged implementations stay in
-- a non-exposed schema and enforce identity/membership before any write.
create function public.save_profile(p_name text) returns void language sql security invoker set search_path='' as $$ select private.save_profile(p_name); $$;
create function public.create_group(p_name text,p_catalogue uuid) returns uuid language sql security invoker set search_path='' as $$ select private.create_group(p_name,p_catalogue); $$;
create function public.create_invite(p_group uuid) returns text language sql security invoker set search_path='' as $$ select private.create_invite(p_group); $$;
create function public.join_group(p_code text) returns uuid language sql security invoker set search_path='' as $$ select private.join_group(p_code); $$;
create function public.group_board(p_group uuid) returns jsonb language sql stable security invoker set search_path='' as $$ select private.group_board(p_group); $$;
create function public.accept_evidence(p_season uuid,p_player uuid,p_walk text,p_digest text,p_completions jsonb) returns integer language sql security invoker set search_path='' as $$ select private.accept_evidence(p_season,p_player,p_walk,p_digest,p_completions); $$;
revoke all on function public.save_profile(text),public.create_group(text,uuid),public.create_invite(uuid),public.join_group(text),public.group_board(uuid),public.accept_evidence(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_profile(text),public.create_group(text,uuid),public.create_invite(uuid),public.join_group(text),public.group_board(uuid) to authenticated;
grant execute on function public.accept_evidence(uuid,uuid,text,text,jsonb) to service_role;
revoke all on public.profiles,public.groups,public.memberships,public.catalogues,public.seasons,public.verified_completions from anon,authenticated;
grant select on public.profiles,public.groups,public.memberships,public.catalogues,public.seasons,public.verified_completions to authenticated;

create index groups_owner_idx on public.groups(owner_id);
create index memberships_player_idx on public.memberships(player_id,group_id);
create index seasons_catalogue_idx on public.seasons(catalogue_id);
create index completions_player_idx on public.verified_completions(player_id);
create index invites_group_idx on private.group_invites(group_id);
create index receipts_player_created_idx on private.evidence_receipts(player_id,created_at);

-- Reserve verification budget BEFORE geometry work, including failed requests.
create table private.verification_budget(player_id uuid primary key references public.profiles(id),window_start timestamptz not null,attempts integer not null);
alter table private.verification_budget enable row level security;
revoke all on private.verification_budget from public,anon,authenticated;
create function private.claim_verification(p_player uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare allowed boolean; begin
  if coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'role' is distinct from 'service_role' and current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then raise exception 'Servertilgang kreves.'; end if;
  insert into private.verification_budget as b values(p_player,now(),1)
  on conflict(player_id) do update set window_start=case when b.window_start<now()-interval '1 minute' then now() else b.window_start end,
  attempts=case when b.window_start<now()-interval '1 minute' then 1 else b.attempts+1 end
  returning attempts<=6 into allowed;
  return allowed;
end; $$;
create function public.claim_verification(p_player uuid) returns boolean language sql security invoker set search_path='' as $$ select private.claim_verification(p_player); $$;
revoke all on function private.claim_verification(uuid),public.claim_verification(uuid) from public,anon,authenticated;
grant execute on function private.claim_verification(uuid),public.claim_verification(uuid) to service_role;
