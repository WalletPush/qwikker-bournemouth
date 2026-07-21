-- Migration: wedding_photos index table
-- Description: Backs the private, unlisted /wedding/[slug] guest photo-share pages
--   (Bournemouth subdomain only). Guests upload straight to Cloudinary from their phone
--   browser (unsigned preset — bypasses the serverless request-body size limit); we record
--   each resulting asset here so the gallery, the "download album" ZIP and cleanup have a
--   list to work from.
-- Access: SERVICE-ROLE ONLY. The server routes derive the slug + verify the Bournemouth
--   subdomain, then read/write with the service role. RLS is enabled with NO policies so the
--   table is not directly reachable by anon/authenticated clients.
-- Date: 2026-07-21 19:30:00 UTC

create table if not exists public.wedding_photos (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  url text not null,
  public_id text,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

comment on table public.wedding_photos is 'Index of guest-uploaded Cloudinary photos for the /wedding/[slug] share pages (Bournemouth). Service-role access only.';

create index if not exists idx_wedding_photos_slug_created
  on public.wedding_photos (slug, created_at desc);

alter table public.wedding_photos enable row level security;
-- Intentionally NO policies: only the service role (server API routes) touches this table.
-- Enabling RLS without policies denies all direct anon/authenticated access.
