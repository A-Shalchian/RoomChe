insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', false)
on conflict (id) do nothing;

create policy "item_images_select_own" on storage.objects
  for select using (
    bucket_id = 'item-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "item_images_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'item-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "item_images_update_own" on storage.objects
  for update using (
    bucket_id = 'item-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'item-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "item_images_delete_own" on storage.objects
  for delete using (
    bucket_id = 'item-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
