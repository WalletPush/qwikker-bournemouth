# SOCIAL WIZARD — SCHEMA FIX COMPLETE

**Date:** 2026-02-04  
**Issue:** Code was using wrong column names (`effective_tier` instead of `plan`)  
**Status:** ✅ FIXED

---

## THE PROBLEM

I was making assumptions about your database schema instead of checking it. The code was looking for `effective_tier` which doesn't exist in your `business_profiles` table.

**Your actual schema uses:**
- ✅ `plan` (not `effective_tier`)
- ✅ `user_id` (correct)
- ✅ `business_name` (correct)
- ✅ `system_category` (not just `category`)
- ✅ `business_tagline` (not `vibe`)

---

## WHAT WAS FIXED

### Files Updated (5 total):

1. ✅ **`app/business/social-wizard/page.tsx`**
   - Changed `effective_tier` → `plan`
   - Removed duplicate null check

2. ✅ **`app/api/social/ai/generate/route.ts`**
   - Changed `effective_tier` → `plan`

3. ✅ **`app/api/social/ai/generate-campaign/route.ts`**
   - Changed `effective_tier` → `plan`

4. ✅ **`lib/social-wizard/contextBuilder.ts`**
   - Changed `effective_tier` → `plan`
   - Fixed SELECT to use actual columns: `system_category`, `business_tagline`

5. ✅ **Created correct sanity check:**
   - `SOCIAL_WIZARD_SANITY_CHECK_CORRECT.sql` — Uses YOUR actual schema

---

## YOUR ACTUAL SCHEMA (business_profiles)

**Key columns for Social Wizard:**
```
id                  uuid (PK)
user_id             uuid (FK to auth.users)
business_name       text
plan                text (starter/spotlight/pro/featured)
system_category     text
business_tagline    text
business_town       text
business_images     text[]
city                text
status              text
```

**Tier values in `plan` column:**
- `starter` → Locked view
- `featured` → Basic access
- `spotlight` → Full access (campaigns, secret menu)
- `pro` → Full access

---

## READY TO TEST

### Step 1: Run the Correct Sanity Check

**File:** `SOCIAL_WIZARD_SANITY_CHECK_CORRECT.sql`

1. Open Supabase SQL Editor
2. Copy entire file contents
3. Paste and Run
4. Look for: `✅ ✅ ✅ SAFE TO RUN MIGRATION ✅ ✅ ✅`

### Step 2: If Safe, Run Migration

**File:** `supabase/migrations/20260204000001_create_social_wizard_v1.sql`

1. Copy entire file
2. Paste in SQL Editor
3. Run

### Step 3: Test

Navigate to:
```
http://localhost:3000/business/social-wizard
```

**Expected results based on your `plan`:**
- `plan = 'starter'` → ❌ LOCKED - See upgrade view only
- `plan = 'featured'` → ⚠️  LIMITED ACCESS - Basic generation only (no campaigns, no secret menu)
- `plan = 'spotlight'` or `'pro'` → ✅ FULL ACCESS - Everything including campaigns and secret menu

---

## NO MORE ASSUMPTIONS

From now on, if I need to know about your schema, I'll ask you to run:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'your_table'
ORDER BY ordinal_position;
```

---

## NEXT STEPS

1. ✅ **Run:** `SOCIAL_WIZARD_SANITY_CHECK_CORRECT.sql`
2. ✅ **If safe, run migration**
3. ✅ **Test:** Navigate to Social Wizard page
4. ✅ **Report:** Share what you see (tier, any errors)

---

**Status:** Ready for testing! 🎯
