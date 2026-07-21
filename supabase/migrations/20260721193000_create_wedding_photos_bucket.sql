-- Migration: wedding-photos storage bucket
-- Description: Backs the private, unlisted guest photo-share pages at /wedding/[slug]
--   (Bournemouth subdomain only). Guests upload straight from their phone browser to
--   Supabase Storage (bypasses the serverless request-body size limit so large photos
--   work). The bucket is PUBLIC-read so the gallery <img> tags load without signed URLs;
--   discovery is prevented by the unguessable slug + noindex, not by bucket privacy.
--   Deletes (test cleanup / post-event teardown) are done server-side with the service
--   role, which bypasses RLS, so no anon delete policy is granted.
-- Affected: storage.buckets (one new bucket), storage.objects (one insert policy).
-- Date: 2026-07-21 19:30:00 UTC

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-photos',
  'wedding-photos',
  true,
  52428800, -- 50 MB per file (covers phone + DSLR shots)
  null       -- no mime restriction: some browsers send HEIC as octet-stream; client uses accept="image/*"
)
on conflict (id) do nothing;

-- Guests are not logged in: allow anon + authenticated to INSERT into THIS bucket only.
drop policy if exists "wedding_photos_public_insert" on storage.objects;
create policy "wedding_photos_public_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'wedding-photos');
