alter table public.items
  add column if not exists views integer not null default 0;

create or replace function public.increment_item_views(item uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.items
    set views = views + 1
    where id = item and user_id = auth.uid();
end;
$$;

revoke execute on function public.increment_item_views(uuid) from public, anon;
grant execute on function public.increment_item_views(uuid) to authenticated;
