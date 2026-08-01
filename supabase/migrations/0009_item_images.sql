create table public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  angle text not null default 'front'
    check (angle in ('front', 'back', 'left', 'right', 'top', 'detail')),
  image_url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index item_images_item_id_idx on public.item_images (item_id);

alter table public.item_images enable row level security;

create policy "item_images_select_own" on public.item_images
  for select using ((select auth.uid()) = user_id);
create policy "item_images_insert_own" on public.item_images
  for insert with check ((select auth.uid()) = user_id);
create policy "item_images_update_own" on public.item_images
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "item_images_delete_own" on public.item_images
  for delete using ((select auth.uid()) = user_id);
