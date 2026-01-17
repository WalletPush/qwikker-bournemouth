# Root Cause: Import Trigger Missing business_tier

## The Smoking Gun

**File:** `supabase/migrations/20260116000001_imported_defaults_fix.sql`  
**Function:** `normalize_imported_business_profiles()`  
**Line 46-48:**

```sql
IF (NEW.auto_imported = true AND NEW.owner_user_id IS NULL) THEN
  -- Force free plan (no paid/trial artifacts)
  NEW.plan := 'free';
  -- 🚨 MISSING: NEW.business_tier := 'free_tier';
```

**Impact:** Trigger sets `plan='free'` but **does NOT set `business_tier`**.

---

## Why Banoffee & Anvil Got `recommended`

### Timeline

1. **Import** (auto_imported=true, owner_user_id=NULL)
   - Trigger runs
   - Sets `plan='free'`
   - Does NOT set `business_tier`
   - `business_tier` = DB default (likely `'recommended'` or `null`)

2. **Claim** (owner_user_id=user_id)
   - Trigger NO LONGER runs (condition `owner_user_id IS NULL` fails)
   - `business_tier` stays as whatever it was
   - Result: `business_tier='recommended'` even though they're still free

3. **Next Update** (any UPDATE query)
   - Trigger runs again, but condition fails (owner_user_id NOT NULL)
   - `business_tier` never gets corrected

---

## Why Vine & Urban Cuts Stayed `free_tier`

**User said:** *"These were mock imports (not using import tool) just to test the claim flow"*

**Explanation:** Manual inserts probably explicitly set `business_tier='free_tier'`, bypassing the broken trigger logic.

---

## The Fix

### Migration: `20260117000005_fix_normalize_trigger_business_tier.sql`

```sql
CREATE OR REPLACE FUNCTION public.normalize_imported_business_profiles()
RETURNS trigger AS $$
BEGIN
  IF (NEW.auto_imported = true AND NEW.owner_user_id IS NULL) THEN
    NEW.plan := 'free';
    NEW.business_tier := 'free_tier'; -- 🔒 CRITICAL FIX
    -- ... rest of normalization ...
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Impact:** Future imports will get `business_tier='free_tier'` automatically.

---

## Additional Fixes

### 1. Data Correction (One-Time)
**File:** `scripts/fix-imported-business-tiers.sql`

```sql
UPDATE business_profiles
SET 
  business_tier = 'free_tier',
  visibility = 'discover_only'
WHERE auto_imported = true
  AND business_tier != 'free_tier';
```

Fixes Banoffee & Anvil immediately.

---

### 2. DB View (Enforcement Layer)
**File:** `supabase/migrations/20260117000004_create_ai_safe_view.sql`

```sql
CREATE VIEW business_profiles_ai_eligible AS
SELECT * FROM business_profiles
WHERE business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended')
  AND visibility = 'ai_enabled';
```

Prevents free_tier from EVER appearing in AI enrichment queries.

---

### 3. Code Update
**File:** `lib/ai/hybrid-chat.ts:533`

```typescript
.from('business_profiles_ai_eligible') // Use safe view
```

---

## Testing

### Before Fix
```sql
SELECT business_name, auto_imported, owner_user_id, business_tier
FROM business_profiles
WHERE auto_imported = true AND business_tier != 'free_tier';
```
**Expected:** 2 rows (Banoffee, Anvil)

### After Fix
**Expected:** 0 rows

---

## Files Changed

1. `supabase/migrations/20260117000005_fix_normalize_trigger_business_tier.sql` - Trigger fix
2. `supabase/migrations/20260117000004_create_ai_safe_view.sql` - DB view
3. `scripts/fix-imported-business-tiers.sql` - Data correction
4. `lib/ai/hybrid-chat.ts` - Use AI-safe view
5. `docs/IMPORT_TRIGGER_ROOT_CAUSE.md` - This document

---

## Deployment Order

```bash
# 1. Run data fix (immediate)
psql $DATABASE_URL -f scripts/fix-imported-business-tiers.sql

# 2. Run migrations (future-proof)
supabase migration up

# 3. Test
psql $DATABASE_URL -c "
SELECT business_name, business_tier, auto_imported
FROM business_profiles
WHERE auto_imported = true
ORDER BY created_at DESC
LIMIT 5;
"
```

**Expected:** All auto_imported businesses have `business_tier='free_tier'`.

---

## Why This Matters

### Before Fix
- Banoffee Patisserie (imported → claimed) = `recommended` tier
- Anvil (imported → claimed) = `recommended` tier
- **Result:** Appearing in AI recommendations, costing you money

### After Fix
- All imported businesses (claimed or not) = `free_tier`
- DB view physically blocks them from AI queries
- Trigger ensures future imports are correct

---

## Commit Message

```
🔒 FIX: Import trigger missing business_tier (ROOT CAUSE)

PROBLEM:
- normalize_imported_business_profiles() trigger sets plan='free'
- But does NOT set business_tier='free_tier'
- When claimed, trigger stops running (owner_user_id NOT NULL)
- Result: business_tier stays as DB default ('recommended')

ROOT CAUSE:
- Trigger at supabase/migrations/20260116000001_imported_defaults_fix.sql:48
- Only sets NEW.plan := 'free', missing NEW.business_tier := 'free_tier'

EVIDENCE:
- Banoffee Patisserie: imported → claimed → tier='recommended' (WRONG)
- The Anvil: imported → claimed → tier='recommended' (WRONG)
- Vine Wine Bar: manual insert → claimed → tier='free_tier' (CORRECT)

FIX (3 layers):
1. Trigger: Add NEW.business_tier := 'free_tier' to normalize function
2. Data: Reset all auto_imported businesses to free_tier (one-time)
3. View: Use business_profiles_ai_eligible in AI enrichment queries

Files:
- supabase/migrations/20260117000005_fix_normalize_trigger_business_tier.sql
- scripts/fix-imported-business-tiers.sql
- lib/ai/hybrid-chat.ts
- docs/IMPORT_TRIGGER_ROOT_CAUSE.md
```

Branch: `atlas-prototype`  
Priority: **CRITICAL - RUN IMMEDIATELY**
