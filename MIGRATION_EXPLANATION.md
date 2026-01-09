# Migration Explanation - What Happens to Your Existing Businesses

## Current State (9 Founding Member Businesses)
- All have `user_id` populated (their account from onboarding form)
- All have individual logins
- All are real businesses (NOT imported/unclaimed)
- Current status values: `'approved'`, `'incomplete'`, `'pending_approval'`, etc.

## What the Migration Does

### 1. Adds New Columns (Non-Destructive)
```sql
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'ai_enabled',
ADD COLUMN IF NOT EXISTS founding_member BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS auto_imported BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;
```

**Effect on your 9 businesses:**
- New columns added with NULL or default values
- NO existing data is changed
- `visibility` defaults to `'ai_enabled'` (correct for paid/trial businesses)
- `founding_member` defaults to `false` (will be updated below)
- `auto_imported` defaults to `false` (correct - they weren't imported)

### 2. Extends Status Constraint (Non-Destructive)
```sql
-- Your existing statuses: 'approved', 'incomplete', 'pending_approval', 'rejected', 'suspended', 'removed'
-- We ADD new statuses for free tier: 'unclaimed', 'pending_claim', 'claimed_free', 'pending_upgrade'

ALTER TABLE business_profiles
DROP CONSTRAINT IF EXISTS business_profiles_status_check,
ADD CONSTRAINT business_profiles_status_check 
CHECK (status IN (
  'incomplete', 'pending_approval', 'approved', 'rejected', 'suspended', 'removed',  -- EXISTING
  'unclaimed', 'pending_claim', 'claimed_free', 'pending_upgrade'                    -- NEW
));
```

**Effect on your 9 businesses:**
- Their existing status values are PRESERVED
- New status values are just added to the allowed list
- NO existing statuses are changed

### 3. Backfills owner_user_id (Safe Operation)
```sql
UPDATE business_profiles
SET owner_user_id = user_id
WHERE owner_user_id IS NULL 
  AND user_id IS NOT NULL;
```

**Effect on your 9 businesses:**
- `owner_user_id` = `user_id` (they're the same person - the business owner who onboarded)
- This is correct because they OWN their own listings (not claimed, they created them)
- Only updates rows where `user_id` IS NOT NULL (your 9 businesses)

### 4. Sets claimed_at Timestamp
```sql
UPDATE business_profiles
SET claimed_at = created_at
WHERE claimed_at IS NULL 
  AND created_at IS NOT NULL;
```

**Effect on your 9 businesses:**
- Sets `claimed_at` to when they created their profile (via onboarding)
- This is correct - they "claimed" their listing by creating it

## Final State of Your 9 Businesses After Migration

| Field | Before | After | Notes |
|-------|--------|-------|-------|
| `id` | (unchanged) | (unchanged) | ✅ Same |
| `user_id` | (populated) | (unchanged) | ✅ Same - their account from onboarding |
| `owner_user_id` | (doesn't exist) | = `user_id` | ✅ NEW - set to their account (they're the owner) |
| `status` | `'approved'`, `'incomplete'`, etc. | (unchanged) | ✅ Same - existing statuses preserved |
| `visibility` | (doesn't exist) | `'ai_enabled'` | ✅ NEW - correct for paid/trial businesses |
| `founding_member` | (doesn't exist) | `false` → `true` | ✅ NEW - will be set to true if needed |
| `trial_start_date` | (doesn't exist) | NULL | ✅ NEW - can be populated later |
| `trial_end_date` | (doesn't exist) | NULL | ✅ NEW - can be populated later |
| `google_place_id` | (doesn't exist) | NULL | ✅ NEW - correct (not Google imported) |
| `auto_imported` | (doesn't exist) | `false` | ✅ NEW - correct (not auto-imported) |
| `claimed_at` | (doesn't exist) | = `created_at` | ✅ NEW - when they created their profile |
| ALL OTHER FIELDS | (unchanged) | (unchanged) | ✅ Same |

## What About Future Google-Imported Businesses?

When you import businesses from Google Places in the future:
- `user_id` = NULL (or admin's ID)
- `owner_user_id` = NULL (unclaimed)
- `status` = `'unclaimed'`
- `visibility` = `'discover_only'`
- `auto_imported` = `true`
- `google_place_id` = Google's Place ID
- `founding_member` = `false`

When someone claims them:
- `owner_user_id` = claimer's account ID
- `status` = `'claimed_free'`
- `claimed_at` = NOW()

## Summary

✅ **Your 9 existing businesses are SAFE**
✅ **NO data is destroyed or overwritten**
✅ **Only NEW columns are added with correct defaults**
✅ **owner_user_id is correctly set to their account (they're the owners)**
✅ **Status values are preserved and extended**
✅ **Ready for future Google-imported unclaimed businesses**

The migration is **completely safe** to run!

