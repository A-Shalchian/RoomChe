create table public.dupe_dismissals (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id_a uuid not null references public.items(id) on delete cascade,
  item_id_b uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id_a, item_id_b),
  check (item_id_a < item_id_b)
);

create index dupe_dismissals_user_id_idx on public.dupe_dismissals (user_id);

alter table public.dupe_dismissals enable row level security;

create policy "dupe_dismissals_select_own" on public.dupe_dismissals
  for select using ((select auth.uid()) = user_id);
create policy "dupe_dismissals_insert_own" on public.dupe_dismissals
  for insert with check ((select auth.uid()) = user_id);
create policy "dupe_dismissals_delete_own" on public.dupe_dismissals
  for delete using ((select auth.uid()) = user_id);
