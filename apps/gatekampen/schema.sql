-- Supabase/PostgreSQL foundation. Run in a dedicated project, never Tråkk's DB.
-- Accounts use Supabase Auth; public clients never receive a service-role key.
-- gen_random_uuid() is built into PostgreSQL 13+. No extension required.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  created_at timestamptz not null default now()
);
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  name text not null check (char_length(name) between 2 and 60),
  created_at timestamptz not null default now()
);
create table public.memberships (
  group_id uuid not null references public.groups(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, player_id)
);
-- Only server-issued catalogue versions can define competition boundaries.
create table public.catalogues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_version text not null,
  streets jsonb not null check (jsonb_typeof(streets) = 'array'),
  published_at timestamptz
);
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  catalogue_id uuid not null references public.catalogues(id),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  unique (group_id, starts_at)
);
create table public.verified_completions (
  season_id uuid not null references public.seasons(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  street_id text not null,
  evidence_id uuid not null,
  completed_at timestamptz not null,
  primary key (season_id, player_id, street_id)
);
-- Kept private to the API service; clients never read all invitation hashes.
create table private.group_invites (
  token_hash text primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  expires_at timestamptz not null,
  max_uses integer not null check (max_uses between 1 and 100),
  used integer not null default 0 check (used >= 0)
);
create function private.is_group_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships where group_id = target and player_id = (select auth.uid()));
$$;
revoke all on function private.is_group_member(uuid) from public;
grant execute on function private.is_group_member(uuid) to authenticated;
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.memberships enable row level security;
alter table public.catalogues enable row level security;
alter table public.seasons enable row level security;
alter table public.verified_completions enable row level security;
alter table private.group_invites enable row level security;
create policy profiles_self_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy groups_member_read on public.groups for select to authenticated using (private.is_group_member(id));
create policy memberships_group_read on public.memberships for select to authenticated using (private.is_group_member(group_id));
create policy catalogue_published_read on public.catalogues for select to authenticated using (published_at is not null);
create policy seasons_member_read on public.seasons for select to authenticated using (private.is_group_member(group_id));
create policy completions_member_read on public.verified_completions for select to authenticated using (
  exists (select 1 from public.seasons s where s.id = season_id and private.is_group_member(s.group_id))
);
-- No client policies for group creation, invites, membership changes, season
-- writes or verified completions. Authenticated server endpoints must authorize
-- the caller and perform each operation in one database transaction.
revoke all on private.group_invites from anon, authenticated;
revoke insert, update, delete on public.groups, public.memberships, public.catalogues, public.seasons, public.verified_completions from anon, authenticated;
