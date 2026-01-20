# 🔒 LOCKDOWN PATCH — PROPERLY APPLIED

**Status:** ✅ FIXED & READY TO TEST

---

## EXACT CHANGES (3 FILES)

### 1. `/lib/utils/entitlement-helpers.ts` (NEW FILE - 160 lines)

**Created new helper with pure function `computeEntitlementState()`**

Returns:
- `state`: UNCLAIMED | NO_SUB | TRIAL_ACTIVE | TRIAL_EXPIRED | PAID_ACTIVE | PAID_LAPSED | SUB_OTHER
- `tierNameOrNull`: NULL if no active tier (expired/free)
- `shouldLockControls`: boolean (only true for UNCLAIMED)
- `shouldShowToUsers`: boolean
- `displayLabel` and `displayColor`: for UI display

---

### 2. `/components/admin/comprehensive-business-crm-card.tsx` (4 CHANGES)

#### Change 1: Import helper (line 20)
```diff
+ import { computeEntitlementState } from '@/lib/utils/entitlement-helpers'
```

#### Change 2: Compute entitlement state (after line 99)
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

#### Change 3: Replace mini card tier display (lines 725-755)
**BEFORE:**
```tsx
<span className={`font-bold text-lg leading-none ${
  business.trial_status === 'expired' ? 'text-slate-500' :
  business.trial_status === 'active' ? 'text-blue-400' :
  sub?.tier_name === 'spotlight' ? 'text-amber-400' :
  sub?.tier_name === 'featured' ? 'text-purple-400' :
  sub?.tier_name === 'starter' ? 'text-slate-300' :
  business.status === 'unclaimed' ? 'text-slate-400' :
  business.status === 'claimed_free' ? 'text-emerald-400' :
  'text-slate-300'
}`}>
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
    : business.plan?.charAt(0).toUpperCase() + business.plan?.slice(1) || 'N/A'}
</span>
```

**AFTER:**
```tsx
<span className={`font-bold text-lg leading-none ${entitlement.displayColor}`}>
  {/* ✅ LOCKDOWN: Use entitlement state ONLY (no business.plan!) */}
  {entitlement.state === 'PAID_ACTIVE'
    ? (entitlement.tierNameOrNull || 'Paid')
    : entitlement.state === 'TRIAL_ACTIVE'
    ? 'Free Trial'
    : entitlement.state === 'TRIAL_EXPIRED'
    ? 'N/A'
    : entitlement.state === 'NO_SUB'
    ? 'Free Listing'
    : entitlement.state === 'UNCLAIMED'
    ? 'Unclaimed'
    : 'N/A'}
</span>
```

**✅ REMOVED:** `business.plan` fallback  
**✅ SIMPLIFIED:** All logic driven by `entitlement.state`  
**✅ CLEANER:** Single source of truth

#### Change 4: Replace header badge (lines 852-878)
**BEFORE:**
```tsx
<span className={`px-3 py-1 text-xs font-semibold rounded-lg ${
  business.trial_status === 'expired' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
  business.trial_status === 'active' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
  sub?.tier_name === 'spotlight' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
  sub?.tier_name === 'featured' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
  sub?.tier_name === 'starter' ? 'bg-slate-700/50 text-slate-400 border border-slate-600/30' :
  business.status === 'unclaimed' ? 'bg-slate-700/50 text-slate-400 border border-slate-600/30' :
  business.status === 'claimed_free' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
  'bg-slate-700/50 text-slate-400 border border-slate-600/30'
}`}>
  {business.trial_status === 'expired'
    ? 'Trial Expired'
    : business.trial_status === 'active'
    ? 'Free Trial'
    : sub?.tier_display_name
    ? sub.tier_display_name
    : sub?.tier_name === 'starter'
    ? 'Starter'
    : business.status === 'unclaimed'
    ? 'Unclaimed'
    : business.status === 'claimed_free'
    ? 'Free Listing'
    : null}
</span>
```

**AFTER:**
```tsx
<span className={`px-3 py-1 text-xs font-semibold rounded-lg ${
  entitlement.state === 'TRIAL_EXPIRED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
  entitlement.state === 'TRIAL_ACTIVE' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
  entitlement.state === 'PAID_ACTIVE' && entitlement.tierNameOrNull === 'Spotlight' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
  entitlement.state === 'PAID_ACTIVE' && entitlement.tierNameOrNull === 'Featured' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
  entitlement.state === 'PAID_ACTIVE' ? 'bg-slate-700/50 text-slate-400 border border-slate-600/30' :
  entitlement.state === 'UNCLAIMED' ? 'bg-slate-700/50 text-slate-400 border border-slate-600/30' :
  entitlement.state === 'NO_SUB' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
  'bg-slate-700/50 text-slate-400 border border-slate-600/30'
}`}>
  {/* ✅ LOCKDOWN: Display from entitlement state ONLY */}
  {entitlement.displayLabel}
</span>
```

---

### 3. `/components/admin/tier-management-card.tsx` (5 CHANGES)

#### Change 1: Import helper (line 8)
```diff
+ import { computeEntitlementState } from '@/lib/utils/entitlement-helpers'
```

#### Change 2: Replace `getCurrentTier()` function (lines 24-76)
**BEFORE:**
```typescript
const getCurrentTier = (): PlanTier => {
  const sub = Array.isArray(business?.subscription) ? business?.subscription[0] : business?.subscription
  
  if (business?.trial_status === 'expired') {
    return 'free' // ❌ BAD: defaults to 'free', selects Free tier
  }
  
  if (business?.status === 'unclaimed') {
    return 'free'
  }
  
  if (business?.status === 'claimed_free') {
    return 'free'
  }
  
  if (sub?.is_in_free_trial && sub?.free_trial_end_date) {
    const endDate = new Date(sub.free_trial_end_date)
    const now = new Date()
    if (endDate >= now) {
      return 'trial'
    }
  }
  
  if (sub?.tier_name) {
    if (sub.tier_name === 'free') return 'free'
    if (sub.tier_name === 'trial') return 'trial'
    return sub.tier_name as PlanTier
  }
  
  // ❌ BAD: Falls back to business.plan!
  if (business?.plan && business?.trial_status !== 'expired') {
    return business.plan as PlanTier
  }
  
  return 'free'
}

const currentTier = getCurrentTier()
const initialTier = business?.trial_status === 'expired' ? 'starter' : currentTier
const [selectedTier, setSelectedTier] = useState<PlanTier>(initialTier)
```

**AFTER:**
```typescript
// ✅ LOCKDOWN: Extract subscription properly
const sub = Array.isArray(business?.subscription) ? business?.subscription[0] : business?.subscription

// ✅ LOCKDOWN: Compute entitlement state (DO NOT use business.plan!)
const entitlement = computeEntitlementState(
  {
    owner_user_id: business?.owner_user_id,
    status: business?.status
  },
  sub
)

// Get current tier from entitlement state ONLY
const getCurrentTier = (): PlanTier | null => {
  console.log('🔍 Getting current tier from entitlement:', {
    state: entitlement.state,
    tierNameOrNull: entitlement.tierNameOrNull,
    business_status: business?.status
  })
  
  // ✅ LOCKDOWN: Use entitlement state to determine tier
  if (entitlement.state === 'UNCLAIMED') return null // No tier yet
  if (entitlement.state === 'NO_SUB') return null // Free listing, no tier
  if (entitlement.state === 'TRIAL_EXPIRED') return null // NO TIER! ✅
  if (entitlement.state === 'TRIAL_ACTIVE') return 'trial'
  if (entitlement.state === 'PAID_ACTIVE' && entitlement.tierNameOrNull) {
    return entitlement.tierNameOrNull as PlanTier
  }
  
  return null // Default: no tier selected ✅
}

// ✅ LOCKDOWN: Initialize with current tier OR null (for expired/no-sub)
const currentTier = getCurrentTier()
const [selectedTier, setSelectedTier] = useState<PlanTier>(currentTier || 'starter')
```

**KEY FIXES:**
- ✅ Returns `null` (not `'free'`) for expired trials → No tier selected
- ✅ Removed `business.plan` fallback entirely
- ✅ Uses `entitlement.state` as single source of truth

#### Change 3: Replace `isUnclaimed` logic (line 281)
**BEFORE:**
```typescript
const isUnclaimed = !business?.owner_user_id && business?.status === 'unclaimed'
```

**AFTER:**
```typescript
// ✅ LOCKDOWN: Use entitlement state for lock logic
const isUnclaimed = entitlement.shouldLockControls
```

#### Change 4: Replace expired trial notice check (line 328)
**BEFORE:**
```tsx
{business?.trial_status === 'expired' && (() => {
  const sub = Array.isArray(business?.subscription) ? business?.subscription[0] : business?.subscription
  return (
```

**AFTER:**
```tsx
{/* ✅ LOCKDOWN: Expired trial notice from entitlement state */}
{entitlement.state === 'TRIAL_EXPIRED' && (() => {
  return (
```

#### Change 5: Replace "Current" label logic (lines 382-388)
**BEFORE:**
```tsx
<div className="mt-2 flex items-center gap-2">
  {isCurrent && business?.trial_status !== 'expired' && (
    <span className="text-xs font-medium text-blue-400">Current</span>
  )}
  {isSelected && (userHasSelected || business?.trial_status !== 'expired') && (
    <span className="text-xs font-medium text-[#00d083]">✓ Selected</span>
  )}
</div>
```

**AFTER:**
```tsx
<div className="mt-2 flex items-center gap-2">
  {/* ✅ LOCKDOWN: Only show "Current" if business has an active tier */}
  {isCurrent && currentTier !== null && (
    <span className="text-xs font-medium text-blue-400">Current</span>
  )}
  {/* ✅ LOCKDOWN: Only show "Selected" if user manually clicked */}
  {isSelected && (userHasSelected || currentTier !== null) && (
    <span className="text-xs font-medium text-[#00d083]">✓ Selected</span>
  )}
</div>
```

**KEY FIX:** Uses `currentTier !== null` instead of `business.trial_status !== 'expired'`

---

## WHAT WAS ELIMINATED

### ❌ All `business.plan` fallbacks
- CRM card line ~752: ~~`business.plan?.charAt(0)...`~~
- Tier management line ~70: ~~`if (business?.plan && ...)`~~

### ❌ All `business.trial_status` direct checks
- Replaced with `entitlement.state === 'TRIAL_EXPIRED'`
- Replaced with `currentTier !== null`

### ❌ Default 'free' tier selection for expired trials
- Before: `return 'free'` → Free tier would be selected
- After: `return null` → NO tier selected ✅

---

## VERIFICATION STEPS

### 1. Compile Check
```bash
pnpm lint
# Should show NO errors in:
# - lib/utils/entitlement-helpers.ts
# - components/admin/comprehensive-business-crm-card.tsx
# - components/admin/tier-management-card.tsx
```

### 2. Manual Tests (Admin Dashboard)

**Test A: Expired Trial (Mike's Pool Bar)**
- [ ] Open CRM card
- [ ] Header badge: "Trial Expired" (red) ✅
- [ ] Mini card tier: "N/A" (NOT "Featured") ✅
- [ ] Tier Management: Red warning box ✅
- [ ] NO tier shows "Current" label ✅
- [ ] Controls: UNLOCKED ✅

**Test B: Unclaimed Business**
- [ ] Lock overlay shows ✅
- [ ] Header: "Unclaimed" ✅
- [ ] Cannot change tiers ✅

**Test C: Free Listing (No Subscription)**
- [ ] Header: "Free Listing" (green) ✅
- [ ] Controls: UNLOCKED ✅
- [ ] No tier selected ✅

**Test D: Active Paid (Alexandra's - Spotlight)**
- [ ] Header: "Spotlight" (gold) ✅
- [ ] Mini card: "Spotlight" ✅
- [ ] Spotlight tier shows "Current" ✅

**Test E: Active Trial**
- [ ] Header: "Free Trial" (blue) ✅
- [ ] Trial days shown ✅
- [ ] Status: "LIVE" ✅

### 3. Console Verification

Open browser console and look for:
```
🔍 CRM Card for Mike's Pool Bar:
  (entitlement state logs)

🔍 Getting current tier from entitlement:
  state: 'TRIAL_EXPIRED'
  tierNameOrNull: null  ✅ THIS IS KEY!
```

---

## ROLLBACK (If Needed)

```bash
# Delete helper
rm /Users/qwikker/qwikkerdashboard/lib/utils/entitlement-helpers.ts

# Revert files
git checkout HEAD -- components/admin/comprehensive-business-crm-card.tsx
git checkout HEAD -- components/admin/tier-management-card.tsx
```

---

## WHAT THIS DOES NOT CHANGE

✅ Database schema (untouched)  
✅ Cron jobs (untouched)  
✅ Atlas (untouched)  
✅ User-facing pages (untouched)  
✅ API routes (untouched)  

---

**STATUS: READY FOR USER TESTING**

The patch is properly applied. All `business.plan` references removed. Entitlement state is now the single source of truth.
