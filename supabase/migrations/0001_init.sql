create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index locations_user_id_idx on public.locations (user_id);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  image_url text,
  image_url_nobg text,
  location_id uuid references public.locations(id) on delete set null,
  container_id uuid references public.items(id) on delete set null,
  is_container boolean not null default false,
  why_kept text,
  would_discard text check (would_discard in ('never', 'maybe', 'soon')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_user_id_idx on public.items (user_id);
create index items_location_id_idx on public.items (location_id);
create index items_container_id_idx on public.items (container_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index tags_user_id_idx on public.tags (user_id);

create table public.item_tags (
  item_id uuid not null references public.items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (item_id, tag_id)
);

create index item_tags_tag_id_idx on public.item_tags (tag_id);
