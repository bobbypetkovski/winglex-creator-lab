-- Run once in the SQL editor of your Supabase project.
-- This table is independent of the original Cloudflare D1 workspace.
-- payload is a JSON document. Older single-platform Poland workspaces stay valid;
-- the application upgrades them before validation. Do not add a required column
-- that existing rows cannot fill.
create table if not exists public.winglex_workspaces (
  owner_id uuid not null references auth.users(id) on delete cascade,
  brand_id text not null check (brand_id = 'winglex'),
  payload jsonb not null,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, brand_id)
);

alter table public.winglex_workspaces enable row level security;
revoke all on table public.winglex_workspaces from anon;
revoke all on table public.winglex_workspaces from authenticated;
grant select, insert, update on table public.winglex_workspaces to authenticated;

drop policy if exists "Read own Winglex workspace" on public.winglex_workspaces;
create policy "Read own Winglex workspace" on public.winglex_workspaces
  for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "Create own Winglex workspace" on public.winglex_workspaces;
create policy "Create own Winglex workspace" on public.winglex_workspaces
  for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "Update own Winglex workspace" on public.winglex_workspaces;
create policy "Update own Winglex workspace" on public.winglex_workspaces
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
