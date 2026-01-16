-- =====================================================
-- BUSINESS VERIFICATION + TAGLINE UNIQUENESS + GOOGLE CATEGORY
-- =====================================================

-- Add verification fields
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS verification_method text NOT NULL DEFAULT 'google',
  ADD COLUMN IF NOT EXISTS google_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_override_at timestamptz,
  ADD COLUMN IF NOT EXISTS manual_override_by uuid,
  ADD COLUMN IF NOT EXISTS google_primary_type text,
  ADD COLUMN IF NOT EXISTS google_reviews_highlights jsonb;

-- Tagline normalized backfill for existing rows (safe)
UPDATE public.business_profiles
SET tagline_normalized = lower(regexp_replace(btrim(business_tagline), '\s+', ' ', 'g'))
WHERE business_tagline IS NOT NULL
  AND (tagline_normalized IS NULL OR btrim(tagline_normalized)='');

-- Unique index: only enforce when tagline_normalized is not null/empty
CREATE UNIQUE INDEX IF NOT EXISTS uq_business_tagline_normalized
ON public.business_profiles(tagline_normalized)
WHERE tagline_normalized IS NOT NULL AND btrim(tagline_normalized) <> '';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_business_profiles_city ON public.business_profiles(city);
CREATE INDEX IF NOT EXISTS idx_business_profiles_google_place_id ON public.business_profiles(google_place_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_verification_method ON public.business_profiles(verification_method);
CREATE INDEX IF NOT EXISTS idx_business_profiles_manual_override ON public.business_profiles(manual_override);

-- Comments
COMMENT ON COLUMN public.business_profiles.verification_method IS 'google|manual - how this business was verified';
COMMENT ON COLUMN public.business_profiles.manual_override IS 'Admin override: allows manual listing to go live without Google verification';
COMMENT ON COLUMN public.business_profiles.google_verified_at IS 'Timestamp when Google verification was completed';
COMMENT ON COLUMN public.business_profiles.google_primary_type IS 'Primary Google Places type (e.g. restaurant, cafe, bar)';
COMMENT ON COLUMN public.business_profiles.google_reviews_highlights IS 'Up to 5 highlight reviews (rating>=4) from Google Places';

-- Backfill existing Google-imported businesses
UPDATE public.business_profiles
SET 
  verification_method = 'google',
  google_verified_at = created_at
WHERE google_place_id IS NOT NULL
  AND verification_method = 'google'
  AND google_verified_at IS NULL;

-- Backfill existing manual businesses
UPDATE public.business_profiles
SET verification_method = 'manual'
WHERE google_place_id IS NULL
  AND verification_method = 'google';
