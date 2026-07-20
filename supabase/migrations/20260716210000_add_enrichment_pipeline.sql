-- Migration: Add pipeline + confidence fields to business_enrichments (Acquisition Engine v2)
-- Description: Powers the visual acquisition "command centre":
--   - confidence + confidence_signals: an explainable 0-100 score computed from the
--     real signals we already generate (website scanned, menu found, description
--     grounded, reviews used, offers grounded, email found). Drives review-by-exception.
--   - sent_at / sent_by: set when a claim invite is actually sent (moves the card to Sent).
--   - reviewed_at / reviewed_by / review_action: the admin's exception-review decision
--     (approved / skipped / rejected). Approved (or high confidence) => Ready to Send.
--   The pipeline STAGE itself is derived on read (never stored) from these primitives
--   plus business_profiles.owner_user_id (claimed) and status, so it can't drift.
-- Affected tables: public.business_enrichments (all additive / nullable-or-defaulted).
-- Date: 2026-07-16 21:00:00 UTC

alter table public.business_enrichments
  add column if not exists confidence smallint,
  add column if not exists confidence_signals jsonb not null default '{}'::jsonb,
  add column if not exists sent_at timestamptz,
  add column if not exists sent_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text,
  add column if not exists review_action text check (review_action in ('approved', 'skipped', 'rejected'));

comment on column public.business_enrichments.confidence is 'Explainable 0-100 confidence score for the generated draft. >= HIGH_CONFIDENCE auto-qualifies for Ready to Send (no manual review).';
comment on column public.business_enrichments.confidence_signals is 'Breakdown behind the score: { signals: {website,menu,description_grounded,reviews,offers_grounded,email}, flags: [..] } for the card + drawer.';
comment on column public.business_enrichments.sent_at is 'When a claim invite was sent for this business (moves the pipeline card to Sent).';
comment on column public.business_enrichments.review_action is 'Admin exception-review decision: approved | skipped | rejected. Approved forces Ready to Send.';

-- Filter the review queue quickly by score.
create index if not exists idx_business_enrichments_confidence on public.business_enrichments(confidence);
