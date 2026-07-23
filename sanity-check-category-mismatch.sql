-- ============================================================================
-- READ-ONLY sanity check: system_category vs Google's real classification
-- ============================================================================
-- Purpose: quantify how many imported businesses have a system_category that
-- disagrees with what Google's primary type says they actually are.
--
-- WHY THIS MATTERS
--   system_category drives placeholder images, AI category filtering, featured-
--   item labels and vibe defaults. display_category (the visible label) is taken
--   straight from Google's primary_type, so when the two disagree you get things
--   like a bar_and_grill filed as "cafe" (coffee-cup placeholder, wrong AI match).
--
-- This script performs NO writes. It only SELECTs. Run each section and read the
-- results before we decide on a fix / backfill.
--
-- Heuristic: we derive an "expected" system_category from google_primary_type
-- using the same intent as lib/constants/category-mapping.ts. It's a best-effort
-- map of the common types — anything unknown is left as 'unknown' and NOT counted
-- as a mismatch, so the mismatch count is conservative (real number may be higher).
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Section 1: overall counts of the population we care about
-- ---------------------------------------------------------------------------
select
  '1_population' as section,
  count(*) as total_auto_imported_unclaimed
from public.business_profiles
where auto_imported = true
  and status = 'unclaimed';


-- ---------------------------------------------------------------------------
-- Section 2: distribution of system_category vs google_primary_type
-- (eyeball obvious mismatches, e.g. system_category=cafe / primary=bar_and_grill)
-- ---------------------------------------------------------------------------
select
  '2_combos' as section,
  system_category,
  google_primary_type,
  display_category,
  count(*) as businesses
from public.business_profiles
where auto_imported = true
  and status = 'unclaimed'
group by system_category, google_primary_type, display_category
order by businesses desc, system_category;


-- ---------------------------------------------------------------------------
-- Section 3: rows where the derived-from-Google category disagrees with the
-- stored system_category. This is the "blast radius" of the mis-bucketing.
-- ---------------------------------------------------------------------------
with mapped as (
  select
    id,
    business_name,
    city,
    system_category,
    google_primary_type,
    display_category,
    case
      -- bars / pubs / nightlife
      when google_primary_type in (
        'bar','pub','night_club','cocktail_bar','wine_bar','sports_bar',
        'dive_bar','lounge','gastropub','beer_garden','irish_pub','bar_and_grill'
      ) then case
             when google_primary_type in ('pub','gastropub','irish_pub') then 'pub'
             else 'bar'
           end
      -- anything ending in _restaurant, plus common food-service primaries
      when google_primary_type like '%restaurant%'
        or google_primary_type in (
          'steak_house','sushi_restaurant','ramen_restaurant','hamburger_restaurant',
          'pizza_restaurant','bistro','fine_dining_restaurant','meal_delivery',
          'food_court','diner'
        ) then 'restaurant'
      when google_primary_type in ('meal_takeaway','fast_food_restaurant') then 'fast_food'
      when google_primary_type in ('cafe','coffee_shop') then 'cafe'
      when google_primary_type = 'bakery' then 'bakery'
      when google_primary_type in ('ice_cream_shop','dessert_shop','dessert_restaurant','chocolate_shop','candy_store') then 'dessert'
      when google_primary_type in ('hair_salon','beauty_salon','nail_salon') then 'salon'
      when google_primary_type in ('barber_shop','barber') then 'barber'
      when google_primary_type in ('spa','wellness_center','massage','sauna') then 'wellness'
      when google_primary_type in ('gym','fitness_center') then 'fitness'
      when google_primary_type in ('tattoo_parlor','tattoo') then 'tattoo'
      when google_primary_type in ('lodging','hotel','resort_hotel','bed_and_breakfast') then 'hotel'
      else 'unknown'
    end as expected_system_category
  from public.business_profiles
  where auto_imported = true
    and status = 'unclaimed'
)
select
  '3_mismatches' as section,
  city,
  system_category as stored,
  expected_system_category as expected_from_google,
  google_primary_type,
  display_category,
  business_name
from mapped
where expected_system_category <> 'unknown'
  and expected_system_category <> system_category
order by city, system_category, google_primary_type;


-- ---------------------------------------------------------------------------
-- Section 4: mismatch summary counts (how big is this really?)
-- ---------------------------------------------------------------------------
with mapped as (
  select
    system_category,
    google_primary_type,
    case
      when google_primary_type in (
        'bar','pub','night_club','cocktail_bar','wine_bar','sports_bar',
        'dive_bar','lounge','gastropub','beer_garden','irish_pub','bar_and_grill'
      ) then case
             when google_primary_type in ('pub','gastropub','irish_pub') then 'pub'
             else 'bar'
           end
      when google_primary_type like '%restaurant%'
        or google_primary_type in (
          'steak_house','sushi_restaurant','ramen_restaurant','hamburger_restaurant',
          'pizza_restaurant','bistro','fine_dining_restaurant','meal_delivery',
          'food_court','diner'
        ) then 'restaurant'
      when google_primary_type in ('meal_takeaway','fast_food_restaurant') then 'fast_food'
      when google_primary_type in ('cafe','coffee_shop') then 'cafe'
      when google_primary_type = 'bakery' then 'bakery'
      when google_primary_type in ('ice_cream_shop','dessert_shop','dessert_restaurant','chocolate_shop','candy_store') then 'dessert'
      when google_primary_type in ('hair_salon','beauty_salon','nail_salon') then 'salon'
      when google_primary_type in ('barber_shop','barber') then 'barber'
      when google_primary_type in ('spa','wellness_center','massage','sauna') then 'wellness'
      when google_primary_type in ('gym','fitness_center') then 'fitness'
      when google_primary_type in ('tattoo_parlor','tattoo') then 'tattoo'
      when google_primary_type in ('lodging','hotel','resort_hotel','bed_and_breakfast') then 'hotel'
      else 'unknown'
    end as expected_system_category
  from public.business_profiles
  where auto_imported = true
    and status = 'unclaimed'
)
select
  '4_summary' as section,
  count(*) filter (where expected_system_category <> 'unknown' and expected_system_category <> system_category) as clear_mismatches,
  count(*) filter (where expected_system_category = 'unknown') as unknown_google_type,
  count(*) as total
from mapped;
