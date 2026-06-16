-- blastimage — image bytes to storage buckets (BI-022.4)
--
-- BI-022.3 stored image bytes inline (data URLs in generated_images.url /
-- ref_images.data_url). This migration moves the bytes to a private,
-- owner-scoped Supabase storage bucket: each row now references its bucket
-- object by `storage_path`, and the inline-byte columns become nullable
-- (unused in hosted mode). The Supabase adapter (lib/supabaseAdapter.ts)
-- uploads bytes on save and mints short-lived signed URLs on load.
--
-- Object path convention: `{owner_uid}/{session_id}/{image_id}` (no
-- extension; contentType is set on upload). The owner uid is the first path
-- segment so the storage.objects RLS below can owner-scope on it.

-- ─────────────────────────────────────────────────────────────────────────
-- Row columns: reference the bucket object; inline bytes now optional
-- ─────────────────────────────────────────────────────────────────────────

alter table public.generated_images add column if not exists storage_path text;
alter table public.ref_images       add column if not exists storage_path text;

-- The inline-byte columns are no longer written in hosted mode (bytes live in
-- the bucket); relax the not-null constraints from the BI-022.3 init schema.
alter table public.generated_images alter column url      drop not null;
alter table public.ref_images       alter column data_url drop not null;

-- ─────────────────────────────────────────────────────────────────────────
-- Private storage bucket for image bytes
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('images', 'images', false)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- Owner-scoped RLS on the bucket's objects
--
-- An object's first path segment is the owner uid, so a logged-in operator can
-- only read/write objects under their own `{auth.uid()}/…` prefix. RLS on
-- storage.objects is already enabled by Supabase; we only add the policy.
-- ─────────────────────────────────────────────────────────────────────────

create policy "owner can do anything to own image objects"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  )
  with check (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
