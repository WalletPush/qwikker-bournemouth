-- Make placeholder_variant nullable and reset auto-assigned variants so imported
-- businesses spread across the full placeholder art pool.
--
-- WHY: On import we used to store a fixed `placeholder_variant` computed from a
-- hash of the place id and the image count *at that time*. When a category's
-- image count was 1 (or the category wasn't yet recognised, so it fell back to
-- `default`), the hash collapsed to 0 for every business — pinning them all to
-- image `00`. Because the column is NOT NULL (default 0) and a non-null value is
-- treated as an explicit override at render time, EVERY business was effectively
-- pinned and expanding the art library never redistributed anyone.
--
-- Fix: allow NULL and use it as the "no override" sentinel. When NULL, the
-- discover feed hashes each business across the FULL current image pool
-- (getPlaceholderVariation), restoring variety and making future art additions
-- redistribute automatically. Admins pinning a specific image via the UI will
-- re-populate this column for that single business.

-- 1. Allow NULL (drop the NOT NULL constraint + the default so new rows are "auto").
alter table public.business_profiles
alter column placeholder_variant drop not null;

alter table public.business_profiles
alter column placeholder_variant drop default;

-- 2. Reset auto-imported, unclaimed businesses to NULL so they rejoin the pool.
--    Businesses with an uploaded custom image are unaffected either way (the
--    custom URL takes priority at render time), but we skip them for clarity.
update public.business_profiles
set placeholder_variant = null
where coalesce(auto_imported, false) = true
  and status = 'unclaimed'
  and placeholder_variant is not null
  and placeholder_custom_url is null;
