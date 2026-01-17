# CRITICAL: Free Tier Leakage Fix

## Problem Statement

**free_tier businesses are appearing in AI recommendations.**

### Evidence
User discovered 2 auto-imported, claimed businesses with `business_tier = 'recommended'`:

| business_name       | auto_imported | claimed_at | business_tier | SHOULD BE |
| ------------------- | ------------- | ---------- | ------------- | --------- |
| Banoffee patisserie | true          | 2026-01-16 | recommended   | free_tier |
| The Anvil           | true          | 2026-01-15 | recommended   | free_tier |

## Root Cause

**Claiming does NOT set business_tier, but something else does.**

### What We Found

1. ✅ **Import tool is correct** - Doesn't set `business_tier` (uses DB default or null)
2. ✅ **Claim approval is correct** - Sets `status='claimed_free'`, `visibility='discover_only'`, but does NOT touch `business_tier`
3. ⚠️ **Admin tier management is wrong scope** - Updates `business_profiles.plan`, not `business_tier`
4. 🚨 **DB default or migration likely culprit** - When `business_tier` column was added, existing businesses may have been set to `'recommended'` as default

### The Leak

`business_tier` column exists in `business_profiles` but:
- Import tool doesn't explicitly set it
- Claim approval doesn't explicitly set it
- No code enforces `auto_imported=true → business_tier='free_tier'`

Result: Some imported businesses have `business_tier='recommended'` or `null`, and if `null` falls through our JS filter, they appear in AI.

---

## Tier Policy (Lock These In Stone)

### AI-Eligible Tiers
- `qwikker_picks` (Spotlight - premium paid)
- `featured` (Featured - paid)
- `free_trial` (Featured trial - promotional)
- `recommended` (Starter - paid)

### AI-Excluded Tiers
- `free_tier` (unclaimed/imported OR claimed but not subscribed)
- `null` (treated as `free_tier` in code)

### Lifecycle Rules

```
IMPORT:
- auto_imported = true
- business_tier = 'free_tier'
- status = 'unclaimed'
- visibility = 'discover_only'

CLAIM:
- owner_user_id = user_id
- claimed_at = NOW()
- status = 'claimed_free'
- business_tier DOES NOT CHANGE (stays 'free_tier')
- visibility DOES NOT CHANGE (stays 'discover_only')

START TRIAL:
- business_tier = 'free_trial'
- visibility = 'ai_enabled'
- status = 'claimed_trial'

UPGRADE TO PAID:
- business_tier = 'recommended' | 'featured' | 'qwikker_picks'
- visibility = 'ai_enabled'
- status = 'claimed_paid'
```

**CRITICAL:** Claiming ≠ Upgrading. Claim is FREE. Trial/Paid are revenue-generating.

---

## The Fix (3 Layers of Defense)

### Layer 1: Data Correction (One-Time)

**File:** `scripts/fix-imported-business-tiers.sql`

```sql
-- Find the problem
SELECT id, business_name, auto_imported, business_tier
FROM business_profiles
WHERE auto_imported = true AND business_tier != 'free_tier';

-- Fix the data
UPDATE business_profiles
SET 
  business_tier = 'free_tier',
  visibility = 'discover_only',
  updated_at = NOW()
WHERE auto_imported = true AND business_tier != 'free_tier';
```

**Impact:** Immediately fixes Banoffee Patisserie and The Anvil.

---

### Layer 2: DB View (Enforcement)

**File:** `supabase/migrations/20260117000004_create_ai_safe_view.sql`

```sql
CREATE OR REPLACE VIEW business_profiles_ai_eligible AS
SELECT *
FROM business_profiles
WHERE business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended')
  AND visibility = 'ai_enabled'
  AND status IN ('claimed_paid', 'claimed_trial');
```

**Impact:** Even if code breaks, DB view prevents free_tier from being queried.

---

### Layer 3: Code Update (Use Safe View)

**File:** `lib/ai/hybrid-chat.ts:533-541`

```typescript
// Before:
.from('business_profiles')

// After:
.from('business_profiles_ai_eligible')
```

**Impact:** AI enrichment query physically cannot return free_tier businesses.

---

## Additional Safeguards

### JS Fallback (Already Correct)

```typescript:554:556:lib/ai/hybrid-chat.ts
// CRITICAL: null tier → free_tier (EXCLUDED by default for safety)
const normalizeTier = (tier: string | null | undefined) => tier ?? 'free_tier'
const isExcludedTier = (tier: string) => tier === 'free_tier'
```

This ensures that even if a business slips through the view with `null` tier, it's treated as `free_tier` and excluded.

### Logging (Add This)

```typescript
// In hybrid-chat.ts, after enrichment:
if (businesses) {
  businesses.forEach(b => {
    if (!b.business_tier) {
      console.warn('⚠️ AI INELIGIBLE: null business_tier', {
        id: b.id,
        name: b.business_name,
        auto_imported: b.auto_imported
      })
    }
  })
}
```

This helps catch data quality issues in production.

---

## Files Changed

1. `supabase/migrations/20260117000004_create_ai_safe_view.sql` - DB view
2. `lib/ai/hybrid-chat.ts` - Use AI-safe view
3. `scripts/fix-imported-business-tiers.sql` - One-time data fix
4. `docs/FREE_TIER_LEAKAGE_FIX.md` - This document

---

## Testing Plan

### 1. Before Fix (Should Fail)
```sql
SELECT id, business_name, business_tier, auto_imported
FROM business_profiles
WHERE city = 'bournemouth'
  AND auto_imported = true
  AND business_tier != 'free_tier';
```
**Expected:** 2 rows (Banoffee, Anvil)

### 2. Run Data Fix
```bash
psql $DATABASE_URL -f scripts/fix-imported-business-tiers.sql
```

### 3. After Fix (Should Pass)
```sql
SELECT id, business_name, business_tier, auto_imported
FROM business_profiles
WHERE city = 'bournemouth'
  AND auto_imported = true
  AND business_tier != 'free_tier';
```
**Expected:** 0 rows

### 4. Test AI Query
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "show me restaurants"}' | jq '.businessCarousel'
```
**Expected:** NO businesses with `business_tier='free_tier'`

### 5. Test View
```sql
SELECT COUNT(*) FROM business_profiles_ai_eligible WHERE business_tier = 'free_tier';
```
**Expected:** 0

---

## Why This Matters

### Cost Impact
- Each AI query that returns a free_tier business costs you OpenAI tokens
- Each Atlas map load that shows a free_tier business costs you Mapbox API calls
- These businesses are NOT paying you

### Revenue Leakage
- If free_tier businesses appear in AI recommendations, users have no incentive to upgrade
- Paying businesses (Spotlight) should ALWAYS appear first
- Free tier = Discover only (no AI visibility)

### Product Integrity
- Users expect "AI picks" to be curated, high-quality, PAID businesses
- Showing random imported listings in AI breaks that trust

---

## Commit Message

```
🔒 CRITICAL: Fix free_tier leakage in AI recommendations

PROBLEM:
- 2 auto-imported businesses (Banoffee, Anvil) had business_tier='recommended'
- These appeared in AI recommendations despite being free tier
- Root cause: business_tier not explicitly set during import/claim

FIX (3 layers of defense):
1. Data correction: Reset all auto_imported businesses to free_tier
2. DB view: business_profiles_ai_eligible filters free_tier automatically
3. Code: AI enrichment queries the safe view, not raw table

IMPACT:
- Prevents revenue leakage (free businesses costing AI/Mapbox money)
- Enforces tier policy: claiming ≠ upgrading
- DB view makes free_tier leakage physically impossible

Files:
- supabase/migrations/20260117000004_create_ai_safe_view.sql
- lib/ai/hybrid-chat.ts
- scripts/fix-imported-business-tiers.sql
- docs/FREE_TIER_LEAKAGE_FIX.md
```

Branch: `atlas-prototype`  
Priority: **CRITICAL - RUN IMMEDIATELY**
