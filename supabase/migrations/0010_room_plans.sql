create table public.room_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'my room',
  wall_height numeric not null default 2.4
    check (wall_height > 1 and wall_height < 6),
  floor_colour text not null default '#b9a48a',
  points jsonb not null default '[]'::jsonb,
  walls jsonb not null default '[]'::jsonb,
  openings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index room_plans_user_id_idx on public.room_plans (user_id);

alter table public.room_plans enable row level security;

create policy "room_plans_select_own" on public.room_plans
  for select using ((select auth.uid()) = user_id);
create policy "room_plans_insert_own" on public.room_plans
  for insert with check ((select auth.uid()) = user_id);
create policy "room_plans_update_own" on public.room_plans
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "room_plans_delete_own" on public.room_plans
  for delete using ((select auth.uid()) = user_id);
