-- ============================================================================
-- Home Finder — Supabase Storage buckets & policies
-- Run after schema.sql. Idempotent.
--
-- Cloudinary is the primary store for listing photos/videos (see src/lib/cloudinary.ts),
-- so this file only covers what belongs in Supabase Storage: user avatars and
-- in-chat image attachments, both of which are small, access-controlled, and
-- tied directly to auth.uid() in a way that's simplest to police here.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Buckets
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true, -- public read: avatars are shown widely (listings, chat, reviews)
  2097152, -- 2MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false, -- private: only the two conversation participants may read
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- avatars policies
-- Convention: object path is `{auth.uid()}/{filename}`, e.g. `<uuid>/avatar.jpg`.
-- The leading folder segment is what we check ownership against.
-- ----------------------------------------------------------------------------
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- chat-attachments policies
-- Path convention: `{conversation_id}/{filename}`. Readable/writable only by
-- the two profiles on that conversation (checked against public.conversations).
-- ----------------------------------------------------------------------------
drop policy if exists "chat_attachments_participants_read" on storage.objects;
create policy "chat_attachments_participants_read"
  on storage.objects for select
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and auth.uid() in (c.participant_one, c.participant_two)
    )
  );

drop policy if exists "chat_attachments_participants_insert" on storage.objects;
create policy "chat_attachments_participants_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and auth.uid() in (c.participant_one, c.participant_two)
    )
  );

drop policy if exists "chat_attachments_owner_delete" on storage.objects;
create policy "chat_attachments_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'chat-attachments'
    and owner = auth.uid()
  );
