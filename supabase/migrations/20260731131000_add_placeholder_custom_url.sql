-- Admin-uploaded custom placeholder image for an UNCLAIMED listing.
-- When set, it overrides the generated category placeholder everywhere the
-- business appears pre-claim. Cleared (null) => fall back to the generated pool.
-- Only meaningful while status = 'unclaimed'; once claimed, real photos win.

alter table business_profiles
add column if not exists placeholder_custom_url text;

comment on column business_profiles.placeholder_custom_url is 'Optional admin-uploaded placeholder image URL (Cloudinary) for an unclaimed listing. Overrides the generated category placeholder. Null => use the generated variant pool.';
