-- ============================================================================
-- Home Finder — Supabase schema
-- Run in the Supabase SQL editor, or via `supabase db push` with the CLI.
-- Idempotent: safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE throughout).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "postgis";        -- geography type for location + distance queries

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('tenant', 'landlord', 'property_manager', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type property_status as enum ('available', 'occupied', 'reserved', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type property_type as enum (
    'bedsitter', 'one_bedroom', 'two_bedroom', 'three_bedroom',
    'apartment', 'bungalow', 'maisonette', 'townhouse', 'studio', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type viewing_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- profiles — one row per auth user, created automatically on signup (trigger below)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role user_role not null default 'tenant',
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- locations — normalized county/town/estate so search/filter stays consistent
-- ----------------------------------------------------------------------------
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  county text not null,
  town text not null,
  estate text,
  created_at timestamptz not null default now(),
  unique (county, town, estate)
);

-- ----------------------------------------------------------------------------
-- landlords — extended profile info for the landlord role
-- ----------------------------------------------------------------------------
create table if not exists public.landlords (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text,
  id_verified boolean not null default false,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- property_managers — "caretakers", can be assigned to properties by a landlord
-- ----------------------------------------------------------------------------
create table if not exists public.property_managers (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  managed_by_landlord uuid references public.landlords(profile_id) on delete set null,
  contact_phone text,
  contact_email text,
  bio text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- properties
-- ----------------------------------------------------------------------------
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlords(profile_id) on delete cascade,
  caretaker_id uuid references public.property_managers(profile_id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,

  title text not null,
  description text not null,
  property_type property_type not null,
  status property_status not null default 'available',

  bedrooms smallint not null default 0,
  bathrooms smallint not null default 0,
  size_sqm numeric(8,2),

  rent_amount numeric(12,2) not null,
  deposit_amount numeric(12,2) not null default 0,
  service_charge numeric(12,2) not null default 0,
  currency text not null default 'KES',

  water_available boolean not null default false,
  electricity_available boolean not null default false,
  parking_available boolean not null default false,
  internet_available boolean not null default false,
  furnished boolean not null default false,
  pets_allowed boolean not null default false,
  balcony boolean not null default false,
  security_features text,
  house_rules text,
  nearby_landmarks text,

  -- geography(Point) enables ST_DWithin / distance queries for "nearby" and map search
  geo_location geography(Point, 4326),
  address_text text,

  view_count integer not null default 0,
  favorite_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_properties_status on public.properties(status);
create index if not exists idx_properties_type on public.properties(property_type);
create index if not exists idx_properties_rent on public.properties(rent_amount);
create index if not exists idx_properties_landlord on public.properties(landlord_id);
create index if not exists idx_properties_caretaker on public.properties(caretaker_id);
create index if not exists idx_properties_geo on public.properties using gist(geo_location);

-- ----------------------------------------------------------------------------
-- property_images / property_videos — Cloudinary references (no binary stored in Postgres)
-- ----------------------------------------------------------------------------
create table if not exists public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  cloudinary_public_id text not null,
  secure_url text not null,
  width int,
  height int,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_property_images_property on public.property_images(property_id);

create table if not exists public.property_videos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  cloudinary_public_id text not null,
  secure_url text not null,
  duration_seconds numeric(8,2),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_property_videos_property on public.property_videos(property_id);

-- ----------------------------------------------------------------------------
-- amenities (lookup) + property_amenities (join table)
-- ----------------------------------------------------------------------------
create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text
);

create table if not exists public.property_amenities (
  property_id uuid not null references public.properties(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  primary key (property_id, amenity_id)
);

-- ----------------------------------------------------------------------------
-- favorites
-- ----------------------------------------------------------------------------
create table if not exists public.favorites (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, property_id)
);

-- ----------------------------------------------------------------------------
-- viewing_requests
-- ----------------------------------------------------------------------------
create table if not exists public.viewing_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  requested_date date not null,
  requested_time time not null,
  status viewing_status not null default 'pending',
  responder_id uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_viewing_requests_property on public.viewing_requests(property_id);
create index if not exists idx_viewing_requests_tenant on public.viewing_requests(tenant_id);

-- ----------------------------------------------------------------------------
-- conversations + messages (realtime chat)
-- ----------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  participant_one uuid not null references public.profiles(id) on delete cascade,
  participant_two uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (property_id, participant_one, participant_two)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  image_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, -- 'message' | 'viewing_update' | 'saved_search' | 'listing_update' | 'system'
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_profile on public.notifications(profile_id, created_at desc);

create table if not exists public.push_tokens (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  device_info text,
  created_at timestamptz not null default now(),
  primary key (profile_id, expo_push_token)
);

-- ----------------------------------------------------------------------------
-- reports (fraud / abuse)
-- ----------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- reviews
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (property_id, reviewer_id)
);

-- ----------------------------------------------------------------------------
-- Phase 8 stub (architecture only — no live payment flow)
-- ----------------------------------------------------------------------------
create table if not exists public.payment_accounts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  provider text not null default 'mpesa_daraja',
  external_reference text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- property_view_events — one row per view, backs the "views over time" chart
-- on the landlord/caretaker dashboard. Intentionally minimal (no viewer_id —
-- views are anonymous by design, same as view_count on properties).
-- ----------------------------------------------------------------------------
create table if not exists public.property_view_events (
  id bigint generated always as identity primary key,
  property_id uuid not null references public.properties(id) on delete cascade,
  viewed_at timestamptz not null default now()
);
create index if not exists idx_property_view_events_property_time
  on public.property_view_events(property_id, viewed_at);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-create a profiles row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'tenant')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Generic updated_at maintenance
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.properties;
create trigger set_updated_at before update on public.properties
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.viewing_requests;
create trigger set_updated_at before update on public.viewing_requests
  for each row execute procedure public.set_updated_at();

-- Keep favorite_count on properties in sync
create or replace function public.adjust_favorite_count()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.properties set favorite_count = favorite_count + 1 where id = new.property_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.properties set favorite_count = greatest(favorite_count - 1, 0) where id = old.property_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists favorites_count on public.favorites;
create trigger favorites_count
  after insert or delete on public.favorites
  for each row execute procedure public.adjust_favorite_count();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.landlords enable row level security;
alter table public.property_managers enable row level security;
alter table public.locations enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.property_videos enable row level security;
alter table public.amenities enable row level security;
alter table public.property_amenities enable row level security;
alter table public.favorites enable row level security;
alter table public.viewing_requests enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.reports enable row level security;
alter table public.reviews enable row level security;
alter table public.payment_accounts enable row level security;
alter table public.property_view_events enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- profiles: readable by anyone signed in (needed to show landlord/caretaker names on
-- listings); only the owner or an admin can modify.
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id or public.is_admin());
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- landlords / property_managers: public read (needed for property detail contact info),
-- owner-managed writes.
create policy "landlords_select_all" on public.landlords for select using (true);
create policy "landlords_upsert_own" on public.landlords
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "caretakers_select_all" on public.property_managers for select using (true);
create policy "caretakers_upsert_own" on public.property_managers
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- locations, amenities: public read, admin-only write
create policy "locations_select_all" on public.locations for select using (true);
create policy "locations_admin_write" on public.locations
  for insert with check (public.is_admin());
create policy "locations_admin_update" on public.locations
  for update using (public.is_admin());

create policy "amenities_select_all" on public.amenities for select using (true);
create policy "amenities_admin_write" on public.amenities
  for all using (public.is_admin()) with check (public.is_admin());

-- properties: anyone can read available listings; owners (landlord) and their assigned
-- caretaker can read/write their own regardless of status; admins can do anything.
create policy "properties_select_available_or_owner" on public.properties
  for select using (
    status = 'available'
    or landlord_id = auth.uid()
    or caretaker_id = auth.uid()
    or public.is_admin()
  );
create policy "properties_insert_landlord" on public.properties
  for insert with check (landlord_id = auth.uid());
create policy "properties_update_owner_or_caretaker" on public.properties
  for update using (landlord_id = auth.uid() or caretaker_id = auth.uid() or public.is_admin());
create policy "properties_delete_owner" on public.properties
  for delete using (landlord_id = auth.uid() or public.is_admin());

-- property_images / videos: follow the parent property's visibility; writes restricted
-- to the property's landlord/caretaker.
create policy "property_images_select" on public.property_images
  for select using (
    exists (
      select 1 from public.properties p
      where p.id = property_id
        and (p.status = 'available' or p.landlord_id = auth.uid() or p.caretaker_id = auth.uid() or public.is_admin())
    )
  );
create policy "property_images_write" on public.property_images
  for all using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (p.landlord_id = auth.uid() or p.caretaker_id = auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (p.landlord_id = auth.uid() or p.caretaker_id = auth.uid())
    )
  );

create policy "property_videos_select" on public.property_videos
  for select using (
    exists (
      select 1 from public.properties p
      where p.id = property_id
        and (p.status = 'available' or p.landlord_id = auth.uid() or p.caretaker_id = auth.uid() or public.is_admin())
    )
  );
create policy "property_videos_write" on public.property_videos
  for all using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (p.landlord_id = auth.uid() or p.caretaker_id = auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (p.landlord_id = auth.uid() or p.caretaker_id = auth.uid())
    )
  );

create policy "property_amenities_select" on public.property_amenities for select using (true);
create policy "property_amenities_write" on public.property_amenities
  for all using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (p.landlord_id = auth.uid() or p.caretaker_id = auth.uid())
    )
  );

-- favorites: users manage only their own
create policy "favorites_owner_all" on public.favorites
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- viewing_requests: tenant who made it, or the property's landlord/caretaker, can see/update
create policy "viewing_requests_select" on public.viewing_requests
  for select using (
    tenant_id = auth.uid()
    or exists (
      select 1 from public.properties p
      where p.id = property_id and (p.landlord_id = auth.uid() or p.caretaker_id = auth.uid())
    )
    or public.is_admin()
  );
create policy "viewing_requests_insert_tenant" on public.viewing_requests
  for insert with check (tenant_id = auth.uid());
create policy "viewing_requests_update" on public.viewing_requests
  for update using (
    tenant_id = auth.uid()
    or exists (
      select 1 from public.properties p
      where p.id = property_id and (p.landlord_id = auth.uid() or p.caretaker_id = auth.uid())
    )
  );

-- conversations / messages: only the two participants can read/write
create policy "conversations_participants" on public.conversations
  for select using (auth.uid() in (participant_one, participant_two));
create policy "conversations_insert" on public.conversations
  for insert with check (auth.uid() in (participant_one, participant_two));

create policy "messages_participants_select" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and auth.uid() in (c.participant_one, c.participant_two)
    )
  );
create policy "messages_participants_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and auth.uid() in (c.participant_one, c.participant_two)
    )
  );

-- notifications / push_tokens: strictly own-row only
create policy "notifications_owner" on public.notifications
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "push_tokens_owner" on public.push_tokens
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- reports: reporter can create/read own; admins see all
create policy "reports_insert_own" on public.reports
  for insert with check (reporter_id = auth.uid());
create policy "reports_select_own_or_admin" on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());
create policy "reports_admin_update" on public.reports
  for update using (public.is_admin());

-- reviews: public read, author writes own
create policy "reviews_select_all" on public.reviews for select using (true);
create policy "reviews_owner_write" on public.reviews
  for all using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());

-- payment_accounts: strictly own-row only (unused until Phase 8)
create policy "payment_accounts_owner" on public.payment_accounts
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- property_view_events: read-only for the property's landlord/caretaker/admin; no client-side
-- insert policy at all — rows are only ever written by increment_property_view (SECURITY DEFINER).
create policy "property_view_events_select_owner" on public.property_view_events
  for select using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (p.landlord_id = auth.uid() or p.caretaker_id = auth.uid() or public.is_admin())
    )
  );

-- ============================================================================
-- Phase 3 — property search / details / view-count RPCs
-- Runs SECURITY INVOKER (default) so the existing properties RLS policy
-- ("available, or own listing, or admin") is enforced automatically — no
-- separate privilege logic needed here.
-- ============================================================================

-- search_properties: single flexible RPC backing the Home screen sections,
-- the Search + Filters screen, the Map screen (pass a bbox-sized radius) and
-- the Favorites screen (pass property_ids). Returns one row per match, each
-- a lightweight card-shaped jsonb object — cheap enough to call repeatedly
-- with different filters rather than maintaining several near-duplicate RPCs.
create or replace function public.search_properties(
  viewer_id uuid default null,
  search_text text default null,
  min_rent numeric default null,
  max_rent numeric default null,
  bedrooms_filter smallint default null,
  property_types text[] default null,
  amenity_ids uuid[] default null,
  county_filter text default null,
  town_filter text default null,
  property_ids uuid[] default null,
  user_lat double precision default null,
  user_lng double precision default null,
  radius_meters integer default null,
  sort_by text default 'newest', -- 'newest' | 'price_asc' | 'price_desc' | 'nearest'
  page_limit integer default 20,
  page_offset integer default 0
)
returns setof jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'property_type', p.property_type,
    'status', p.status,
    'bedrooms', p.bedrooms,
    'bathrooms', p.bathrooms,
    'rent_amount', p.rent_amount,
    'deposit_amount', p.deposit_amount,
    'currency', p.currency,
    'furnished', p.furnished,
    'cover_image_url', (
      select pi.secure_url from public.property_images pi
      where pi.property_id = p.id order by pi.sort_order asc limit 1
    ),
    'image_count', (
      select count(*)::int from public.property_images pi where pi.property_id = p.id
    ),
    'county', l.county,
    'town', l.town,
    'estate', l.estate,
    'latitude', ST_Y(p.geo_location::geometry),
    'longitude', ST_X(p.geo_location::geometry),
    'distance_meters', case
      when user_lat is not null and user_lng is not null and p.geo_location is not null
      then ST_Distance(p.geo_location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography)
      else null
    end,
    'favorite_count', p.favorite_count,
    'is_favorited', viewer_id is not null and exists(
      select 1 from public.favorites f where f.property_id = p.id and f.profile_id = viewer_id
    ),
    'created_at', p.created_at
  )
  from public.properties p
  left join public.locations l on l.id = p.location_id
  where p.status = 'available'
    and (search_text is null or (p.title ilike '%' || search_text || '%' or p.description ilike '%' || search_text || '%'))
    and (min_rent is null or p.rent_amount >= min_rent)
    and (max_rent is null or p.rent_amount <= max_rent)
    and (bedrooms_filter is null or p.bedrooms = bedrooms_filter)
    and (property_types is null or p.property_type::text = any(property_types))
    and (county_filter is null or l.county = county_filter)
    and (town_filter is null or l.town = town_filter)
    and (property_ids is null or p.id = any(property_ids))
    and (
      amenity_ids is null or not exists (
        select 1 from unnest(amenity_ids) as required(aid)
        where not exists (
          select 1 from public.property_amenities pa
          where pa.property_id = p.id and pa.amenity_id = required.aid
        )
      )
    )
    and (
      user_lat is null or user_lng is null or radius_meters is null or p.geo_location is null
      or ST_DWithin(p.geo_location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_meters)
    )
  order by
    case when sort_by = 'price_asc' then p.rent_amount end asc nulls last,
    case when sort_by = 'price_desc' then p.rent_amount end desc nulls last,
    case when sort_by = 'nearest' and user_lat is not null and user_lng is not null
      then ST_Distance(p.geo_location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography)
    end asc nulls last,
    p.created_at desc
  limit page_limit offset page_offset;
$$;

-- property_details: single round trip for the Property Details screen —
-- full property fields, images/videos/amenities, location, landlord and
-- caretaker contact info, and whether the viewer has favorited it.
create or replace function public.property_details(
  target_property_id uuid,
  viewer_id uuid default null
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', p.id,
    'landlord_id', p.landlord_id,
    'caretaker_id', p.caretaker_id,
    'title', p.title,
    'description', p.description,
    'property_type', p.property_type,
    'status', p.status,
    'bedrooms', p.bedrooms,
    'bathrooms', p.bathrooms,
    'size_sqm', p.size_sqm,
    'rent_amount', p.rent_amount,
    'deposit_amount', p.deposit_amount,
    'service_charge', p.service_charge,
    'currency', p.currency,
    'water_available', p.water_available,
    'electricity_available', p.electricity_available,
    'parking_available', p.parking_available,
    'internet_available', p.internet_available,
    'furnished', p.furnished,
    'pets_allowed', p.pets_allowed,
    'balcony', p.balcony,
    'security_features', p.security_features,
    'house_rules', p.house_rules,
    'nearby_landmarks', p.nearby_landmarks,
    'address_text', p.address_text,
    'latitude', ST_Y(p.geo_location::geometry),
    'longitude', ST_X(p.geo_location::geometry),
    'view_count', p.view_count,
    'favorite_count', p.favorite_count,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'location', case when l.id is null then null else jsonb_build_object(
      'id', l.id, 'county', l.county, 'town', l.town, 'estate', l.estate
    ) end,
    'images', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pi.id, 'secure_url', pi.secure_url,
        'width', pi.width, 'height', pi.height, 'sort_order', pi.sort_order
      ) order by pi.sort_order asc)
      from public.property_images pi where pi.property_id = p.id
    ), '[]'::jsonb),
    'videos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pv.id, 'secure_url', pv.secure_url,
        'duration_seconds', pv.duration_seconds, 'sort_order', pv.sort_order
      ) order by pv.sort_order asc)
      from public.property_videos pv where pv.property_id = p.id
    ), '[]'::jsonb),
    'amenities', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'icon', a.icon))
      from public.property_amenities pa
      join public.amenities a on a.id = pa.amenity_id
      where pa.property_id = p.id
    ), '[]'::jsonb),
    'landlord', jsonb_build_object(
      'id', lp.id, 'full_name', lp.full_name, 'avatar_url', lp.avatar_url,
      'contact_phone', ld.contact_phone, 'contact_email', ld.contact_email,
      'business_name', ld.business_name, 'id_verified', ld.id_verified
    ),
    'caretaker', case when cp.id is null then null else jsonb_build_object(
      'id', cp.id, 'full_name', cp.full_name, 'avatar_url', cp.avatar_url,
      'contact_phone', cm.contact_phone, 'contact_email', cm.contact_email, 'bio', cm.bio
    ) end,
    'is_favorited', viewer_id is not null and exists(
      select 1 from public.favorites f where f.property_id = p.id and f.profile_id = viewer_id
    )
  )
  from public.properties p
  left join public.locations l on l.id = p.location_id
  join public.profiles lp on lp.id = p.landlord_id
  join public.landlords ld on ld.profile_id = p.landlord_id
  left join public.profiles cp on cp.id = p.caretaker_id
  left join public.property_managers cm on cm.profile_id = p.caretaker_id
  where p.id = target_property_id;
$$;

-- increment_property_view: narrowly-scoped SECURITY DEFINER so any signed-in
-- viewer (not just the owner) can bump view_count, without granting broader
-- write access to the properties table. Also logs a row in property_view_events
-- so the dashboard can chart views over time; still touches nothing else.
create or replace function public.increment_property_view(target_property_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.properties
  set view_count = view_count + 1
  where id = target_property_id and status = 'available';

  if found then
    insert into public.property_view_events (property_id) values (target_property_id);
  end if;
end;
$$;

revoke all on function public.increment_property_view(uuid) from public;
grant execute on function public.increment_property_view(uuid) to authenticated, anon;

-- landlord_views_over_time: day-bucketed view counts across every property owned or
-- cared for by profile_id, for the last `days_back` days (inclusive of today).
-- Runs SECURITY DEFINER (a caretaker/landlord shouldn't need select access to
-- property_view_events directly for every property — this scopes the aggregation
-- itself to only that profile's own properties, same trust boundary as before).
create or replace function public.landlord_views_over_time(
  profile_id uuid,
  days_back integer default 30
)
returns table (day date, view_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    d::date as day,
    count(pve.id)::int as view_count
  from generate_series(
    current_date - (greatest(days_back, 1) - 1),
    current_date,
    interval '1 day'
  ) as d
  left join public.properties p
    on p.landlord_id = profile_id or p.caretaker_id = profile_id
  left join public.property_view_events pve
    on pve.property_id = p.id and pve.viewed_at::date = d::date
  group by d
  order by d;
$$;

revoke all on function public.landlord_views_over_time(uuid, integer) from public;
grant execute on function public.landlord_views_over_time(uuid, integer) to authenticated;

-- ============================================================================
-- Phase 5 — Viewing request lifecycle & realtime chat
-- ============================================================================

-- Recipients need to mark a message read, but must not be able to edit the
-- sender's content — only read_at is meant to change here, and that's
-- enforced at the app layer (the client only ever sends { read_at }).
create policy "messages_participants_update_read" on public.messages
  for update using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and auth.uid() in (c.participant_one, c.participant_two)
    )
  )
  with check (sender_id <> auth.uid());

-- get_or_create_conversation: finds the existing 1:1 (optionally property-scoped)
-- conversation between the caller and another profile, or creates it. Runs
-- SECURITY INVOKER — the conversations_insert/select RLS policies already permit
-- this since the caller is always one of the two participants. Participant
-- columns are stored in a canonical (least, greatest) order so the same pair
-- can never end up with two separate conversation rows for the same property.
create or replace function public.get_or_create_conversation(
  other_profile_id uuid,
  for_property_id uuid default null
)
returns uuid
language plpgsql
as $$
declare
  p1 uuid;
  p2 uuid;
  conv_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if other_profile_id = auth.uid() then
    raise exception 'Cannot start a conversation with yourself';
  end if;

  p1 := least(auth.uid(), other_profile_id);
  p2 := greatest(auth.uid(), other_profile_id);

  select id into conv_id from public.conversations
  where participant_one = p1 and participant_two = p2
    and ((for_property_id is null and property_id is null) or property_id = for_property_id)
  limit 1;

  if conv_id is null then
    insert into public.conversations (property_id, participant_one, participant_two)
    values (for_property_id, p1, p2)
    returning id into conv_id;
  end if;

  return conv_id;
end;
$$;

revoke all on function public.get_or_create_conversation(uuid, uuid) from public;
grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;

-- get_my_conversations: conversation list for the Messages tab — other
-- participant's name/avatar, the property it's attached to (if any), the
-- last message preview, and an unread count, in one round trip. SECURITY
-- INVOKER: conversations RLS already scopes rows to the caller, and profiles
-- are readable by any authenticated user.
create or replace function public.get_my_conversations()
returns setof jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', c.id,
    'property_id', c.property_id,
    'property_title', pr.title,
    'other_participant', jsonb_build_object(
      'id', op.id, 'full_name', op.full_name, 'avatar_url', op.avatar_url
    ),
    'last_message', (
      select jsonb_build_object(
        'body', m.body, 'image_url', m.image_url,
        'created_at', m.created_at, 'sender_id', m.sender_id
      )
      from public.messages m where m.conversation_id = c.id
      order by m.created_at desc limit 1
    ),
    'unread_count', (
      select count(*)::int from public.messages m
      where m.conversation_id = c.id and m.sender_id <> auth.uid() and m.read_at is null
    ),
    'created_at', c.created_at
  )
  from public.conversations c
  left join public.properties pr on pr.id = c.property_id
  join public.profiles op
    on op.id = (case when c.participant_one = auth.uid() then c.participant_two else c.participant_one end)
  where auth.uid() in (c.participant_one, c.participant_two)
  order by coalesce(
    (select max(m2.created_at) from public.messages m2 where m2.conversation_id = c.id),
    c.created_at
  ) desc;
$$;

grant execute on function public.get_my_conversations() to authenticated;

-- Notify the landlord/caretaker on a new request, and whichever side didn't
-- just act on a status change (tenant requests → landlord/caretaker sees it;
-- landlord confirms/declines/reschedules → tenant sees it; tenant responds to
-- a reschedule → landlord/caretaker sees it). Writes to `notifications` only —
-- turning these into push notifications is Phase 6's job.
create or replace function public.notify_viewing_request_change()
returns trigger as $$
declare
  v_landlord_id uuid;
  v_caretaker_id uuid;
  v_prop_title text;
  v_tenant_name text;
begin
  select p.landlord_id, p.caretaker_id, p.title
    into v_landlord_id, v_caretaker_id, v_prop_title
  from public.properties p where p.id = new.property_id;

  if tg_op = 'INSERT' then
    select full_name into v_tenant_name from public.profiles where id = new.tenant_id;

    insert into public.notifications (profile_id, type, title, body, data)
    values (
      v_landlord_id, 'viewing_update', 'New viewing request',
      coalesce(v_tenant_name, 'A tenant') || ' requested a viewing for ' || v_prop_title,
      jsonb_build_object('viewing_request_id', new.id, 'property_id', new.property_id)
    );
    if v_caretaker_id is not null then
      insert into public.notifications (profile_id, type, title, body, data)
      values (
        v_caretaker_id, 'viewing_update', 'New viewing request',
        coalesce(v_tenant_name, 'A tenant') || ' requested a viewing for ' || v_prop_title,
        jsonb_build_object('viewing_request_id', new.id, 'property_id', new.property_id)
      );
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.responder_id = new.tenant_id then
      insert into public.notifications (profile_id, type, title, body, data)
      values (
        v_landlord_id, 'viewing_update', 'Viewing request updated',
        'A tenant marked their viewing request as ' || new.status || ' for ' || v_prop_title,
        jsonb_build_object('viewing_request_id', new.id, 'property_id', new.property_id)
      );
      if v_caretaker_id is not null then
        insert into public.notifications (profile_id, type, title, body, data)
        values (
          v_caretaker_id, 'viewing_update', 'Viewing request updated',
          'A tenant marked their viewing request as ' || new.status || ' for ' || v_prop_title,
          jsonb_build_object('viewing_request_id', new.id, 'property_id', new.property_id)
        );
      end if;
    else
      insert into public.notifications (profile_id, type, title, body, data)
      values (
        new.tenant_id, 'viewing_update', 'Viewing request ' || new.status,
        'Your viewing request for ' || v_prop_title || ' is now ' || new.status,
        jsonb_build_object('viewing_request_id', new.id, 'property_id', new.property_id)
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists viewing_requests_notify on public.viewing_requests;
create trigger viewing_requests_notify
  after insert or update on public.viewing_requests
  for each row execute procedure public.notify_viewing_request_change();

-- Notify the other participant on a new chat message.
create or replace function public.notify_new_message()
returns trigger as $$
declare
  v_recipient uuid;
  v_sender_name text;
begin
  select case when c.participant_one = new.sender_id then c.participant_two else c.participant_one end
    into v_recipient
  from public.conversations c where c.id = new.conversation_id;

  select full_name into v_sender_name from public.profiles where id = new.sender_id;

  insert into public.notifications (profile_id, type, title, body, data)
  values (
    v_recipient, 'message', coalesce(v_sender_name, 'New message'),
    coalesce(nullif(new.body, ''), 'Sent a photo'),
    jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id)
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify
  after insert on public.messages
  for each row execute procedure public.notify_new_message();

-- Realtime: the chat screen subscribes to new rows on `messages` via
-- postgres_changes. `supabase_realtime` always exists on a Supabase project;
-- guard with a check so re-running this file doesn't error if it's already added.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ============================================================================
-- Phase 6 — Notifications (push token registration + delivery triggers)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- saved_searches: a tenant's saved filter set, used to alert them when a
-- matching listing goes live. `filters` mirrors a subset of the
-- search_properties() args (see below) as plain jsonb rather than a fixed
-- set of columns, so new filter fields don't require a migration.
-- ----------------------------------------------------------------------------
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_saved_searches_profile on public.saved_searches(profile_id);

alter table public.saved_searches enable row level security;

create policy "saved_searches_owner" on public.saved_searches
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- notify_matching_saved_searches: fires when a listing becomes available
-- (either a brand-new listing, or an existing one flipping to 'available'
-- from something else — e.g. a landlord relisting). For every saved search
-- whose filters the new row satisfies, insert a 'saved_search' notification.
-- Matching only checks fields that are actually present in `filters`; an
-- absent/null key is treated as "no constraint" on that field. Free-text
-- search_text and amenity_ids aren't matched here (that logic lives in
-- search_properties() and would be costly to duplicate in a trigger) — those
-- searches still work in-app, they just won't generate alerts.
create or replace function public.notify_matching_saved_searches()
returns trigger as $$
declare
  v_search record;
  v_county text;
  v_town text;
begin
  if new.status <> 'available' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'available' then
    return new; -- already available before; nothing changed for alerting purposes
  end if;

  select l.county, l.town into v_county, v_town
  from public.locations l where l.id = new.location_id;

  for v_search in
    select ss.id, ss.profile_id, ss.filters
    from public.saved_searches ss
    where ss.profile_id <> new.landlord_id
      and (new.caretaker_id is null or ss.profile_id <> new.caretaker_id)
  loop
    if (v_search.filters ? 'min_rent') and (v_search.filters->>'min_rent') is not null
        and new.rent_amount < (v_search.filters->>'min_rent')::numeric then
      continue;
    end if;
    if (v_search.filters ? 'max_rent') and (v_search.filters->>'max_rent') is not null
        and new.rent_amount > (v_search.filters->>'max_rent')::numeric then
      continue;
    end if;
    if (v_search.filters ? 'bedrooms_filter') and (v_search.filters->>'bedrooms_filter') is not null
        and new.bedrooms < (v_search.filters->>'bedrooms_filter')::smallint then
      continue;
    end if;
    if (v_search.filters ? 'county_filter') and (v_search.filters->>'county_filter') is not null
        and lower(coalesce(v_county, '')) <> lower(v_search.filters->>'county_filter') then
      continue;
    end if;
    if (v_search.filters ? 'town_filter') and (v_search.filters->>'town_filter') is not null
        and lower(coalesce(v_town, '')) <> lower(v_search.filters->>'town_filter') then
      continue;
    end if;
    if (v_search.filters ? 'property_types') and jsonb_typeof(v_search.filters->'property_types') = 'array'
        and jsonb_array_length(v_search.filters->'property_types') > 0
        and not (v_search.filters->'property_types' @> to_jsonb(new.property_type::text)) then
      continue;
    end if;

    insert into public.notifications (profile_id, type, title, body, data)
    values (
      v_search.profile_id, 'saved_search', 'New match for "' || v_search.name || '"',
      new.title || coalesce(' in ' || v_town, ''),
      jsonb_build_object('property_id', new.id, 'saved_search_id', v_search.id)
    );
  end loop;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists properties_notify_saved_searches on public.properties;
create trigger properties_notify_saved_searches
  after insert or update of status on public.properties
  for each row execute procedure public.notify_matching_saved_searches();

-- notify_favorited_listing_update: fires when a listing someone has
-- favorited either drops in price or changes status away from 'available'
-- (occupied/reserved/removed) — the two changes a tenant actively watching a
-- listing cares about.
create or replace function public.notify_favorited_listing_update()
returns trigger as $$
declare
  v_favoriter record;
begin
  if new.rent_amount is distinct from old.rent_amount and new.rent_amount < old.rent_amount then
    for v_favoriter in
      select f.profile_id from public.favorites f where f.property_id = new.id
    loop
      insert into public.notifications (profile_id, type, title, body, data)
      values (
        v_favoriter.profile_id, 'listing_update', 'Price drop',
        new.title || ' is now ' || new.currency || ' ' || new.rent_amount,
        jsonb_build_object('property_id', new.id)
      );
    end loop;
  elsif new.status is distinct from old.status and old.status = 'available' and new.status <> 'available' then
    for v_favoriter in
      select f.profile_id from public.favorites f where f.property_id = new.id
    loop
      insert into public.notifications (profile_id, type, title, body, data)
      values (
        v_favoriter.profile_id, 'listing_update', 'Listing no longer available',
        new.title || ' is no longer listed as available.',
        jsonb_build_object('property_id', new.id)
      );
    end loop;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists properties_notify_favorites on public.properties;
create trigger properties_notify_favorites
  after update on public.properties
  for each row execute procedure public.notify_favorited_listing_update();

-- ----------------------------------------------------------------------------
-- Push delivery: notifications rows are turned into Expo push notifications
-- by the `send-push` Edge Function (see supabase/functions/send-push). This
-- file does NOT wire up the Database Webhook that invokes it, because that
-- requires the deployed function's project-specific URL. One-time manual
-- step once the project exists and the function is deployed:
--   Dashboard → Database → Webhooks → Create a new webhook
--     Table: notifications | Events: Insert | Type: Supabase Edge Functions
--     Edge Function: send-push
-- push_tokens/notifications RLS (both owner-only, `for all`) already covers
-- everything the client needs — no additional policies required here.

-- ============================================================================
-- Phase 7 — Admin
-- ============================================================================

-- locations previously had admin-only insert/update but no delete policy —
-- admin's location management screen needs to retire unused county/town/estate
-- rows. amenities already used a single `for all` policy so delete was already
-- covered there; locations used split insert/update policies and was missed.
create policy "locations_admin_delete" on public.locations
  for delete using (public.is_admin());

-- platform_analytics: single round-trip stat rollup for the admin dashboard.
-- Runs SECURITY DEFINER so it can count across every user/property/report
-- regardless of RLS, but explicitly re-checks is_admin() itself first — this
-- function is more sensitive than landlord_views_over_time (which only ever
-- aggregates a single caller's own properties), since it exposes platform-wide
-- counts, so it does not rely on the caller only ever being invoked from an
-- admin-gated screen.
create or replace function public.platform_analytics()
returns table (
  total_users bigint,
  total_tenants bigint,
  total_landlords bigint,
  total_caretakers bigint,
  suspended_users bigint,
  total_properties bigint,
  available_properties bigint,
  occupied_properties bigint,
  reserved_properties bigint,
  removed_properties bigint,
  total_views bigint,
  total_favorites bigint,
  open_reports bigint,
  pending_viewing_requests bigint,
  new_users_last_30d bigint,
  new_properties_last_30d bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles where role = 'tenant'),
    (select count(*) from public.profiles where role = 'landlord'),
    (select count(*) from public.profiles where role = 'property_manager'),
    (select count(*) from public.profiles where is_suspended),
    (select count(*) from public.properties),
    (select count(*) from public.properties where status = 'available'),
    (select count(*) from public.properties where status = 'occupied'),
    (select count(*) from public.properties where status = 'reserved'),
    (select count(*) from public.properties where status = 'removed'),
    (select coalesce(sum(view_count), 0) from public.properties),
    (select count(*) from public.favorites),
    (select count(*) from public.reports where status = 'open'),
    (select count(*) from public.viewing_requests where status = 'pending'),
    (select count(*) from public.profiles where created_at >= now() - interval '30 days'),
    (select count(*) from public.properties where created_at >= now() - interval '30 days');
end;
$$;

revoke all on function public.platform_analytics() from public;
grant execute on function public.platform_analytics() to authenticated;

-- ============================================================================
-- Phase 8 — Payments Prep (architecture only — no live M-Pesa Daraja calls,
-- no client-triggered payment flow. See ROADMAP.md Phase 8 note.)
-- ============================================================================

do $$ begin
  create type payment_status as enum ('pending', 'completed', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_purpose as enum ('rent', 'deposit', 'service_charge', 'viewing_fee');
exception when duplicate_object then null; end $$;

-- payment_accounts already existed as a Phase 8 stub (profile_id, provider,
-- external_reference) — widened here with the fields a landlord's M-Pesa
-- receiving account actually needs (Paybill xor Till, plus the account
-- reference tenants would enter). Additive only, nothing renamed/removed.
alter table public.payment_accounts add column if not exists paybill_number text;
alter table public.payment_accounts add column if not exists till_number text;
alter table public.payment_accounts add column if not exists account_reference text;

-- payments — one row per rent/deposit/service-charge/viewing-fee payment
-- attempt. Mirrors the fields a Daraja STK Push integration needs to track
-- (merchant_request_id / checkout_request_id / mpesa_receipt_number), but
-- nothing in this codebase calls Safaricom's API yet — this table exists so
-- the schema is ready when that integration lands.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  landlord_id uuid not null references public.landlords(profile_id) on delete cascade,
  purpose payment_purpose not null default 'rent',
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'KES',
  status payment_status not null default 'pending',
  phone_number text,
  mpesa_receipt_number text,
  merchant_request_id text,
  checkout_request_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_payments_tenant on public.payments(tenant_id);
create index if not exists idx_payments_landlord on public.payments(landlord_id);
create index if not exists idx_payments_property on public.payments(property_id);

alter table public.payments enable row level security;

-- Read-only from the client. Deliberately no insert/update/delete policy:
-- initiating a payment means calling Daraja's STK Push endpoint (which needs
-- a secret consumer key/secret this app must never hold client-side), and
-- resolving it means trusting Safaricom's callback — both belong in a future
-- SECURITY DEFINER function / Edge Function running with service-role
-- credentials, not a client-writable table. Until that integration exists,
-- this table has no way to be written to at all, by design.
create policy "payments_select" on public.payments
  for select using (tenant_id = auth.uid() or landlord_id = auth.uid() or public.is_admin());
