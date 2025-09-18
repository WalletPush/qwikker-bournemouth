-- Fix the incomplete offer_claim_amount check constraint
-- Remove the incomplete constraint and add the proper one

-- Drop the incomplete constraint
alter table public.profiles
drop constraint if exists profiles_offer_claim_amount_check;

-- Add the proper constraint with valid values
alter table public.profiles
add constraint profiles_offer_claim_amount_check 
check (offer_claim_amount in ('single', 'multiple'));
