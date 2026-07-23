-- ============================================================================
-- Backfill: correct system_category from Google's authoritative primary type
-- ============================================================================
-- Context / root cause
--   The importer computed the correct system_category from Google's types
--   (lib/constants/system-categories.ts -> mapGoogleTypesToSystemCategory) but
--   the INSERT stored the admin's import *bucket* instead. Result: businesses
--   whose real Google type differed from the batch bucket were mis-filed — e.g.
--   a "bar_and_grill" stored as "cafe" — which drives the wrong placeholder
--   image and the wrong AI category, while display_category (from Google) was
--   correct. The importer is fixed going forward; this repairs existing rows.
--
-- Scope (deliberately conservative)
--   * Only auto_imported = true AND status = 'unclaimed' (the discover/AI pool;
--     never touches claimed businesses that owners may have categorised).
--   * Only when Google's primary type maps CONFIDENTLY to a system_category.
--     Ambiguous types (hair_salon vs salon, physio/chiro health vs wellness,
--     generic 'service'/'store'/null, etc.) are intentionally left untouched.
--   * Only rows where the derived category actually DIFFERS from what's stored.
--
-- Placeholder images: we do NOT touch placeholder_variant — the app's
-- getPlaceholderVariationWithOverride wraps the index modulo the new category's
-- image count, so the picture automatically comes from the corrected category.
--
-- Idempotent: re-running changes nothing further (derived == stored afterwards).
-- Run preview-system-category-backfill.sql FIRST to see exactly what will change.
-- ============================================================================

update public.business_profiles as bp
set
  system_category = d.derived,
  business_type = d.derived
from (
  select
    id,
    case
      -- pubs
      when google_primary_type in ('pub', 'gastropub', 'irish_pub') then 'pub'
      -- bars / nightlife
      when google_primary_type in ('bar', 'night_club', 'wine_bar', 'cocktail_bar', 'sports_bar', 'dive_bar', 'lounge') then 'bar'
      -- fast food / takeaway (must come before the generic *restaurant catch)
      when google_primary_type = 'fast_food_restaurant' then 'fast_food'
      when google_primary_type = 'meal_takeaway' then 'takeaway'
      -- bar & grill: food-led hybrid — treat as restaurant for appetising imagery
      when google_primary_type = 'bar_and_grill' then 'restaurant'
      -- any *_restaurant (greek_restaurant, italian_restaurant, …) + plain restaurant
      when google_primary_type like '%restaurant' then 'restaurant'
      when google_primary_type in ('cafeteria', 'snack_bar', 'diner', 'bistro') then 'restaurant'
      -- cafes
      when google_primary_type in ('cafe', 'coffee_shop') then 'cafe'
      -- bakeries
      when google_primary_type in ('bakery', 'pastry_shop', 'confectionery') then 'bakery'
      -- desserts
      when google_primary_type in ('ice_cream_shop', 'dessert_shop', 'chocolate_shop', 'candy_store') then 'dessert'
      -- salons (beauty/nail — NOT hair_salon, which is ambiguous vs barber)
      when google_primary_type in ('beauty_salon', 'nail_salon') then 'salon'
      -- barber
      when google_primary_type = 'barber_shop' then 'barber'
      -- fitness
      when google_primary_type in ('gym', 'fitness_center', 'yoga_studio', 'pilates_studio') then 'fitness'
      -- hotels
      when google_primary_type in ('hotel', 'resort_hotel', 'lodging', 'motel', 'bed_and_breakfast') then 'hotel'
      -- retail
      when google_primary_type in ('clothing_store', 'womens_clothing_store', 'mens_clothing_store', 'jewelry_store', 'shoe_store', 'gift_shop', 'home_goods_store', 'shopping_mall', 'souvenir_store') then 'retail'
      -- sports / outdoors
      when google_primary_type in ('sporting_goods_store', 'sports_club', 'sports_complex', 'sports_activity_location') then 'sports'
      -- tours & activities
      when google_primary_type in ('travel_agency', 'tour_agency', 'tour_operator') then 'tours_activities'
      -- rentals
      when google_primary_type in ('car_rental', 'bicycle_rental', 'boat_rental', 'motorcycle_rental') then 'rental'
      -- entertainment / attractions
      when google_primary_type in ('museum', 'art_museum', 'history_museum', 'art_gallery', 'tourist_attraction', 'historical_landmark', 'water_park', 'amusement_center', 'amusement_park', 'video_arcade', 'scenic_spot', 'movie_theater', 'bowling_alley') then 'entertainment'
      -- venues / event spaces
      when google_primary_type in ('event_venue', 'banquet_hall', 'wedding_venue', 'conference_center', 'auditorium') then 'venue'
      -- everything else: leave untouched (ambiguous / not confidently classifiable)
      else null
    end as derived
  from public.business_profiles
  where auto_imported = true
    and status = 'unclaimed'
) as d
where bp.id = d.id
  and d.derived is not null
  and d.derived <> bp.system_category;
