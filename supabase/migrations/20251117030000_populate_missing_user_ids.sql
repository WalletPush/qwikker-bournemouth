-- Migration: Populate missing user_id fields in business_profiles
-- Description: Some business_profiles rows don't have user_id set. This migration
--              finds the auth user associated with each business and populates user_id.
-- Date: 2025-11-17 03:00:00 UTC
-- CRITICAL: This ensures business_subscriptions can be properly linked!

-- Strategy:
-- 1. For businesses created via signup: user_id should match auth.users(id) by email
-- 2. For manually created businesses: we need to find or create the auth user

-- Step 1: Update business_profiles where user_id is NULL but we can find auth user by email
UPDATE public.business_profiles bp
SET user_id = au.id
FROM auth.users au
WHERE bp.user_id IS NULL
  AND bp.email IS NOT NULL
  AND bp.email = au.email;

-- Step 2: Report any businesses still missing user_id (manual intervention needed)
-- Uncomment to see which businesses need manual fixing:
-- SELECT 
--   id,
--   business_name,
--   email,
--   created_at
-- FROM public.business_profiles
-- WHERE user_id IS NULL
-- ORDER BY created_at DESC;

-- Step 3: Add a comment to clarify the relationship
COMMENT ON COLUMN public.business_profiles.user_id IS 
'Foreign key to auth.users.id. Every business MUST have a user_id. This is used for authentication and linking to business_subscriptions.';

