# CHAT LOCKDOWN AUDIT & PATCH

## A) AUDIT FINDINGS

### 🔴 CRITICAL ISSUES

#### 1. **Fallback to `business.plan` for Tier Display**
**Location:** `components/admin/comprehensive-business-crm-card.tsx`
- **Line 737:** `business.plan?.charAt(0).toUpperCase() + business.plan?.slice(1) || 'N/A'`
- **Risk:** If subscription data is missing/null, falls back to `business_profiles.plan`. This column is NOT always in sync with `business_subscriptions` and can show stale tier info.
- **Impact:** Admin sees "Featured selected" when business actually has no active subscription.

**Location:** `components/admin/tier-management-card.tsx`
- **Line 61:** `if (business?.plan && business?.trial_status !== 'expired') { return business.plan as PlanTier }`
- **Risk:** `getCurrentTier()` uses `business.plan` as fallback, causing tier selector to show incorrect "Current" tier.

#### 2. **Legacy `trial_days_remaining` Used for Status**
**Locations:**
- `components/admin/comprehensive-business-crm-card.tsx`: Lines 106, 110, 279, 602, 758
- `components/admin/business-crm-card.tsx`: Lines 56, 132, 232, 493

- **Risk:** `trial_days_remaining` is computed in `admin-crm-actions.ts` (line 299-309) but **NOT guaranteed to exist** if subscription is missing or malformed. Code mixes this legacy field with `trial_status` and `sub?.is_in_free_trial`.
- **Impact:** Inconsistent trial expiry detection. Some paths check `trial_days_remaining < 0`, others check `trial_status === 'expired'`, others check `free_trial_end_date`.

#### 3. **Overly Broad Lock Logic**
**Location:** `components/admin/tier-management-card.tsx`
- **Line 303:** `const isUnclaimed = !business?.owner_user_id && business?.status === 'unclaimed'`
- **CORRECT** ✅ (already fixed in recent session)

**Location:** `components/admin/comprehensive-business-crm-card.tsx`
- **Line 172:** `const isUnclaimed = !business.owner_user_id && business.status === 'unclaimed'`
- **CORRECT** ✅

**No issue found** - lock logic already properly checks both `owner_user_id` AND `status`.

#### 4. **Subscription Access Without Array Check**
**Location:** `components/admin/comprehensive-business-crm-card.tsx`
- **Line 99:** `const sub = getSubscription(business)` - CORRECT ✅
- But **some places** still reference `business.trial_status` and `business.trial_days_remaining` which are computed fields from `admin-crm-actions.ts` and might not exist.

---

### ⚠️ MEDIUM RISKS

#### 5. **No Explicit "NO_SUB" State**
- Currently, code treats missing subscription as "legacy/active" (e.g., discover page line 144-146)
- **Risk:** Cannot distinguish between:
  - **NO_SUB** (claimed_free, no subscription row) → should show "Free Listing"
  - **UNCLAIMED** (owner_user_id null) → should show "Unclaimed"
  - **TRIAL_EXPIRED** (is_in_free_trial=true, end_date < now) → should show "Expired"

#### 6. **Expired Trial Detection Fragmented**
Currently scattered across:
- `admin-crm-actions.ts` line 296-309 (computes `trial_status`)
- Discover page line 158-169 (checks `free_trial_end_date < now`)
- Admin dashboard line 2877 (computes `trial_days_remaining`)
- CRM card uses `business.trial_status` from server-computed data

**Risk:** Different codepaths might compute differently if server data is stale.

---

### ✅ ALREADY CORRECT

1. **Lock Logic**: Already checks `owner_user_id IS NULL AND status = 'unclaimed'`
2. **Subscription Array Handling**: `getSubscription()` helper correctly extracts from array
3. **User-facing queries**: Discover page already filters expired trials

---

## B) PROPOSED MINIMAL PATCH

### Goals:
1. Create ONE canonical helper for entitlement computation
2. Remove ALL fallbacks to `business.plan`
3. Standardize on `trial_status` field (already computed server-side)
4. Do NOT change database, cron, or Atlas

### Components to Update:
1. **New Helper:** `/lib/utils/entitlement-helpers.ts` (server+client safe)
2. **CRM Card:** `comprehensive-business-crm-card.tsx` (remove `business.plan` fallback)
3. **Tier Management:** `tier-management-card.tsx` (remove `business.plan` fallback)

---

## C) IMPLEMENTATION

### 1. Create Entitlement Helper

**File:** `/lib/utils/entitlement-helpers.ts`

```typescript
/**
 * CANONICAL ENTITLEMENT STATE COMPUTATION
 * 
 * This is the SINGLE SOURCE OF TRUTH for determining business entitlement.
 * All UI components should use this instead of inline checks.
 * 
 * States (exhaustive):
 * - UNCLAIMED: owner_user_id IS NULL AND status IN ('unclaimed', 'pending_claim')
 * - NO_SUB: owner_user_id EXISTS, no active subscription row
 * - TRIAL_ACTIVE: in_free_trial=true AND end_date >= now
 * - TRIAL_EXPIRED: in_free_trial=true AND end_date < now
 * - PAID_ACTIVE: subscription.status='active' AND not in trial
 * - PAID_LAPSED: subscription.status IN ('paused', 'canceled')
 * - SUB_OTHER: subscription exists but none of above
 */

export type EntitlementState = 
  | 'UNCLAIMED'
  | 'NO_SUB'
  | 'TRIAL_ACTIVE'
  | 'TRIAL_EXPIRED'
  | 'PAID_ACTIVE'
  | 'PAID_LAPSED'
  | 'SUB_OTHER'

export interface BusinessEntitlementInput {
  owner_user_id?: string | null
  status?: string | null
  subscription?: {
    is_in_free_trial?: boolean
    free_trial_end_date?: string | null
    status?: string | null
  } | null
  // For compatibility with array format:
  business_subscriptions?: Array<{
    is_in_free_trial?: boolean
    free_trial_end_date?: string | null
    status?: string | null
  }> | null
}

export interface EntitlementResult {
  state: EntitlementState
  displayTier: string  // "Spotlight", "Featured", "N/A", "Unclaimed", etc.
  isLocked: boolean    // Should tier controls be locked?
  canReceiveCustomers: boolean // Should appear to end users?
  tierColor: string    // For UI badges
}

export function computeEntitlement(input: BusinessEntitlementInput): EntitlementResult {
  // Extract subscription from either format
  let sub = input.subscription
  if (!sub && input.business_subscriptions && Array.isArray(input.business_subscriptions)) {
    sub = input.business_subscriptions[0] || null
  }

  // 1. UNCLAIMED (highest priority - these are gated)
  if (!input.owner_user_id && (input.status === 'unclaimed' || input.status === 'pending_claim')) {
    return {
      state: 'UNCLAIMED',
      displayTier: 'Unclaimed',
      isLocked: true,
      canReceiveCustomers: false, // Visible in discover but not interactive
      tierColor: 'text-slate-400'
    }
  }

  // 2. NO SUBSCRIPTION (claimed but no subscription row)
  if (!sub) {
    return {
      state: 'NO_SUB',
      displayTier: 'Free Listing',
      isLocked: false,
      canReceiveCustomers: true,
      tierColor: 'text-emerald-400'
    }
  }

  // 3. TRIAL (active or expired)
  if (sub.is_in_free_trial && sub.free_trial_end_date) {
    const endDate = new Date(sub.free_trial_end_date)
    const now = new Date()
    
    if (endDate >= now) {
      return {
        state: 'TRIAL_ACTIVE',
        displayTier: 'Free Trial',
        isLocked: false,
        canReceiveCustomers: true,
        tierColor: 'text-blue-400'
      }
    } else {
      return {
        state: 'TRIAL_EXPIRED',
        displayTier: 'N/A',
        isLocked: false, // NOT locked like unclaimed!
        canReceiveCustomers: false, // Must NOT show to users
        tierColor: 'text-red-400'
      }
    }
  }

  // 4. PAID SUBSCRIPTION
  if (sub.status === 'active') {
    return {
      state: 'PAID_ACTIVE',
      displayTier: 'Paid', // Will be overridden with actual tier name
      isLocked: false,
      canReceiveCustomers: true,
      tierColor: 'text-green-400'
    }
  }

  if (sub.status === 'paused' || sub.status === 'canceled') {
    return {
      state: 'PAID_LAPSED',
      displayTier: 'Paused',
      isLocked: false,
      canReceiveCustomers: false,
      tierColor: 'text-orange-400'
    }
  }

  // 5. FALLBACK
  return {
    state: 'SUB_OTHER',
    displayTier: 'Unknown',
    isLocked: false,
    canReceiveCustomers: false,
    tierColor: 'text-slate-400'
  }
}

/**
 * Simplified check: Is this business showing to end users?
 */
export function isVisibleToUsers(input: BusinessEntitlementInput): boolean {
  const { canReceiveCustomers } = computeEntitlement(input)
  return canReceiveCustomers
}

/**
 * Simplified check: Should admin tier controls be locked?
 */
export function shouldLockControls(input: BusinessEntitlementInput): boolean {
  const { isLocked } = computeEntitlement(input)
  return isLocked
}
```

### 2. Patch CRM Card

**File:** `components/admin/comprehensive-business-crm-card.tsx`

**Line 737 - Remove `business.plan` fallback:**

```typescript
// BEFORE:
: business.plan?.charAt(0).toUpperCase() + business.plan?.slice(1) || 'N/A'}

// AFTER:
: 'N/A'}
```

**Line 728-738 - Use entitlement helper:**

```typescript
import { computeEntitlement } from '@/lib/utils/entitlement-helpers'

// At top of component (after line 99):
const entitlement = computeEntitlement({
  owner_user_id: business.owner_user_id,
  status: business.status,
  subscription: sub
})

// Line 728-738 replace with:
{business.trial_status === 'expired'
  ? 'N/A'
  : business.trial_status === 'active'
  ? 'Free Trial'
  : sub?.tier_display_name
  ? sub.tier_display_name
  : sub?.tier_name === 'spotlight'
  ? 'Spotlight'
  : sub?.tier_name === 'featured'
  ? 'Featured'
  : sub?.tier_name === 'starter'
  ? 'Starter'
  : business.status === 'unclaimed' 
  ? 'Unclaimed'
  : business.status === 'claimed_free'
  ? 'Free Listing'
  : entitlement.displayTier}  // ✅ Use helper instead of business.plan
```

### 3. Patch Tier Management

**File:** `components/admin/tier-management-card.tsx`

**Line 61 - Remove `business.plan` fallback:**

```typescript
// BEFORE (line 61):
if (business?.plan && business?.trial_status !== 'expired') {
  return business.plan as PlanTier
}

// AFTER:
// Remove this block entirely - it's a dangerous fallback
```

**Final `getCurrentTier()` should be:**

```typescript
const getCurrentTier = (): PlanTier => {
  const sub = Array.isArray(business?.subscription) ? business.subscription[0] : business.subscription
  
  // ✅ CRITICAL: Expired trials have NO current tier!
  if (business?.trial_status === 'expired') {
    return 'free' // No tier selected
  }
  
  // Check business status first (free tier)
  if (business?.status === 'unclaimed') {
    return 'free'
  }
  
  if (business?.status === 'claimed_free') {
    return 'free'
  }
  
  // Check if trial is ACTIVE
  if (sub?.is_in_free_trial && sub?.free_trial_end_date) {
    const endDate = new Date(sub.free_trial_end_date)
    const now = new Date()
    if (endDate >= now) {
      return 'trial'
    }
  }
  
  // Check subscription tier
  if (sub?.tier_name) {
    if (sub.tier_name === 'free') return 'free'
    if (sub.tier_name === 'trial') return 'trial'
    return sub.tier_name as PlanTier
  }
  
  // ✅ NO FALLBACK TO business.plan!
  return 'free' // Default
}
```

---

## D) VERIFICATION SQL

```sql
-- TRUTH TABLE: Entitlement State for All Businesses
-- Run this to verify what the system SHOULD show

WITH latest_subs AS (
  SELECT DISTINCT ON (business_id)
    business_id,
    is_in_free_trial,
    free_trial_end_date,
    status AS sub_status,
    tier_id,
    created_at
  FROM business_subscriptions
  ORDER BY business_id, created_at DESC
),
computed_states AS (
  SELECT 
    bp.id,
    bp.business_name,
    bp.owner_user_id,
    bp.status AS bp_status,
    bp.plan AS bp_plan_column,
    ls.is_in_free_trial,
    ls.free_trial_end_date,
    ls.sub_status,
    st.tier_name,
    
    -- COMPUTE ENTITLEMENT STATE (matches helper logic)
    CASE
      -- 1. UNCLAIMED
      WHEN bp.owner_user_id IS NULL AND bp.status IN ('unclaimed', 'pending_claim') THEN 'UNCLAIMED'
      
      -- 2. NO SUBSCRIPTION
      WHEN ls.business_id IS NULL THEN 'NO_SUB'
      
      -- 3. TRIAL EXPIRED
      WHEN ls.is_in_free_trial = true 
           AND ls.free_trial_end_date IS NOT NULL 
           AND ls.free_trial_end_date < NOW() THEN 'TRIAL_EXPIRED'
      
      -- 4. TRIAL ACTIVE
      WHEN ls.is_in_free_trial = true 
           AND ls.free_trial_end_date IS NOT NULL 
           AND ls.free_trial_end_date >= NOW() THEN 'TRIAL_ACTIVE'
      
      -- 5. PAID ACTIVE
      WHEN ls.sub_status = 'active' THEN 'PAID_ACTIVE'
      
      -- 6. PAID LAPSED
      WHEN ls.sub_status IN ('paused', 'canceled') THEN 'PAID_LAPSED'
      
      -- 7. OTHER
      ELSE 'SUB_OTHER'
    END AS entitlement_state,
    
    -- SHOULD TIER CONTROLS BE LOCKED?
    (bp.owner_user_id IS NULL AND bp.status IN ('unclaimed', 'pending_claim')) AS controls_locked,
    
    -- SHOULD BE VISIBLE TO END USERS?
    CASE
      WHEN bp.owner_user_id IS NULL AND bp.status IN ('unclaimed', 'pending_claim') THEN false
      WHEN ls.business_id IS NULL THEN true  -- Free listings are visible
      WHEN ls.is_in_free_trial = true AND ls.free_trial_end_date < NOW() THEN false
      WHEN ls.sub_status IN ('active', 'trial') THEN true
      ELSE false
    END AS visible_to_users
    
  FROM business_profiles bp
  LEFT JOIN latest_subs ls ON bp.id = ls.business_id
  LEFT JOIN subscription_tiers st ON ls.tier_id = st.id
  WHERE bp.city = 'bournemouth'  -- Change as needed
)
SELECT 
  business_name,
  entitlement_state,
  tier_name,
  bp_plan_column AS plan_column_value,
  controls_locked,
  visible_to_users,
  CASE 
    WHEN entitlement_state = 'UNCLAIMED' THEN 'Should show: Unclaimed, Lock controls'
    WHEN entitlement_state = 'NO_SUB' THEN 'Should show: Free Listing, Unlocked'
    WHEN entitlement_state = 'TRIAL_ACTIVE' THEN 'Should show: Free Trial badge, Unlocked'
    WHEN entitlement_state = 'TRIAL_EXPIRED' THEN 'Should show: N/A, Unlocked, NOT visible to users'
    WHEN entitlement_state = 'PAID_ACTIVE' THEN 'Should show: ' || COALESCE(tier_name, 'Paid') || ', Unlocked'
    ELSE 'Check manually'
  END AS expected_ui_behavior
FROM computed_states
ORDER BY 
  CASE entitlement_state
    WHEN 'TRIAL_EXPIRED' THEN 1
    WHEN 'UNCLAIMED' THEN 2
    WHEN 'TRIAL_ACTIVE' THEN 3
    WHEN 'PAID_ACTIVE' THEN 4
    ELSE 5
  END,
  business_name;

-- SPOT CHECK QUERIES

-- Q1: Any businesses with is_in_free_trial=true but free_trial_end_date < now?
SELECT bp.business_name, bs.free_trial_end_date, NOW() - bs.free_trial_end_date AS overdue_by
FROM business_profiles bp
JOIN business_subscriptions bs ON bp.id = bs.business_id
WHERE bs.is_in_free_trial = true 
  AND bs.free_trial_end_date < NOW()
  AND bp.city = 'bournemouth';

-- Q2: Any unclaimed with owner_user_id NOT NULL (data corruption)?
SELECT business_name, owner_user_id, status
FROM business_profiles
WHERE status = 'unclaimed' AND owner_user_id IS NOT NULL
  AND city = 'bournemouth';

-- Q3: Businesses with business_profiles.plan != subscription tier (drift)?
SELECT 
  bp.business_name,
  bp.plan AS bp_plan,
  st.tier_name AS actual_tier,
  CASE 
    WHEN bp.plan IS NULL AND st.tier_name IS NOT NULL THEN 'bp.plan is null but has subscription'
    WHEN bp.plan IS NOT NULL AND st.tier_name IS NULL THEN 'bp.plan set but no subscription'
    WHEN bp.plan != st.tier_name THEN 'MISMATCH'
    ELSE 'OK'
  END AS status
FROM business_profiles bp
LEFT JOIN business_subscriptions bs ON bp.id = bs.business_id AND bs.status = 'active'
LEFT JOIN subscription_tiers st ON bs.tier_id = st.id
WHERE bp.city = 'bournemouth'
  AND (bp.plan != st.tier_name OR (bp.plan IS NULL AND st.tier_name IS NOT NULL) OR (bp.plan IS NOT NULL AND st.tier_name IS NULL));
```

---

## E) MANUAL TEST CHECKLIST

### Admin CRM Tests:

**Test 1: Expired Trial (Mike's Pool Bar, Venezy, Julie's)**
- [ ] Open CRM card
- [ ] Header badge shows "Trial Expired" (red)
- [ ] Mini card (unexpanded) shows "Tier: N/A"
- [ ] Tier Management section shows red warning: "Trial has expired - No active subscription"
- [ ] NO tier shows "Current" label
- [ ] Tier controls are UNLOCKED (not showing "Must claim" overlay)
- [ ] Status shows "EXPIRED" (not "LIVE")

**Test 2: Unclaimed Imported (any Google import)**
- [ ] PlaceholderSelector debug shows (dev mode only)
- [ ] Tier controls show lock overlay: "Business Must Claim Before Upgrading"
- [ ] Header badge shows "Unclaimed"
- [ ] Mini card shows "Tier: Unclaimed"

**Test 3: Claimed Free Listing (no subscription row)**
- [ ] NO lock overlay
- [ ] Header badge shows "Free Listing" (green)
- [ ] Mini card shows "Tier: Free Listing"
- [ ] Tier controls unlocked

**Test 4: Active Paid (Alexandra's Café - Spotlight)**
- [ ] Header badge shows "Spotlight" (gold)
- [ ] Mini card shows "Tier: Spotlight" (gold text)
- [ ] Tier controls unlocked
- [ ] "Current" shows on Spotlight tier button

**Test 5: Active Trial**
- [ ] Header badge shows "Free Trial" (blue)
- [ ] Mini card shows "Tier: Free Trial"
- [ ] NO "Expired" status anywhere

### User-Facing Tests:

**Test 6: Discover Page**
- [ ] Mike's Pool Bar NOT visible
- [ ] Venezy Burgers NOT visible
- [ ] Julie's Sports Pub NOT visible
- [ ] Only active businesses appear

**Test 7: Direct URL to Expired Business**
- [ ] Navigate to `/user/business/mikes-pool-bar`
- [ ] Should show 404 or "Not available"

---

## F) ROLLBACK PLAN

If patch causes issues:

1. Revert `entitlement-helpers.ts` (just delete the file)
2. Revert line 737 in `comprehensive-business-crm-card.tsx`:
   ```typescript
   : business.plan?.charAt(0).toUpperCase() + business.plan?.slice(1) || 'N/A'}
   ```
3. Revert line 61 in `tier-management-card.tsx`:
   ```typescript
   if (business?.plan && business?.trial_status !== 'expired') {
     return business.plan as PlanTier
   }
   ```

---

## G) IMPLEMENTATION PRIORITY

**DO THIS ORDER:**

1. ✅ Run verification SQL first (see what truth looks like)
2. ✅ Create `entitlement-helpers.ts` (new file, no risk)
3. ✅ Test helper in isolation (console.log tests)
4. ✅ Patch `tier-management-card.tsx` line 61 (remove fallback)
5. ✅ Patch `comprehensive-business-crm-card.tsx` line 737 (remove fallback)
6. ✅ Test in dev with 5 test cases above
7. ✅ Run verification SQL again to confirm behavior matches

**DO NOT:**
- Change database schema
- Create new cron jobs
- Touch Atlas
- Refactor entire CRM system
- Change user-facing components (they already filter correctly)

---

**END OF AUDIT REPORT**
