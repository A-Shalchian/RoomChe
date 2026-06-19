alter table public.profiles
  add column if not exists is_allowed boolean not null default false;

update public.profiles set is_allowed = true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_count integer;
begin
  select count(*) into existing_count from public.profiles;

  if existing_count > 0 then
    raise exception 'signups are closed';
  end if;

  insert into public.profiles (user_id, display_name, is_allowed)
  values (new.id, new.raw_user_meta_data ->> 'full_name', true);

  return new;
end;
$$;
