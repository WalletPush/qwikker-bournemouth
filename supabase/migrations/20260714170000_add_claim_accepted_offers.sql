-- Migration: Add accepted_offers to claim_requests (Acquisition Engine → claim)
-- Description: When a business owner claims a listing that the Acquisition Engine
--   pre-drafted offers for, they accept/edit/decline those offers in the claim
--   wizard. Their accepted offers are stored here on the claim_request and, on
--   admin approval, inserted into business_offers so they go live.
-- Affected tables: public.claim_requests (adds one JSONB column).
-- Shape: array of { offer_name, offer_type, offer_value, offer_claim_amount, offer_terms }.
-- Special considerations: additive + nullable, so existing claims are unaffected.
-- Date: 2026-07-14 17:00:00 UTC

alter table public.claim_requests
  add column if not exists accepted_offers jsonb;

comment on column public.claim_requests.accepted_offers is 'Offers the owner accepted from the AI draft at claim time. Inserted into business_offers (status=approved) when the claim is approved. Shape: [{offer_name, offer_type, offer_value, offer_claim_amount, offer_terms}].';
