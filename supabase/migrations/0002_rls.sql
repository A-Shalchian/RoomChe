alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.items enable row level security;
alter table public.tags enable row level security;
alter table public.item_tags enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "profiles_delete_own" on public.profiles
  for delete using ((select auth.uid()) = user_id);

create policy "locations_select_own" on public.locations
  for select using ((select auth.uid()) = user_id);
create policy "locations_insert_own" on public.locations
  for insert with check ((select auth.uid()) = user_id);
create policy "locations_update_own" on public.locations
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "locations_delete_own" on public.locations
  for delete using ((select auth.uid()) = user_id);

create policy "items_select_own" on public.items
  for select using ((select auth.uid()) = user_id);
create policy "items_insert_own" on public.items
  for insert with check ((select auth.uid()) = user_id);
create policy "items_update_own" on public.items
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "items_delete_own" on public.items
  for delete using ((select auth.uid()) = user_id);

create policy "tags_select_own" on public.tags
  for select using ((select auth.uid()) = user_id);
create policy "tags_insert_own" on public.tags
  for insert with check ((select auth.uid()) = user_id);
create policy "tags_update_own" on public.tags
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "tags_delete_own" on public.tags
  for delete using ((select auth.uid()) = user_id);

create policy "item_tags_select_via_item" on public.item_tags
  for select using (
    exists (
      select 1 from public.items i
      where i.id = item_tags.item_id and i.user_id = (select auth.uid())
    )
  );
create policy "item_tags_insert_via_item" on public.item_tags
  for insert with check (
    exists (
      select 1 from public.items i
      where i.id = item_tags.item_id and i.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.tags t
      where t.id = item_tags.tag_id and t.user_id = (select auth.uid())
    )
  );
create policy "item_tags_delete_via_item" on public.item_tags
  for delete using (
    exists (
      select 1 from public.items i
      where i.id = item_tags.item_id and i.user_id = (select auth.uid())
    )
  );
