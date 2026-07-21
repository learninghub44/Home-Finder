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

-- ============================================================================
-- Nearby-properties helper (used by map search / "near me" home sections)
-- ============================================================================
create or replace function public.nearby_properties(
  lat double precision,
  lng double precision,
  radius_meters integer default 5000
)
returns setof public.properties as $$
  select p.*
  from public.properties p
  where p.status = 'available'
    and p.geo_location is not null
    and ST_DWithin(
      p.geo_location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  order by ST_Distance(p.geo_location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) asc;
$$ language sql stable;
