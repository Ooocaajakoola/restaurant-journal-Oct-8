-- Food Tower: journal schema, row-level security and photo storage.
--
-- Identity: the app signs in anonymously (Supabase anonymous sign-ins), so every browser has a
-- real auth.uid(). Those users have the `authenticated` role. Each person only ever sees their own
-- entries, tags, dishes, photos and lists; the city/place catalogue is shared and read-only (except
-- that users may add new places). A list is also readable by anyone while share_enabled = true.
--
-- Ids are client-generated (uuid) and every table has created_at/updated_at so offline sync can be
-- added later.

-- ---------------------------------------------------------------- tables

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Traveller',
  home_airport text check (home_airport is null or home_airport ~ '^[A-Z]{3}$'),
  default_visibility text not null default 'private'
    check (default_visibility in ('private', 'friends', 'crew')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  country_code text not null,
  airport_codes text[] not null default '{}',
  lat double precision not null,
  lng double precision not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, country_code)
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  address text not null default '',
  lat double precision not null,
  lng double precision not null,
  cuisine text not null default 'Restaurant',
  price_level smallint check (price_level between 1 and 4),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index places_city_name_key on public.places (city_id, lower(name));
create index places_created_by_idx on public.places (created_by);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete restrict,
  visited_at timestamptz not null,
  rating smallint not null check (rating between 1 and 5),
  would_return boolean,
  note text not null default '',
  price numeric(12, 2) check (price is null or price >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  meal_type text not null check (meal_type in ('breakfast', 'brunch', 'lunch', 'dinner', 'snack', 'drinks')),
  status text not null default 'quick' check (status in ('quick', 'complete')),
  visibility text not null default 'private' check (visibility in ('private', 'friends', 'crew')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index entries_user_visited_idx on public.entries (user_id, visited_at desc);
create index entries_place_idx on public.entries (place_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (name ~ '^[^\s#]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.entry_tags (
  entry_id uuid not null references public.entries (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (entry_id, tag_id)
);
create index entry_tags_tag_idx on public.entry_tags (tag_id);

create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  note text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dishes_entry_idx on public.dishes (entry_id);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  url text not null,
  -- Path inside the entry-photos bucket, so the file can be deleted with the row.
  storage_path text,
  caption text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index photos_entry_idx on public.photos (entry_id);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Snapshot of the owner's display name, so a shared list can show "Shared by ..." without
  -- exposing anyone's profile row.
  owner_name text not null default '',
  title text not null,
  description text not null default '',
  city_id uuid references public.cities (id) on delete set null,
  visibility text not null default 'private' check (visibility in ('private', 'friends', 'crew')),
  share_enabled boolean not null default false,
  source_list_id uuid references public.lists (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lists_owner_idx on public.lists (owner_id, created_at desc);
create index lists_city_idx on public.lists (city_id);
create index lists_source_idx on public.lists (source_list_id);

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete restrict,
  entry_id uuid references public.entries (id) on delete set null,
  position integer not null default 0,
  note text not null default '',
  -- Rating copied from the entry when the list was made, so viewers never need access to the entry.
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index list_items_list_idx on public.list_items (list_id, position);
create index list_items_place_idx on public.list_items (place_id);
create index list_items_entry_idx on public.list_items (entry_id);

-- ---------------------------------------------------------------- privileges
-- Start from nothing for the anonymous (not-signed-in) role, then grant only what is needed.

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select on public.cities, public.places, public.lists, public.list_items to anon;

grant select on public.cities to authenticated;
grant select, insert on public.places to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on
  public.entries, public.tags, public.entry_tags, public.dishes, public.photos,
  public.lists, public.list_items
  to authenticated;

-- ---------------------------------------------------------------- row-level security

alter table public.profiles enable row level security;
alter table public.cities enable row level security;
alter table public.places enable row level security;
alter table public.entries enable row level security;
alter table public.tags enable row level security;
alter table public.entry_tags enable row level security;
alter table public.dishes enable row level security;
alter table public.photos enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;

-- profiles: your own row only
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- catalogue: everyone can read; signed-in users can add places they create
create policy cities_select_all on public.cities for select to anon, authenticated
  using (true);
create policy places_select_all on public.places for select to anon, authenticated
  using (true);
create policy places_insert_own on public.places for insert to authenticated
  with check (created_by = (select auth.uid()));

-- entries and their children: owner only
create policy entries_select_own on public.entries for select to authenticated
  using (user_id = (select auth.uid()));
create policy entries_insert_own on public.entries for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy entries_update_own on public.entries for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy entries_delete_own on public.entries for delete to authenticated
  using (user_id = (select auth.uid()));

create policy tags_select_own on public.tags for select to authenticated
  using (user_id = (select auth.uid()));
create policy tags_insert_own on public.tags for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy tags_update_own on public.tags for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tags_delete_own on public.tags for delete to authenticated
  using (user_id = (select auth.uid()));

create policy entry_tags_select_own on public.entry_tags for select to authenticated
  using (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = (select auth.uid())));
create policy entry_tags_insert_own on public.entry_tags for insert to authenticated
  with check (
    exists (select 1 from public.entries e where e.id = entry_id and e.user_id = (select auth.uid()))
    and exists (select 1 from public.tags t where t.id = tag_id and t.user_id = (select auth.uid()))
  );
create policy entry_tags_delete_own on public.entry_tags for delete to authenticated
  using (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = (select auth.uid())));

create policy dishes_select_own on public.dishes for select to authenticated
  using (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = (select auth.uid())));
create policy dishes_insert_own on public.dishes for insert to authenticated
  with check (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = (select auth.uid())));
create policy dishes_update_own on public.dishes for update to authenticated
  using (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = (select auth.uid())))
  with check (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = (select auth.uid())));
create policy dishes_delete_own on public.dishes for delete to authenticated
  using (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = (select auth.uid())));

create policy photos_select_own on public.photos for select to authenticated
  using (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = (select auth.uid())));
create policy photos_insert_own on public.photos for insert to authenticated
  with check (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = (select auth.uid())));
create policy photos_update_own on public.photos for update to authenticated
  using (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = (select auth.uid())))
  with check (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = (select auth.uid())));
create policy photos_delete_own on public.photos for delete to authenticated
  using (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = (select auth.uid())));

-- lists: owner has full control; anyone can read a list while it is shared
create policy lists_select_visible on public.lists for select to anon, authenticated
  using (share_enabled or owner_id = (select auth.uid()));
create policy lists_insert_own on public.lists for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy lists_update_own on public.lists for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy lists_delete_own on public.lists for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy list_items_select_visible on public.list_items for select to anon, authenticated
  using (exists (
    select 1 from public.lists l
    where l.id = list_id and (l.share_enabled or l.owner_id = (select auth.uid()))
  ));
create policy list_items_insert_own on public.list_items for insert to authenticated
  with check (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = (select auth.uid())));
create policy list_items_update_own on public.list_items for update to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = (select auth.uid())));
create policy list_items_delete_own on public.list_items for delete to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = (select auth.uid())));

-- ---------------------------------------------------------------- photo storage
-- Public bucket: files are served by their (unguessable) URL. Only the owner can upload or delete,
-- and only inside a folder named after their own user id.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('entry-photos', 'entry-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy entry_photos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'entry-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy entry_photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'entry-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
