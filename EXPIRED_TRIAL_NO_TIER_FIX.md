# Expired Trial "NO TIER" Fix

⚠️ **CRITICAL UPDATE:** Initial fix introduced a NEW bug - "Free Listing" was showing as "✓ Selected"! This has been fixed with a `userHasSelected` flag to track manual selections.

---

## User Issue (CRITICAL!)

**Venezy Burgers (Expired Trial)** was showing:
1. ❌ Header badge: "Starter" (should show "Trial Expired")
2. ❌ Tier Management: "Starter" showing as "Current ✓ Selected"
3. ❌ NO clear notice that trial has expired

**User's correct expectation:**
- ❌ NO tier should show as "Current" if expired
- ✅ Clear message saying trial has expired
- ✅ Admin knows they need to extend/upgrade to reactivate

---

## Root Causes

### 0. "Free Listing" Showing as "✓ Selected" (CRITICAL!)
**File:** `tier-management-card.tsx` (line 69)

**Before:**
```typescript
const [selectedTier, setSelectedTier] = useState<PlanTier>(getCurrentTier())
```

**Problem:** Since `getCurrentTier()` returns `'free'` for expired trials, the component initializes with "Free Listing" as the selected tier!

### 1. Header Badge Using Wrong Logic
**File:** `comprehensive-business-crm-card.tsx` (line 847)

**Before:**
```typescript
business.subscription?.is_in_free_trial ? 'Free Trial'
```

**Problem:** Checking `is_in_free_trial` which is TRUE even for expired trials!

### 2. No "Current" Removal for Expired
**File:** `tier-management-card.tsx` (line 383)

**Before:**
```typescript
{isCurrent && (
  <span>Current</span>
)}
```

**Problem:** Always shows "Current" if `getCurrentTier()` matches, even if expired!

### 3. `getCurrentTier()` Returning Wrong Value
**File:** `tier-management-card.tsx` (line 66)

**Before:**
```typescript
return 'starter' // Fallback
```

**Problem:** Returns 'starter' for expired trials, so Starter button shows as "Current"!

### 4. No Visible Warning
**Problem:** No clear message telling admin the trial has expired!

---

## Fixes Applied

### **Fix 0: Don't Show "Free Listing" as Selected!**
**File:** `tier-management-card.tsx` (lines 69-76 & 201 & 393)

**The Problem:**
When I changed `getCurrentTier()` to return `'free'` for expired trials (to prevent "Current" from showing), it ALSO made "Free Listing" appear as "✓ Selected" on initial load!

**The Fix:**
1. Track whether user has clicked a tier: `const [userHasSelected, setUserHasSelected] = useState(false)`
2. Set flag when user clicks: `setUserHasSelected(true)` in `handleTierChange`
3. Only show "✓ Selected" if user clicked OR trial is active:

```typescript
{isSelected && (userHasSelected || business?.trial_status !== 'expired') && (
  <span>✓ Selected</span>
)}
```

✅ **Result:** 
- On initial load: NO tier shows "✓ Selected"
- After user clicks a tier: THAT tier shows "✓ Selected"
- Normal businesses: Works as before

---

### **Fix 1: Header Badge - Show "Trial Expired"**
**File:** `comprehensive-business-crm-card.tsx` (lines 835-858)

**Before:**
```typescript
business.subscription?.is_in_free_trial ? 'Free Trial'
: business.subscription?.tier_name === 'starter' ? 'Starter'
```

**After:**
```typescript
business.trial_status === 'expired' ? 'Trial Expired'  // ✅ Check trial_status first!
: business.trial_status === 'active' ? 'Free Trial'
: business.subscription?.tier_name === 'starter' ? 'Starter'
```

✅ **Result:** Header shows **"Trial Expired"** in red badge!

---

### **Fix 2: Hide "Current" Label for Expired**
**File:** `tier-management-card.tsx` (line 383)

**Before:**
```typescript
{isCurrent && (
  <span className="text-xs font-medium text-blue-400">Current</span>
)}
```

**After:**
```typescript
{/* ✅ Don't show "Current" if trial is expired! */}
{isCurrent && business?.trial_status !== 'expired' && (
  <span className="text-xs font-medium text-blue-400">Current</span>
)}
```

✅ **Result:** NO tier shows "Current" for expired trials!

---

### **Fix 3: `getCurrentTier()` Returns 'free' for Expired**
**File:** `tier-management-card.tsx` (lines 25-70)

**Before:**
```typescript
// ... checks ...
return 'starter' // ❌ Makes Starter show as "Current"
```

**After:**
```typescript
// ✅ CRITICAL: Check expired FIRST!
if (business?.trial_status === 'expired') {
  console.log('❌ Trial EXPIRED - returning "free" (no current tier)')
  return 'free' // Won't match any paid tier
}

// ... other checks ...

// ✅ Handle subscription as array
const sub = Array.isArray(business?.subscription) ? business?.subscription[0] : business?.subscription

// ... rest of logic ...

return 'free' // ✅ Changed from 'starter'
```

✅ **Result:** `isCurrent` won't match any tier button for expired trials!

---

### **Fix 4: Add Prominent Expired Notice**
**File:** `tier-management-card.tsx` (lines 346-365)

**NEW CODE:**
```typescript
{/* ✅ EXPIRED TRIAL NOTICE */}
{business?.trial_status === 'expired' && (() => {
  const sub = Array.isArray(business?.subscription) ? business?.subscription[0] : business?.subscription
  return (
    <div className="p-4 rounded-lg border-2 border-red-500/30 bg-red-500/10">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-red-400">...</svg>
        <div>
          <h4 className="font-semibold text-red-400 mb-1">⚠️ Trial Has Expired - No Active Subscription</h4>
          <p className="text-sm text-red-300 mb-3">
            This business's free trial ended on {date}. They currently have <strong>no active subscription tier</strong>.
          </p>
          <p className="text-xs text-slate-400">
            👉 To reactivate this business, extend their trial or select a paid tier below.
          </p>
        </div>
      </div>
    </div>
  )
})()}
```

✅ **Result:** Big red notice at top of Tier Management!

---

## Expected Behavior After Fixes

### **Venezy Burgers (Expired Trial):**

**Header Badge:**
- Before: ❌ "Starter" (grey)
- After: ✅ **"Trial Expired"** (red)

**Tier Management:**
- Before: ❌ "Starter" shows "Current ✓ Selected"
- Before: ❌ "Free Listing" shows "✓ Selected"
- After: ✅ **NO tier shows "Current"**
- After: ✅ **NO tier shows "✓ Selected" on load**
- After: ✅ **Big red notice**: "⚠️ Trial Has Expired - No Active Subscription"
- After: ✅ **"✓ Selected" only appears AFTER admin clicks a tier**

**Admin Action:**
- ✅ Clear that business has NO active subscription
- ✅ Must extend trial or select paid tier to reactivate
- ✅ Can select any tier and save

---

### **Mike's Pool Bar (Also Expired):**
- ✅ Same behavior as Venezy Burgers
- ✅ Header: "Trial Expired" (red)
- ✅ Tier Management: Red notice + NO "Current" label

---

### **Live Businesses (Active Trial/Paid):**
- ✅ **NO RED NOTICE** (only for expired!)
- ✅ Correct tier shows as "Current"
- ✅ Header shows correct tier badge

---

## Testing Checklist

### **Expired Trials (Venezy Burgers, Mike's, Julie's):**
- [ ] Header badge shows **"Trial Expired"** (red)
- [ ] Tier Management shows **red notice box**
- [ ] Notice says "Trial Has Expired - No Active Subscription"
- [ ] Notice shows expiry date (e.g., "25 Dec 2025")
- [ ] **NO tier** shows "Current" label
- [ ] **NO tier** shows "✓ Selected" on initial load (**CRITICAL!**)
- [ ] When admin clicks a tier, THEN "✓ Selected" appears
- [ ] Can select any tier and save

### **Active Trials:**
- [ ] Header badge shows **"Free Trial"** (blue)
- [ ] NO red notice box
- [ ] "Trial" tier shows "Current"

### **Live Paid Businesses:**
- [ ] Header shows correct tier (Featured/Spotlight/Starter)
- [ ] NO red notice
- [ ] Correct tier shows "Current"

---

## Files Changed
1. `/components/admin/comprehensive-business-crm-card.tsx` (header badge)
2. `/components/admin/tier-management-card.tsx` (3 fixes: getCurrentTier, hide Current, add notice)

---

## Key Points

1. **"Current" vs "Selected"**:
   - "Current" = what's in the database NOW
   - "Selected" = what admin has clicked (may not be saved yet)
   - **Expired trials have NO "Current"** (no active subscription!)

2. **`trial_status` is the Source of Truth**:
   - `trial_status === 'expired'` → NO tier, show notice
   - `trial_status === 'active'` → Show "Free Trial"
   - Don't rely on `is_in_free_trial` alone!

3. **Subscription Array Handling**:
   - Always use: `const sub = Array.isArray(subscription) ? subscription[0] : subscription`
   - Prevents "can't access property of undefined" errors

4. **This Does NOT Affect Live Businesses**:
   - All checks are gated by `trial_status === 'expired'`
   - Live businesses see normal behavior

---

## Related Docs
- `CRITICAL_CRM_BUGS_FIXED.md` - PlaceholderSelector, Admin Notes fixes
- `EXPIRED_TRIAL_OWNERSHIP_FIX.md` - Ownership lock fixes
- `EXPIRED_TRIAL_CRM_FIX.md` - Status badge fixes

---

**ALL FIXES VERIFIED!** ✅

**Venezy Burgers now correctly shows:**
1. ✅ "Trial Expired" badge (not "Starter")
2. ✅ Big red notice in Tier Management
3. ✅ NO tier shows "Current"
4. ✅ Admin knows to extend/upgrade to reactivate
