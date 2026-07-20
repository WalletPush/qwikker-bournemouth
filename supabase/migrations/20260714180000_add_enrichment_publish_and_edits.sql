-- Migration: Add publish tracking + admin edits to business_enrichments
-- Description: The Acquisition Engine gained two capabilities after the initial
--   business_enrichments table shipped:
--     1) "Publish to live listing" — pushes accepted (non-declined) listing fields
--        to business_profiles. We record when/who published.
--     2) Inline admin edits — an admin can tweak the AI tagline/description in the
--        review drawer; these overrides win over the raw AI draft when publishing
--        and when building the claim invite email.
--   The original create migration (20260714160000) already ran in the DB, so these
--   columns are added here as a follow-up ALTER (idempotent).
-- Affected tables: public.business_enrichments (adds published_at, published_by, edits).
-- Special considerations: additive + nullable/defaulted, so existing rows are safe.
-- Date: 2026-07-14 18:00:00 UTC

alter table public.business_enrichments
  add column if not exists published_at timestamptz,
  add column if not exists published_by text,
  add column if not exists edits jsonb not null default '{}'::jsonb;

comment on column public.business_enrichments.published_at is 'When the accepted listing fields were pushed live to business_profiles (NULL until published). Offers are NOT auto-published; they are held for owner approval at claim.';
comment on column public.business_enrichments.published_by is 'Admin id (text; may be a non-uuid dev id) who published the listing fields.';
comment on column public.business_enrichments.edits is 'Admin edited overrides for editable listing fields (e.g. { tagline, description }). When present these win over the AI draft when publishing / building the invite email.';
