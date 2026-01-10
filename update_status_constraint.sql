-- Update the status constraint to include free tier statuses
-- FIX: SMART migration used wrong constraint name (business_profiles_status_check vs profiles_status_check)

DO $$ 
BEGIN
  -- Drop the old constraint (using correct name!)
  ALTER TABLE business_profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
  RAISE NOTICE '✅ Dropped old profiles_status_check constraint';

  -- Add the new constraint with ALL statuses (existing + new free tier)
  ALTER TABLE business_profiles ADD CONSTRAINT profiles_status_check 
    CHECK (status IN (
      -- EXISTING statuses (from founding member flow)
      'incomplete',         -- Filling out profile
      'pending_review',     -- Submitted for admin review
      'approved',           -- Live on platform (your current 9 businesses!)
      'rejected',           -- Admin rejected
      'live',               -- Alternative for approved
      
      -- NEW free tier statuses (for Google Places imports)
      'unclaimed',          -- Imported from Google, not yet claimed
      'pending_claim',      -- Claim submitted, awaiting admin verification
      'claimed_free',       -- Claimed & approved, on free tier (discover only)
      'pending_upgrade'     -- Upgrading from free to trial/paid
    ));
  
  RAISE NOTICE '✅ Added new profiles_status_check constraint with free tier statuses';
  RAISE NOTICE '🎉 Status constraint updated! Can now use: unclaimed, pending_claim, claimed_free, pending_upgrade';
END $$;

-- Verify the constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'profiles_status_check';

