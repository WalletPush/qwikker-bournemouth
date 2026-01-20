-- Migration: Fix trial tier mismatch (NEON NEXUS bug)
-- Purpose: Fix business_subscriptions where is_in_free_trial=true but tier_id points to wrong tier
-- Date: 2026-01-20
-- Issue: admin-crm-actions.ts was looking up 'starter' tier when creating 'trial' subscriptions

-- ============================================================================
-- STEP 1: Identify the problem records
-- ============================================================================

DO $$
DECLARE
    v_trial_tier_id UUID;
    v_affected_count INT;
BEGIN
    -- Get the correct 'trial' tier ID
    SELECT id INTO v_trial_tier_id
    FROM subscription_tiers
    WHERE tier_name = 'trial'
    LIMIT 1;

    IF v_trial_tier_id IS NULL THEN
        RAISE EXCEPTION 'Trial tier not found in subscription_tiers';
    END IF;

    RAISE NOTICE 'Trial tier_id: %', v_trial_tier_id;

    -- Count affected records
    SELECT COUNT(*) INTO v_affected_count
    FROM business_subscriptions bs
    LEFT JOIN subscription_tiers st ON st.id = bs.tier_id
    WHERE bs.is_in_free_trial = true
      AND bs.status = 'trial'
      AND st.tier_name != 'trial';

    RAISE NOTICE 'Found % records with is_in_free_trial=true but tier_name != trial', v_affected_count;

    IF v_affected_count > 0 THEN
        RAISE NOTICE 'Affected businesses:';
        
        -- Log affected businesses
        FOR rec IN (
            SELECT 
                bp.id,
                bp.business_name,
                st.tier_name AS current_tier_name,
                bs.status,
                bs.is_in_free_trial,
                bs.free_trial_end_date
            FROM business_subscriptions bs
            LEFT JOIN subscription_tiers st ON st.id = bs.tier_id
            LEFT JOIN business_profiles bp ON bp.id = bs.business_id
            WHERE bs.is_in_free_trial = true
              AND bs.status = 'trial'
              AND st.tier_name != 'trial'
        ) LOOP
            RAISE NOTICE '  - % (%) tier_name=%, status=%, trial_end=%',
                rec.business_name,
                rec.id,
                rec.current_tier_name,
                rec.status,
                rec.free_trial_end_date;
        END LOOP;

        -- ============================================================================
        -- STEP 2: Fix the records
        -- ============================================================================

        RAISE NOTICE 'Fixing % records...', v_affected_count;

        UPDATE business_subscriptions bs
        SET 
            tier_id = v_trial_tier_id,
            updated_at = NOW()
        FROM subscription_tiers st
        WHERE st.id = bs.tier_id
          AND bs.is_in_free_trial = true
          AND bs.status = 'trial'
          AND st.tier_name != 'trial';

        RAISE NOTICE '✅ Fixed % records', v_affected_count;
    ELSE
        RAISE NOTICE '✅ No records need fixing';
    END IF;

END $$;

-- ============================================================================
-- STEP 3: Verification query
-- ============================================================================

-- This should return 0 rows after the fix
SELECT 
    bp.id,
    bp.business_name,
    bp.city,
    st.tier_name AS subscription_tier_name,
    bs.status AS subscription_status,
    bs.is_in_free_trial,
    bs.free_trial_end_date,
    CASE 
        WHEN bs.is_in_free_trial = true AND st.tier_name != 'trial' THEN '❌ MISMATCH'
        ELSE '✅ OK'
    END AS validation
FROM business_subscriptions bs
LEFT JOIN subscription_tiers st ON st.id = bs.tier_id
LEFT JOIN business_profiles bp ON bp.id = bs.business_id
WHERE bs.is_in_free_trial = true
  AND bs.status = 'trial'
ORDER BY bp.business_name;

-- ============================================================================
-- STEP 4: Add comment
-- ============================================================================

COMMENT ON TABLE business_subscriptions IS 
  'Business subscription records. ' ||
  'CRITICAL: If is_in_free_trial=true AND status=trial, then tier_id MUST resolve to tier_name=trial in subscription_tiers. ' ||
  'See: lib/actions/admin-crm-actions.ts updateBusinessTier() for enforcement guard.';
