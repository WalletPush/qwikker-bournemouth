-- Expand placeholder_variant range 0-10 -> 0-19.
-- High-volume categories now carry more variants than the old cap allowed
-- (restaurant 16, cafe 14, bar 12), so admins must be able to hand-pick any of them.

alter table business_profiles
drop constraint if exists business_profiles_placeholder_variant_check;

alter table business_profiles
add constraint business_profiles_placeholder_variant_check
check (placeholder_variant >= 0 and placeholder_variant <= 19);

comment on column business_profiles.placeholder_variant is 'Placeholder image variant ID (0-19). Different categories expose different numbers of variants (restaurant 16, cafe 14, bar 12, most others 8-10). Admins can select a variant for unclaimed businesses; auto-assignment hashes across the category''s available count.';
