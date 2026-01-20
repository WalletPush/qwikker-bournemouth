# ✅ ATOMIC BUSINESS APPROVAL WITH TRIAL — IMPLEMENTATION

**Date:** 2026-01-20  
**Status:** ✅ IMPLEMENTED

---

## GOAL

Ensure trial entitlements start ONLY when a business is approved, and that NO business has `business_tier='free_trial'` without a corresponding `business_subscriptions` row.

---

## PROBLEM

**Before:**
- Admin approves business → only `business_profiles.status` updated
- `business_tier` and `business_subscriptions` created separately (or not at all)
- **Risk:** Approved businesses with paid tiers but no subscription row
- **Risk:** Unapproved businesses with subscription rows

---

## SOLUTION

### 1. Atomic RPC Function

**File:** `/supabase/functions/approve_business_with_trial.sql`

**Migration:** `/supabase/migrations/20260120000000_atomic_approval_with_trial.sql`

**Function:** `approve_business_with_trial(p_business_id, p_approved_by, p_manual_override, p_manual_override_by)`

**What it does:**
1. Looks up trial tier from `subscription_tiers` (tier_name='trial')
2. Gets trial duration from `subscription_tiers.features->>'trial_days'` (fallback: 90 days)
3. **Atomically**:
   - Updates `business_profiles.status = 'approved'`
   - Sets `business_profiles.business_tier = 'free_trial'`
   - Sets `business_profiles.plan = 'featured'`
   - Inserts `business_subscriptions` row with:
     - `tier_id` = trial tier ID
     - `status = 'trial'`
     - `is_in_free_trial = true`
     - `free_trial_start_date = NOW()`
     - `free_trial_end_date = NOW() + trial_days`
4. Returns success with trial info

**SQL to Run:**
```bash
cd /Users/qwikker/qwikkerdashboard
psql YOUR_DB_URL < supabase/migrations/20260120000000_atomic_approval_with_trial.sql
# OR via Supabase CLI:
supabase db push
```

---

### 2. Updated Approval Route

**File:** `/app/api/admin/approve-business/route.ts`

**Changes (Lines 72-110):**

**BEFORE:**
```typescript
const { data, error } = await supabaseAdmin
  .from('business_profiles')
  .update(updateData)
  .eq('id', businessId)
  .select()
  .single()
```

**AFTER:**
```typescript
const { data: rpcResult, error: rpcError } = await supabaseAdmin
  .rpc('approve_business_with_trial', {
    p_business_id: businessId,
    p_approved_by: user.id,
    p_manual_override: profile.verification_method === 'manual' && manualOverride === true,
    p_manual_override_by: profile.verification_method === 'manual' && manualOverride === true ? user.id : null
  })
```

**Impact:**
- ✅ Approval + trial creation is now atomic
- ✅ Cannot approve without creating subscription
- ✅ Trial days come from `subscription_tiers` table
- ✅ Returns trial info in response

---

### 3. Guard in updateBusinessTier

**File:** `/lib/actions/admin-crm-actions.ts`

**Added (Lines 607-622):**

```typescript
// ✅ LOCKDOWN: Guard against setting paid tiers for unapproved businesses
const { data: businessProfile, error: profileFetchError } = await supabaseAdmin
  .from('business_profiles')
  .select('status, business_name')
  .eq('id', businessId)
  .single()

if (profileFetchError || !businessProfile) {
  return { success: false, error: 'Business profile not found' }
}

// Enforce: paid tiers ONLY for approved businesses
const paidTiers = ['trial', 'featured', 'spotlight']
if (paidTiers.includes(selectedTier) && businessProfile.status !== 'approved') {
  return { 
    success: false, 
    error: `Cannot assign paid tier to unapproved business. Current status: ${businessProfile.status}` 
  }
}
```

**Impact:**
- ✅ Prevents setting `trial/featured/spotlight` for unapproved businesses
- ✅ Forces admin to approve first, which triggers atomic trial creation
- ✅ Ensures consistency: paid tier ⇒ approved status + subscription row

---

### 4. Drift Detector SQL

**File:** `/supabase/functions/detect_entitlement_drift.sql`

**3 Queries:**

#### Query 1: Critical Drift Cases
Finds businesses with:
- Paid tier (`free_trial`, `featured`, `qwikker_picks`, `spotlight`) but NO subscription row
- Unapproved status but HAS subscription row
- Expired trials still marked as `free_trial`

#### Query 2: Summary Stats
Counts:
- Total businesses
- Paid tier businesses
- Paid tier WITHOUT subscription (🚨 critical)
- Unapproved WITH subscription (🚨 critical)
- Expired trials still active (⚠️ warning)

#### Query 3: Detailed Drift Report
Lists ALL drift cases with:
- Drift type classification
- Business details
- Issue description
- Recommended action

**How to Run:**
```sql
-- Via psql:
psql YOUR_DB_URL < supabase/functions/detect_entitlement_drift.sql

-- Or copy/paste queries into Supabase SQL Editor
```

**Recommended:** Run weekly, fix any results immediately.

---

## FILES CHANGED

### New Files:
1. `/supabase/functions/approve_business_with_trial.sql` (91 lines)
2. `/supabase/migrations/20260120000000_atomic_approval_with_trial.sql` (91 lines)
3. `/supabase/functions/detect_entitlement_drift.sql` (193 lines)
4. `/ATOMIC_APPROVAL_IMPLEMENTATION.md` (this file)

### Modified Files:
1. `/app/api/admin/approve-business/route.ts` (lines 72-110)
   - Replaced direct update with RPC call
   - Added trial info to response
   
2. `/lib/actions/admin-crm-actions.ts` (lines 604-622)
   - Added guard against unapproved paid tiers
   - Prevents inconsistent state

---

## TESTING CHECKLIST

### Test 1: New Business Approval
1. **Setup:** Create a business in `pending_review` status
2. **Action:** Approve via admin dashboard
3. **Expected:**
   - ✅ `business_profiles.status = 'approved'`
   - ✅ `business_profiles.business_tier = 'free_trial'`
   - ✅ `business_profiles.plan = 'featured'`
   - ✅ `business_subscriptions` row created with:
     - `status = 'trial'`
     - `is_in_free_trial = true`
     - `free_trial_start_date = NOW()`
     - `free_trial_end_date = NOW() + 90 days`

### Test 2: Guard Against Unapproved Paid Tier
1. **Setup:** Create a business in `pending_review` status
2. **Action:** Try to set tier to `featured` via admin CRM
3. **Expected:**
   - ❌ Error: "Cannot assign paid tier to unapproved business"
   - ✅ Tier remains unchanged

### Test 3: Drift Detector
1. **Action:** Run drift detector SQL
2. **Expected:**
   - ✅ Zero results in Query 1 (no critical drift)
   - ✅ "Paid tier WITHOUT subscription" = 0
   - ✅ "Unapproved WITH subscription" = 0

---

## ROLLBACK PLAN

If the patch causes issues:

```sql
-- 1. Drop the RPC function
DROP FUNCTION IF EXISTS approve_business_with_trial;

-- 2. Revert approve-business route
git checkout HEAD -- app/api/admin/approve-business/route.ts

-- 3. Revert admin-crm-actions guard
git checkout HEAD -- lib/actions/admin-crm-actions.ts
```

Then approve businesses manually:
```sql
-- Manual approval (old way)
UPDATE business_profiles
SET status = 'approved',
    approved_by = 'USER_ID',
    approved_at = NOW()
WHERE id = 'BUSINESS_ID';

-- Then manually create subscription
INSERT INTO business_subscriptions (business_id, tier_id, status, is_in_free_trial, free_trial_start_date, free_trial_end_date)
VALUES ('BUSINESS_ID', (SELECT id FROM subscription_tiers WHERE tier_name='trial'), 'trial', true, NOW(), NOW() + INTERVAL '90 days');
```

---

## BENEFITS

1. ✅ **Atomic Operations:** Approval + trial creation cannot be separated
2. ✅ **Data Integrity:** No paid tier without subscription row
3. ✅ **Consistency:** Approval always creates trial, never partial state
4. ✅ **Drift Detection:** SQL queries catch any bad states
5. ✅ **Guard Logic:** Prevents admin mistakes (unapproved paid tiers)
6. ✅ **Minimal Change:** Only 2 files modified, 3 new SQL files

---

## NEXT STEPS

1. ✅ **Run migration:** Apply the RPC function to production
2. ✅ **Test approval flow:** Approve a test business, verify subscription created
3. ✅ **Run drift detector:** Check for any existing bad states
4. ✅ **Fix any drift:** If drift detected, manually fix or downgrade tiers
5. ✅ **Monitor:** Run drift detector weekly/monthly

---

**END OF IMPLEMENTATION**
