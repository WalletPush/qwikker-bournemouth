# CHAT LOCKDOWN IMPLEMENTATION

**Date:** 2026-01-20  
**Status:** ✅ COMPLETE  
**Objective:** Ensure NO free listings appear in AI chat. Only approved + subscribed businesses.

---

## 🎯 PROBLEM SOLVED

### Before (❌ BROKEN):
1. Chat code used `business_profiles.business_tier` (stale UI column)
2. Used `business_profiles_ai_eligible` view (filtered by `business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended')`)
3. No subscription validation
4. Tier lookup bug: `updateBusinessTier('trial')` fetched 'starter' tier_id, causing NEON NEXUS bug

### After (✅ FIXED):
1. Created `business_profiles_chat_eligible` view with subscription-based eligibility
2. View computes `effective_tier` from `business_subscriptions` + `subscription_tiers`
3. Enforces: `status='approved'` + valid subscription + (paid active OR trial active)
4. Fixed tier lookup bug: now uses correct `tier_name='trial'` for trials
5. Added guard: prevents `is_in_free_trial=true` with wrong tier_id

---

## 📋 CHAT ELIGIBILITY RULES

### ✅ INCLUDED (Chat-Eligible):
1. **Spotlight (Qwikker Picks):**
   - `subscription.status = 'active'`
   - `subscription.is_in_free_trial = false`
   - `subscription_tiers.tier_name = 'spotlight'`
   - `current_period_end IS NULL OR >= NOW()`

2. **Featured (Paid):**
   - `subscription.status = 'active'`
   - `subscription.is_in_free_trial = false`
   - `subscription_tiers.tier_name = 'featured'`
   - `current_period_end IS NULL OR >= NOW()`

3. **Trial Active (Shows as Featured):**
   - `subscription.status = 'trial'`
   - `subscription.is_in_free_trial = true`
   - `subscription.free_trial_end_date >= NOW()`
   - (Note: treated as 'featured' for display, but `sub_tier_name='trial'`)

4. **Starter (Paid):**
   - `subscription.status = 'active'`
   - `subscription.is_in_free_trial = false`
   - `subscription_tiers.tier_name = 'starter'`
   - `current_period_end IS NULL OR >= NOW()`

### ❌ EXCLUDED (NOT Chat-Eligible):
1. **No Subscription:** `business_subscriptions` row doesn't exist
2. **Unapproved:** `business_profiles.status != 'approved'`
3. **Explicit Exclusions:** `status IN ('unclaimed', 'pending_claim', 'claimed_free', 'incomplete')`
4. **Trial Expired:** `is_in_free_trial=true AND free_trial_end_date < NOW()`
5. **Paid Lapsed:** `status='active' AND current_period_end < NOW()`
6. **Cancelled:** `status='cancelled'`
7. **Suspended:** `status='suspended'`

---

## 🗂️ FILES CHANGED

### 1. **`/supabase/migrations/20260120000001_fix_trial_tier_mismatch.sql`**
- **Purpose:** Fix NEON NEXUS bug where `is_in_free_trial=true` but `tier_id` points to 'starter'
- **Action:** Updates all mismatched records to use correct 'trial' tier_id
- **Effect:** Fixes existing data inconsistencies

### 2. **`/supabase/migrations/20260120000002_chat_eligible_view.sql`**
- **Purpose:** Create subscription-based chat eligibility view
- **Key Features:**
  - Joins `business_profiles` + `business_subscriptions` + `subscription_tiers`
  - Computes `effective_tier` from subscriptions (NOT from `business_tier` column)
  - Computes `tier_priority` for sorting (1=spotlight, 2=featured/trial, 3=starter)
  - Filters to ONLY return chat-eligible businesses
- **Replaces:** `business_profiles_ai_eligible` (which was based on stale `business_tier` column)

### 3. **`/lib/actions/admin-crm-actions.ts`**
- **Line 633 (FIXED):** Changed `.eq('tier_name', selectedTier === 'trial' ? 'starter' : selectedTier)` to `.eq('tier_name', selectedTier)`
- **Lines 644-654 (ADDED):** Guard that enforces `is_in_free_trial=true` requires `tier_name='trial'`
- **Effect:** Prevents future NEON NEXUS-style bugs

### 4. **`/lib/ai/hybrid-chat.ts`**
- **Line 594:** Changed `.from('business_profiles_ai_eligible')` to `.from('business_profiles_chat_eligible')`
- **Line 601:** Changed `business_tier` to `effective_tier, tier_priority`
- **Line 650:** Map `effective_tier` to `business_tier` for frontend compatibility
- **Lines 660-671:** Use `tier_priority` from view for sorting (removed manual priority map)
- **Effect:** Chat now uses subscription-based eligibility

### 5. **`/lib/ai/chat.ts`**
- **Line 1027:** Changed `.from('business_profiles')` to `.from('business_profiles_chat_eligible')`
- **Line 1036:** Changed `business_tier` to `effective_tier, tier_priority`
- **Lines 1042-1052:** Removed `.in('business_tier', ['qwikker_picks', 'featured'])` filter (view already filters)
- **Lines 1062-1073:** Use `tier_priority` from view for sorting
- **Line 1076:** Changed `'qwikker_picks'` to `'spotlight'` for consistency
- **Effect:** Legacy chat now uses subscription-based eligibility

---

## 🧪 VERIFICATION QUERIES

### Query 1: Check View Works (Should Return Only Eligible Businesses)
```sql
SELECT 
  effective_tier,
  COUNT(*) AS num_businesses,
  string_agg(DISTINCT status, ', ') AS statuses
FROM business_profiles_chat_eligible
GROUP BY effective_tier
ORDER BY effective_tier;
```

**Expected Output:**
| effective_tier | num_businesses | statuses |
|----------------|----------------|----------|
| featured       | X              | approved |
| spotlight      | Y              | approved |
| starter        | Z              | approved |

**✅ PASS IF:** All businesses have `status='approved'` and `effective_tier IN ('spotlight', 'featured', 'starter')`

---

### Query 2: Verify NO Free Listings (Should Return 0)
```sql
SELECT COUNT(*) AS free_listings_count
FROM business_profiles_chat_eligible
WHERE effective_tier IS NULL
   OR sub_tier_name IS NULL
   OR status != 'approved';
```

**Expected Output:**
| free_listings_count |
|---------------------|
| 0                   |

**✅ PASS IF:** `free_listings_count = 0`

---

### Query 3: Verify NO Expired Trials (Should Return 0)
```sql
SELECT COUNT(*) AS expired_trials_count
FROM business_profiles_chat_eligible
WHERE is_in_free_trial = true
  AND free_trial_end_date < NOW();
```

**Expected Output:**
| expired_trials_count |
|----------------------|
| 0                    |

**✅ PASS IF:** `expired_trials_count = 0`

---

### Query 4: Compare Before/After (Bucket Count)
```sql
-- BEFORE (business_profiles_ai_eligible - stale tier)
WITH old_view AS (
  SELECT COUNT(*) AS n 
  FROM business_profiles 
  WHERE business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended')
    AND latitude IS NOT NULL 
    AND longitude IS NOT NULL
),
-- AFTER (business_profiles_chat_eligible - subscription-based)
new_view AS (
  SELECT COUNT(*) AS n 
  FROM business_profiles_chat_eligible
)
SELECT 
  old_view.n AS old_count,
  new_view.n AS new_count,
  (old_view.n - new_view.n) AS excluded_count,
  ROUND((new_view.n::NUMERIC / old_view.n * 100), 1) AS percent_kept
FROM old_view, new_view;
```

**Expected Output:**
| old_count | new_count | excluded_count | percent_kept |
|-----------|-----------|----------------|--------------|
| 215       | 165       | 50             | 76.7%        |

**✅ PASS IF:** `new_count < old_count` (we're now stricter) and `excluded_count` represents expired trials + unclaimed + no subscription

---

### Query 5: Identify Excluded Businesses (For Audit)
```sql
SELECT 
  bp.id,
  bp.business_name,
  bp.city,
  bp.status AS bp_status,
  bp.business_tier AS bp_tier_stale,
  CASE
    WHEN ls.business_id IS NULL THEN 'NO_SUBSCRIPTION'
    WHEN bp.status != 'approved' THEN 'NOT_APPROVED'
    WHEN ls.is_in_free_trial = true AND ls.free_trial_end_date < NOW() THEN 'TRIAL_EXPIRED'
    WHEN bp.status IN ('unclaimed','pending_claim','claimed_free','incomplete') THEN 'EXCLUDED_STATUS'
    ELSE 'OTHER'
  END AS exclusion_reason
FROM business_profiles bp
LEFT JOIN (
  SELECT DISTINCT ON (business_id)
    business_id,
    tier_id,
    status,
    is_in_free_trial,
    free_trial_end_date
  FROM business_subscriptions
  ORDER BY business_id, updated_at DESC
) ls ON ls.business_id = bp.id
WHERE bp.id NOT IN (SELECT id FROM business_profiles_chat_eligible)
  AND bp.business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended')
ORDER BY exclusion_reason, bp.business_name;
```

**✅ PASS IF:** All excluded businesses have valid `exclusion_reason` (not 'OTHER')

---

### Query 6: Verify Tier Priority Correctness
```sql
SELECT 
  business_name,
  effective_tier,
  tier_priority,
  sub_status,
  is_in_free_trial,
  CASE
    WHEN effective_tier = 'spotlight' AND tier_priority != 1 THEN '❌ WRONG PRIORITY'
    WHEN effective_tier = 'featured' AND tier_priority != 2 THEN '❌ WRONG PRIORITY'
    WHEN effective_tier = 'starter' AND tier_priority != 3 THEN '❌ WRONG PRIORITY'
    ELSE '✅ OK'
  END AS validation
FROM business_profiles_chat_eligible
ORDER BY tier_priority, rating DESC NULLS LAST
LIMIT 20;
```

**✅ PASS IF:** All rows show `validation = '✅ OK'`

---

## 🔍 MANUAL TEST CHECKLIST

### Test 1: Verify NEON NEXUS Fixed
```sql
-- Before fix: Should show tier_name='starter' (WRONG)
-- After fix: Should show tier_name='trial' (CORRECT)
SELECT 
  bp.business_name,
  st.tier_name,
  bs.status,
  bs.is_in_free_trial,
  bs.free_trial_end_date
FROM business_profiles bp
JOIN business_subscriptions bs ON bs.business_id = bp.id
LEFT JOIN subscription_tiers st ON st.id = bs.tier_id
WHERE bp.business_name = 'NEON NEXUS';
```

**✅ PASS IF:** `tier_name = 'trial'` and `is_in_free_trial = true`

---

### Test 2: Verify Imported Free Listings Excluded
```sql
-- Should return 0 (imported unclaimed businesses should NOT appear in chat view)
SELECT COUNT(*)
FROM business_profiles_chat_eligible
WHERE auto_imported = true
  AND status IN ('unclaimed', 'pending_claim');
```

**✅ PASS IF:** Count = 0

---

### Test 3: Verify Trial Active Shows As Featured
```sql
SELECT 
  business_name,
  effective_tier,
  sub_tier_name,
  is_in_free_trial,
  free_trial_end_date
FROM business_profiles_chat_eligible
WHERE is_in_free_trial = true
ORDER BY free_trial_end_date DESC;
```

**✅ PASS IF:** 
- `effective_tier = 'featured'` (for display)
- `sub_tier_name = 'trial'` (underlying subscription)
- `free_trial_end_date >= NOW()`

---

### Test 4: Test Admin Tier Update (No More NEON NEXUS Bug)
1. Go to admin CRM
2. Select a business
3. Change tier to "Free Trial"
4. Click Save
5. Check console logs for: `✅ Tier ID found: [uuid] for tier_name: trial`
6. Run SQL:
```sql
SELECT 
  st.tier_name,
  bs.status,
  bs.is_in_free_trial
FROM business_subscriptions bs
JOIN subscription_tiers st ON st.id = bs.tier_id
WHERE bs.business_id = '[business_id]';
```

**✅ PASS IF:** `tier_name = 'trial'` and `status = 'trial'` and `is_in_free_trial = true`

---

## 📊 BEFORE/AFTER COMPARISON

| Aspect | Before (❌) | After (✅) |
|--------|------------|----------|
| **Data Source** | `business_profiles.business_tier` (stale) | `business_subscriptions` + `subscription_tiers` (live) |
| **View Used** | `business_profiles_ai_eligible` | `business_profiles_chat_eligible` |
| **Eligibility Logic** | `business_tier IN (...)` | Subscription-based (status, dates, tier_id) |
| **Free Listings** | Could leak if `business_tier` set wrong | Guaranteed excluded (no subscription = no chat) |
| **Expired Trials** | Could appear if `business_tier` not updated | Guaranteed excluded (date check in view) |
| **Tier Sorting** | Manual priority map in code | Computed `tier_priority` in view |
| **Trial Creation Bug** | Created `tier_id` for 'starter' when 'trial' selected | Fixed: uses correct 'trial' tier_id |
| **Guard** | None | Enforces `is_in_free_trial=true` requires `tier_name='trial'` |

---

## 🚀 DEPLOYMENT CHECKLIST

### Step 1: Apply Migrations
```bash
cd /Users/qwikker/qwikkerdashboard

# Apply tier mismatch fix (fixes NEON NEXUS)
psql YOUR_DB_URL < supabase/migrations/20260120000001_fix_trial_tier_mismatch.sql

# Apply chat eligibility view (creates new view)
psql YOUR_DB_URL < supabase/migrations/20260120000002_chat_eligible_view.sql

# OR via Supabase CLI:
supabase db push
```

### Step 2: Verify Migrations Applied
```sql
-- Check view exists
SELECT COUNT(*) FROM business_profiles_chat_eligible;

-- Check NEON NEXUS fixed (if it exists)
SELECT business_name, tier_name 
FROM business_subscriptions bs
JOIN subscription_tiers st ON st.id = bs.tier_id
JOIN business_profiles bp ON bp.id = bs.business_id
WHERE bp.business_name = 'NEON NEXUS';
```

### Step 3: Run Verification Queries (Above)
- Run Query 1-6 from "Verification Queries" section
- All must PASS

### Step 4: Test in Browser
1. Open QWIKKER app
2. Go to chat
3. Ask: "Show me cafes"
4. Check browser console logs for:
   - `🎠 Tier distribution: ...` (should show only spotlight/featured/starter, NO free_tier)
   - `🗺️ Built business carousel with X UNIQUE businesses`
5. Verify no unclaimed/imported businesses appear

### Step 5: Deploy to Production
```bash
git add .
git commit -m "feat: chat lockdown with subscription-based eligibility

- Fix trial tier mismatch bug (NEON NEXUS)
- Create business_profiles_chat_eligible view
- Update hybrid-chat.ts and chat.ts to use new view
- Add guard to prevent tier/subscription inconsistency
- Verify NO free listings appear in chat"

git push origin main
```

---

## 🔧 MAINTENANCE

### Daily Check (Optional)
```sql
-- Run Query 2 (Verify NO Free Listings) daily
SELECT COUNT(*) AS free_listings_count
FROM business_profiles_chat_eligible
WHERE effective_tier IS NULL OR sub_tier_name IS NULL OR status != 'approved';
```

If this ever returns > 0, investigate immediately.

### When Adding New Tiers
1. Add to `subscription_tiers` table
2. Update `business_profiles_chat_eligible` view's `effective_tier` CASE statement
3. Update `tier_priority` CASE statement
4. Re-run verification queries

---

## ✅ COMPLETION STATUS

| Task | Status |
|------|--------|
| Fix tier lookup bug (line 633) | ✅ COMPLETE |
| Add trial tier guard | ✅ COMPLETE |
| Create backfill SQL (NEON NEXUS fix) | ✅ COMPLETE |
| Create subscription-based chat view | ✅ COMPLETE |
| Update hybrid-chat.ts | ✅ COMPLETE |
| Update legacy chat.ts | ✅ COMPLETE |
| Create verification queries | ✅ COMPLETE |
| Document implementation | ✅ COMPLETE |

**Date Completed:** 2026-01-20  
**Ready for deployment:** ✅ YES

---

## 📞 SUPPORT

If chat shows unexpected businesses:
1. Run Query 5 (Identify Excluded Businesses) to see why they were excluded
2. Check business in admin CRM to see subscription status
3. Run drift detector: `/supabase/functions/detect_entitlement_drift.sql`
4. Check logs for tier_id vs tier_name consistency

**Contact:** Technical team for deployment support
