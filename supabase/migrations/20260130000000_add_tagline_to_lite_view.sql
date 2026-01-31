-- Add business_tagline and business_description to business_profiles_lite_eligible view
-- This enables rich, conversational chat responses for claimed-free businesses

-- Drop existing view first (can't use REPLACE when changing column order)
DROP VIEW IF EXISTS public.business_profiles_lite_eligible;

-- Recreate with new columns
CREATE VIEW public.business_profiles_lite_eligible AS
SELECT
  bp.id,
  bp.business_name,
  bp.business_tagline,  -- ✅ NEW: Short tagline for rich chat responses
  bp.business_description,  -- ✅ NEW: Full description for context
  bp.display_category,
  bp.google_primary_type,
  bp.business_town,
  bp.business_address,
  bp.phone,
  bp.website_url,
  bp.google_place_id,
  bp.latitude,
  bp.longitude,
  bp.rating,
  bp.review_count,
  bp.city,
  bp.business_hours,
  bp.business_hours_structured,
  bp.menu_preview,
  
  -- Derive count from JSONB length (no new column needed)
  jsonb_array_length(bp.menu_preview) as featured_items_count,
  
  -- Count approved offers for Lite tier (DISPLAY ONLY - badge showing "1 offer")
  -- CRITICAL: Use 'approved' status to match business_offers_chat_eligible logic
  -- DO NOT use business_offers_chat_eligible view for counting - this is raw table query
  (SELECT COUNT(*) 
   FROM business_offers 
   WHERE business_id = bp.id 
   AND status = 'approved' 
   AND (offer_end_date IS NULL OR offer_end_date >= NOW())
  ) as approved_offers_count

FROM business_profiles bp
WHERE 
  bp.status = 'claimed_free'
  AND bp.business_tier = 'free_tier'
  AND (bp.menu_preview IS NOT NULL AND jsonb_array_length(bp.menu_preview) >= 1)
  AND bp.city IS NOT NULL
  AND bp.latitude IS NOT NULL
  AND bp.longitude IS NOT NULL;

COMMENT ON VIEW business_profiles_lite_eligible IS
  'Tier 2: Claimed-free businesses with at least 1 featured item. Now includes business_tagline and business_description for rich, conversational chat responses. Used by chat for text-only mentions below paid/trial (Tier 1). View returns full data; app layer renders as text (no carousel cards). Monetization: carousel cards are paid-only, free tier gets text mentions. Max 5 featured items allowed per business (enforced by DB constraint). Max 3 businesses shown in chat as text bullets.';

-- Grant permissions (same as before)
GRANT SELECT ON business_profiles_lite_eligible TO authenticated, anon, service_role;
