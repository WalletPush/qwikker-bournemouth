-- ============================================================================
-- Add contact_methods to business_profiles (Acquisition Engine keystone)
-- ============================================================================
-- PURPOSE:
--   Store every discovered way to reach a business as ONE normalized list
--   (email / whatsapp / phone / instagram / facebook, each with a verified flag
--   and a ready-to-use url) instead of scattered columns. This future-proofs
--   outreach: the AI can later pick a channel ("email bounced → WhatsApp →
--   Instagram DM") without any schema change.
--
--   Shape (jsonb array):
--     [ { "type": "email",     "value": "...", "url": "mailto:...",  "verified": true,  "source": "website" },
--       { "type": "whatsapp",  "value": "447...", "url": "https://wa.me/447...", "verified": false, "source": "google" },
--       { "type": "instagram", "value": "handle", "url": "https://instagram.com/handle", "verified": true, "source": "existing" } ]
--
-- SAFETY: Purely additive. The existing `email`, `phone`, `instagram_handle` and
--   `facebook_url` columns are left untouched — contact_methods is DERIVED,
--   enrichment-owned data, refreshed on each enrich. Existing flows keep working.
-- ============================================================================

alter table public.business_profiles
  add column if not exists contact_methods jsonb not null default '[]'::jsonb;

comment on column public.business_profiles.contact_methods is
  'Acquisition Engine: normalized outreach channels [{type,value,url,verified,source}]. Derived/refreshed on enrich; additive to email/phone/social columns.';

-- Optional: a GIN index so the AI/CRM can later filter by channel efficiently
-- (e.g. "has a verified whatsapp"). Cheap to add now; harmless if unused.
create index if not exists idx_business_profiles_contact_methods
  on public.business_profiles using gin (contact_methods);
