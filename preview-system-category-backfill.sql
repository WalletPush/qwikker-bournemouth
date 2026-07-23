-- ============================================================================
-- READ-ONLY preview of migration 20260723010000_backfill_system_category_from_google
-- ============================================================================
-- Uses the EXACT same mapping as the migration. No writes. Run this first,
-- review sections 1 & 2, then apply the migration if you're happy.
-- ============================================================================

with derived as (
  select
    id,
    business_name,
    city,
    system_category as current_category,
    google_primary_type,
    display_category,
    case
      when google_primary_type in ('pub', 'gastropub', 'irish_pub') then 'pub'
      when google_primary_type in ('bar', 'night_club', 'wine_bar', 'cocktail_bar', 'sports_bar', 'dive_bar', 'lounge') then 'bar'
      when google_primary_type = 'fast_food_restaurant' then 'fast_food'
      when google_primary_type = 'meal_takeaway' then 'takeaway'
      when google_primary_type = 'bar_and_grill' then 'restaurant'
      when google_primary_type like '%restaurant' then 'restaurant'
      when google_primary_type in ('cafeteria', 'snack_bar', 'diner', 'bistro') then 'restaurant'
      when google_primary_type in ('cafe', 'coffee_shop') then 'cafe'
      when google_primary_type in ('bakery', 'pastry_shop', 'confectionery') then 'bakery'
      when google_primary_type in ('ice_cream_shop', 'dessert_shop', 'chocolate_shop', 'candy_store') then 'dessert'
      when google_primary_type in ('beauty_salon', 'nail_salon') then 'salon'
      when google_primary_type = 'barber_shop' then 'barber'
      when google_primary_type in ('gym', 'fitness_center', 'yoga_studio', 'pilates_studio') then 'fitness'
      when google_primary_type in ('hotel', 'resort_hotel', 'lodging', 'motel', 'bed_and_breakfast') then 'hotel'
      when google_primary_type in ('clothing_store', 'womens_clothing_store', 'mens_clothing_store', 'jewelry_store', 'shoe_store', 'gift_shop', 'home_goods_store', 'shopping_mall', 'souvenir_store') then 'retail'
      when google_primary_type in ('sporting_goods_store', 'sports_club', 'sports_complex', 'sports_activity_location') then 'sports'
      when google_primary_type in ('travel_agency', 'tour_agency', 'tour_operator') then 'tours_activities'
      when google_primary_type in ('car_rental', 'bicycle_rental', 'boat_rental', 'motorcycle_rental') then 'rental'
      when google_primary_type in ('museum', 'art_museum', 'history_museum', 'art_gallery', 'tourist_attraction', 'historical_landmark', 'water_park', 'amusement_center', 'amusement_park', 'video_arcade', 'scenic_spot', 'movie_theater', 'bowling_alley') then 'entertainment'
      when google_primary_type in ('event_venue', 'banquet_hall', 'wedding_venue', 'conference_center', 'auditorium') then 'venue'
      else null
    end as new_category
  from public.business_profiles
  where auto_imported = true
    and status = 'unclaimed'
)

-- Section 1: summary of what will change, grouped by the move being made
select
  '1_changes_by_move' as section,
  current_category || ' -> ' || new_category as change,
  count(*) as businesses
from derived
where new_category is not null
  and new_category <> current_category
group by current_category, new_category
order by businesses desc;

-- Section 2: the exact rows that will change (run separately / uncomment)
-- with derived as ( ...same cte... )
-- select '2_rows' as section, city, current_category, new_category, google_primary_type, display_category, business_name
-- from derived
-- where new_category is not null and new_category <> current_category
-- order by current_category, new_category, city;
