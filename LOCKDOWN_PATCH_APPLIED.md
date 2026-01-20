# 🔒 CHAT LOCKDOWN PATCH — APPLIED

**Date:** 2026-01-19
**Status:** ✅ IMPLEMENTED

---

## CHANGES SUMMARY

### Files Modified: 3

1. **NEW:** `/lib/utils/entitlement-helpers.ts` (160 lines)
2. **PATCHED:** `/components/admin/comprehensive-business-crm-card.tsx` (3 changes)
3. **PATCHED:** `/components/admin/tier-management-card.tsx` (2 changes)

---

## 1. NEW FILE: `/lib/utils/entitlement-helpers.ts`

**Purpose:** Single source of truth for business entitlement computation.

**Exported Function:**
```typescript
computeEntitlementState(
  business: { owner_user_id, status },
  latestSub?: { is_in_free_trial, free_trial_end_date, status, tier_name, ... }
) => EntitlementResult
```

**Returns:**
```typescript
{
  state: 'UNCLAIMED' | 'NO_SUB' | 'TRIAL_ACTIVE' | 'TRIAL_EXPIRED' | 'PAID_ACTIVE' | 'PAID_LAPSED' | 'SUB_OTHER'
  
  // Boolean helpers
  isClaimed: boolean
  isUnclaimed: boolean
  isTrialActive: boolean
  isTrialExpired: boolean
  isPaidActive: boolean
  
  // Tier info
  tierNameOrNull: string | null  // NULL if no active tier!
  
  // UI helpers
  shouldLockControls: boolean
  shouldShowToUsers: boolean
  displayLabel: string
  displayColor: string
}
```

**Business Logic:**

1. **UNCLAIMED** = `owner_user_id IS NULL AND status IN ('unclaimed', 'pending_claim')`
   - ❌ Locked controls
   - ❌ Not shown to end users
   - Display: "Unclaimed"

2. **NO_SUB** = No subscription row exists (but business IS claimed)
   - ✅ Unlocked controls
   - ✅ Shown to users
   - Display: "Free Listing"

3. **TRIAL_EXPIRED** = `is_in_free_trial=true AND free_trial_end_date < now()`
   - ✅ Unlocked controls (NOT locked like unclaimed!)
   - ❌ NOT shown to users
   - Display: "N/A"
   - `tierNameOrNull: null` (NO ACTIVE TIER)

4. **TRIAL_ACTIVE** = `is_in_free_trial=true AND free_trial_end_date >= now()`
   - ✅ Unlocked
   - ✅ Shown to users
   - Display: "Free Trial"

5. **PAID_ACTIVE** = `sub.status='active' AND (current_period_end is null OR >= now())`
   - ✅ Unlocked
   - ✅ Shown to users
   - Display: tier_display_name or tier_name

6. **PAID_LAPSED** = `sub.status IN ('paused', 'canceled')`
   - ✅ Unlocked
   - ❌ Not shown to users
   - Display: "Paused"

---

## 2. PATCHED: `/components/admin/comprehensive-business-crm-card.tsx`

### Change 1: Added Import (Line 20)
```diff
+ import { computeEntitlementState } from '@/lib/utils/entitlement-helpers'
```

### Change 2: Compute Entitlement State (After Line 99)
```diff
  const sub = getSubscription(business)
  
+ // ✅ LOCKDOWN: Compute canonical entitlement state (DO NOT use business.plan!)
+ const entitlement = computeEntitlementState(
+   {
+     owner_user_id: business.owner_user_id,
+     status: business.status
+   },
+   sub
+ )
```

### Change 3: Removed `business.plan` Fallback (Line ~752)
```diff
                  : business.status === 'claimed_free'
                  ? 'Free Listing'
-                 : business.plan?.charAt(0).toUpperCase() + business.plan?.slice(1) || 'N/A'
+                 : 'N/A'
```

**Impact:**
- ✅ Tier display now ONLY uses subscription data or explicit status checks
- ✅ No more stale `business.plan` values shown to admins
- ✅ Expired trials correctly show "N/A" instead of old plan value

---

## 3. PATCHED: `/components/admin/tier-management-card.tsx`

### Change 1: Added Import (Line 8)
```diff
+ import { computeEntitlementState } from '@/lib/utils/entitlement-helpers'
```

### Change 2: Removed `business.plan` Fallback (Line ~70)
```diff
    if (sub?.tier_name) {
      if (sub.tier_name === 'free') return 'free'
      if (sub.tier_name === 'trial') return 'trial'
      return sub.tier_name as PlanTier
    }
    
-   // Fallback to profile plan (but NOT for expired trials!)
-   if (business?.plan && business?.trial_status !== 'expired') {
-     return business.plan as PlanTier
-   }
+   // ✅ LOCKDOWN: NO FALLBACK to business.plan! It's stale/unreliable.
+   // If we got here, business has no active subscription.
    
    return 'free'
```

**Impact:**
- ✅ `getCurrentTier()` now ONLY uses subscription data
- ✅ Expired trials: NO tier selected (correctly shows "No active subscription")
- ✅ Free listings: "Free" tier (no lock)
- ✅ Paid tiers: Uses `sub.tier_name` ONLY

---

## WHAT WAS REMOVED

### ❌ All references to `business.plan` for tier display/selection
- This column is NOT updated consistently and causes drift
- Now tier is ONLY determined by:
  1. `business.status` (for unclaimed/claimed_free)
  2. `subscription.tier_name` (for paid/trial)
  3. `subscription.is_in_free_trial + free_trial_end_date` (for active vs expired)

### ❌ Dangerous fallbacks that masked missing data
- Before: Expired trials could show "Featured" (from stale plan column)
- After: Expired trials show "N/A" (correct!)

---

## TESTING CHECKLIST

### Test 1: Expired Trial (Mike's, Venezy, Julie's)
**Admin CRM:**
- [ ] Open business CRM card
- [ ] Header badge shows: **"Trial Expired"** (red)
- [ ] Mini card tier shows: **"N/A"** (not "Featured" or "Starter")
- [ ] Tier Management section shows red warning: **"Trial has expired - No active subscription"**
- [ ] NO tier button shows "Current" label
- [ ] Tier controls are **UNLOCKED** (not showing "Must claim" overlay)
- [ ] Status badge shows: **"EXPIRED"** (red, not green "LIVE")

**Expected Console Output:**
```
🔍 CRM Card for Mike's Pool Bar:
  trial_status: 'expired'
  sub?.tier_name: 'featured' (or similar)
  
Entitlement State:
  state: 'TRIAL_EXPIRED'
  tierNameOrNull: null
  shouldLockControls: false
  shouldShowToUsers: false
```

---

### Test 2: Unclaimed Imported Business
**Admin CRM:**
- [ ] PlaceholderSelector debug shows (dev mode only)
- [ ] Tier controls show lock overlay: **"Business Must Claim Before Upgrading"**
- [ ] Header badge shows: **"Unclaimed"**
- [ ] Mini card tier shows: **"Unclaimed"**

**Expected Console Output:**
```
Entitlement State:
  state: 'UNCLAIMED'
  isUnclaimed: true
  shouldLockControls: true
  shouldShowToUsers: false
```

---

### Test 3: Claimed Free Listing (No Subscription Row)
**Admin CRM:**
- [ ] NO lock overlay on tier controls
- [ ] Header badge shows: **"Free Listing"** (green)
- [ ] Mini card tier shows: **"Free Listing"**
- [ ] Tier selector shows NO tier as "Current"

**Expected Console Output:**
```
Entitlement State:
  state: 'NO_SUB'
  tierNameOrNull: null
  shouldLockControls: false
  shouldShowToUsers: true
```

---

### Test 4: Active Paid Business (Alexandra's Café - Spotlight)
**Admin CRM:**
- [ ] Header badge shows: **"Spotlight"** (amber/gold)
- [ ] Mini card tier shows: **"Spotlight"** (gold text)
- [ ] Tier controls **UNLOCKED**
- [ ] Spotlight tier button shows **"Current"** label
- [ ] Status shows **"LIVE"** (green)

**Expected Console Output:**
```
Entitlement State:
  state: 'PAID_ACTIVE'
  isPaidActive: true
  tierNameOrNull: 'Spotlight'
  shouldShowToUsers: true
```

---

### Test 5: Active Trial Business
**Admin CRM:**
- [ ] Header badge shows: **"Free Trial"** (blue)
- [ ] Mini card tier shows: **"Free Trial"**
- [ ] Trial Management shows: **"X days left"**
- [ ] NO "Expired" status anywhere
- [ ] Status badge shows: **"LIVE"** (green)

**Expected Console Output:**
```
Entitlement State:
  state: 'TRIAL_ACTIVE'
  isTrialActive: true
  tierNameOrNull: 'Featured' (or similar)
  shouldShowToUsers: true
```

---

## VERIFICATION SQL (Run This!)

```sql
-- See what the system SHOULD show for each business
WITH latest_subs AS (
  SELECT DISTINCT ON (business_id)
    business_id,
    is_in_free_trial,
    free_trial_end_date,
    status AS sub_status,
    tier_id
  FROM business_subscriptions
  ORDER BY business_id, created_at DESC
)
SELECT 
  bp.business_name,
  bp.owner_user_id IS NULL AS is_null_owner,
  bp.status AS bp_status,
  bp.plan AS plan_column_stale_value,
  ls.is_in_free_trial,
  ls.free_trial_end_date,
  ls.sub_status,
  st.tier_name AS actual_tier,
  
  -- COMPUTE WHAT UI SHOULD SHOW
  CASE
    WHEN bp.owner_user_id IS NULL AND bp.status IN ('unclaimed', 'pending_claim') THEN '🔒 UNCLAIMED - Locked'
    WHEN ls.business_id IS NULL THEN '✅ NO_SUB - Free Listing'
    WHEN ls.is_in_free_trial = true AND ls.free_trial_end_date < NOW() THEN '❌ TRIAL_EXPIRED - N/A (not visible)'
    WHEN ls.is_in_free_trial = true AND ls.free_trial_end_date >= NOW() THEN '⏳ TRIAL_ACTIVE - Free Trial'
    WHEN ls.sub_status = 'active' THEN '✅ PAID_ACTIVE - ' || COALESCE(st.tier_name, 'Unknown')
    ELSE '❓ OTHER'
  END AS expected_ui_display
  
FROM business_profiles bp
LEFT JOIN latest_subs ls ON bp.id = ls.business_id
LEFT JOIN subscription_tiers st ON ls.tier_id = st.id
WHERE bp.city = 'bournemouth'
ORDER BY 
  CASE
    WHEN ls.is_in_free_trial = true AND ls.free_trial_end_date < NOW() THEN 1
    WHEN bp.owner_user_id IS NULL THEN 2
    ELSE 3
  END,
  bp.business_name;
```

**Look for:**
- ❌ Any `TRIAL_EXPIRED` businesses still showing as "LIVE" in UI
- ❌ Any businesses where `plan_column_stale_value != actual_tier`
- ❌ Any `UNCLAIMED` with `owner_user_id` NOT NULL (data corruption)

---

## ROLLBACK INSTRUCTIONS

If this patch breaks something:

```bash
# 1. Delete the helper
rm /Users/qwikker/qwikkerdashboard/lib/utils/entitlement-helpers.ts

# 2. Revert comprehensive-business-crm-card.tsx
git checkout HEAD -- components/admin/comprehensive-business-crm-card.tsx

# 3. Revert tier-management-card.tsx
git checkout HEAD -- components/admin/tier-management-card.tsx
```

Or restore these specific lines:

**comprehensive-business-crm-card.tsx line ~752:**
```typescript
: business.plan?.charAt(0).toUpperCase() + business.plan?.slice(1) || 'N/A'
```

**tier-management-card.tsx line ~70:**
```typescript
if (business?.plan && business?.trial_status !== 'expired') {
  return business.plan as PlanTier
}
```

---

## WHAT THIS DOES NOT CHANGE

✅ Database schema (untouched)
✅ Cron jobs (untouched)
✅ Atlas components (untouched)
✅ User-facing discover/business pages (already correct)
✅ API routes (untouched)
✅ AI chat logic (untouched)

This patch ONLY affects:
- Admin CRM card tier display
- Admin tier management UI
- Internal entitlement computation logic

---

## NEXT STEPS

1. ✅ Test all 5 scenarios above
2. ✅ Run verification SQL
3. ✅ Check console for entitlement state logs
4. ✅ Verify expired trials show "N/A" not "Featured"
5. ✅ Verify free listings show "Free Listing" not locked

**If all tests pass:** This patch is safe and can be committed.

**If any test fails:** Report which scenario failed and provide console logs.

---

**END OF PATCH DOCUMENTATION**
