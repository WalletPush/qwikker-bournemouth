# Production-Safe Category Migration (2 Phases)

## 🚨 Why 2 Phases?

ChatGPT identified 4 gotchas that could **brick your production database** if done in one shot:

1. **NOT NULL too early** → Migration fails on any edge case row
2. **CHECK constraint too early** → Migration fails if backfill doesn't map perfectly
3. **Renaming columns immediately** → Breaks existing code instantly
4. **Fuzzy label mapping** → Need hard CASE statements for all label variations

**Solution:** Split into 2 phases with a "safety gap" between them.

---

## ✅ Phase 1: Add Columns & Backfill (SAFE, NON-BREAKING)

**File:** `migrations/phase1_add_system_category.sql`

**What it does:**
- Adds `google_types text[]` (nullable)
- Adds `system_category TEXT` (nullable)
- Adds `display_category TEXT` (nullable)
- **Copies** `business_category` → `display_category` (does NOT rename)
- Backfills `system_category` with **hard mapping** (handles all label variations)
- Adds index for performance
- Includes verification queries

**Safety features:**
- ✅ All columns are nullable (no insert failures)
- ✅ No CHECK constraint yet (no constraint violations)
- ✅ Keeps `business_category` in place (code doesn't break)
- ✅ Can be rolled back easily

**Run this:**
```bash
psql [your_connection_string] < migrations/phase1_add_system_category.sql
```

**After Phase 1:**
- Old code still works (reads `business_category`)
- New code can use `system_category` or `display_category`
- You have time to update code gradually

---

## ⏳ Safety Gap (24-48 hours minimum)

**DO NOT proceed to Phase 2 until:**

1. ✅ Phase 1 deployed successfully
2. ✅ Verified backfill worked (check the queries)
3. ✅ All code updated to use `system_category` and `display_category`
4. ✅ Tested in staging/dev
5. ✅ Monitored production for 24-48 hours (catch any edge cases)

**During this gap:**
- Update onboarding form
- Update import tool
- Update discover page
- Update business card component
- Update placeholder calls
- Deploy code changes
- Test thoroughly

---

## 🔒 Phase 2: Tighten Constraints (DEPLOY AFTER CODE IS UPDATED)

**File:** `migrations/phase2_tighten_system_category.sql`

**What it does:**
- **Pre-flight checks** (fails fast if data isn't ready)
- Adds CHECK constraint to `system_category`
- Makes `system_category` NOT NULL
- Optionally drops `business_category` column (commented out by default)
- Cleans up old constraints

**Safety features:**
- ✅ Pre-flight checks fail loudly if data isn't ready
- ✅ Only runs after you've confirmed Phase 1 worked
- ✅ Column drop is optional (you choose when to pull the trigger)

**Run this:**
```bash
# ONLY after Phase 1 + code updates + testing!
psql [your_connection_string] < migrations/phase2_tighten_system_category.sql
```

**After Phase 2:**
- `system_category` is locked down (NOT NULL + CHECK constraint)
- Database enforces valid categories on all new inserts
- Old `business_category` column can be dropped (optional)

---

## 📋 Complete Migration Timeline

### Day 1: Phase 1 Deployment
```
1. [09:00] Deploy Phase 1 SQL
2. [09:05] Verify backfill results
3. [09:10] Confirm no NULL system_category rows
4. [09:15] Check category distribution looks correct
```

### Day 1-2: Code Updates
```
5. Update 5 files to use system_category/display_category
6. Test locally
7. Deploy code to staging
8. Test staging thoroughly
9. Deploy code to production
10. Monitor for 24-48 hours
```

### Day 3+: Phase 2 Deployment
```
11. Confirm all code is working with new columns
12. Run pre-flight checks manually
13. Deploy Phase 2 SQL
14. Verify constraints are in place
15. (Optional) Drop old business_category column
```

---

## 🎯 The 5 Files to Update (Between Phase 1 & 2)

### 1. Onboarding Form
**Before:**
```typescript
// Old: uses business_category
<select name="category">
  <option value="Restaurant">Restaurant</option>
  <option value="Cafe/Coffee Shop">Cafe/Coffee Shop</option>
</select>

// Saves: business_category = "Restaurant"
```

**After:**
```typescript
import { ONBOARDING_CATEGORY_OPTIONS } from '@/lib/constants/system-categories'

<select name="category">
  {ONBOARDING_CATEGORY_OPTIONS.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>

// Saves:
// system_category = "restaurant"
// display_category = "Restaurant" (derived from SYSTEM_CATEGORY_LABEL)
```

### 2. Import Tool
**Before:**
```typescript
// Old: tries to guess category from Google types
const category = place.types.includes('cafe') ? 'Cafe' : 'Restaurant'
```

**After:**
```typescript
import { mapGoogleTypesToSystemCategory, SYSTEM_CATEGORY_LABEL } from '@/lib/constants/system-categories'

const system_category = mapGoogleTypesToSystemCategory(place.types)
const display_category = SYSTEM_CATEGORY_LABEL[system_category]

// Save:
{
  google_types: place.types, // Preserve raw Google data
  system_category,
  display_category
}
```

### 3. Business Card Component
**Before:**
```typescript
<p className="text-sm text-gray-500">
  {business.business_category}
</p>
```

**After:**
```typescript
<p className="text-sm text-gray-500">
  {business.display_category}
</p>
```

### 4. Discover Page Filters
**Before:**
```typescript
// Old: filters by business_category (unreliable)
const { data } = await supabase
  .from('business_profiles')
  .select('*')
  .eq('business_category', selectedCategory)
```

**After:**
```typescript
// New: filters by system_category (stable enum)
const { data } = await supabase
  .from('business_profiles')
  .select('*')
  .eq('system_category', selectedCategory) // ← system_category
```

### 5. Placeholder Component
**Before:**
```typescript
// Old: uses business_category (might not match folder names)
const placeholder = getPlaceholder(
  business.business_category,
  business.google_place_id,
  business.placeholder_variant
)
```

**After:**
```typescript
// New: uses system_category (always matches /public/placeholders/{category}/)
const placeholder = getPlaceholder(
  business.system_category, // ← system_category!
  business.google_place_id,
  business.placeholder_variant
)
```

---

## 🔍 Verification Checklist

### After Phase 1:
- [ ] All businesses have `system_category` set (no NULLs)
- [ ] `display_category` copied from `business_category`
- [ ] Category distribution looks correct
- [ ] Old code still works (uses `business_category`)

### After Code Updates:
- [ ] Onboarding saves `system_category`
- [ ] Import tool maps Google types → `system_category`
- [ ] Discover filters by `system_category`
- [ ] Business cards display `display_category`
- [ ] Placeholders load correctly

### After Phase 2:
- [ ] `system_category` is NOT NULL
- [ ] CHECK constraint prevents invalid categories
- [ ] New inserts work correctly
- [ ] No errors in production

---

## 🚨 Rollback Plan

### If Phase 1 Fails:
```sql
-- Easy rollback (columns are nullable, nothing breaks)
ALTER TABLE business_profiles DROP COLUMN IF EXISTS google_types;
ALTER TABLE business_profiles DROP COLUMN IF EXISTS system_category;
ALTER TABLE business_profiles DROP COLUMN IF EXISTS display_category;
```

### If Phase 2 Fails:
```sql
-- Remove constraints
ALTER TABLE business_profiles DROP CONSTRAINT IF EXISTS business_profiles_system_category_check;
ALTER TABLE business_profiles ALTER COLUMN system_category DROP NOT NULL;
```

---

## ✅ Why This is Production-Safe

| Risk | Single-Phase (Dangerous) | Two-Phase (Safe) |
|------|-------------------------|------------------|
| **Insert failures** | ❌ NOT NULL blocks inserts | ✅ Nullable, no blocks |
| **Constraint violations** | ❌ CHECK fails on bad data | ✅ No CHECK until Phase 2 |
| **Code breakage** | ❌ Rename breaks old code | ✅ Old column stays |
| **Mapping errors** | ❌ One chance to get right | ✅ Can fix before Phase 2 |
| **Rollback** | ❌ Hard to undo | ✅ Easy per phase |

---

## 🎯 Current Status

**Phase 1:** ✅ Ready to deploy  
**Code Updates:** ⏳ Pending  
**Phase 2:** ⏳ DO NOT RUN until code is updated  
**Placeholders:** ⏳ Generate after Phase 1 (uses stable `system_category` keys)

---

## 🚀 Next Steps (In Order)

1. **NOW:** Deploy Phase 1 (5 minutes, safe)
2. **Day 1-2:** Update 5 code files (30-60 minutes)
3. **Day 1-2:** Test thoroughly in dev/staging
4. **Day 1-2:** Deploy code to production
5. **Day 1-2:** Monitor for 24-48 hours
6. **Day 3+:** Deploy Phase 2 (5 minutes, after confirmation)
7. **After Phase 2:** Generate placeholders with ChatGPT

---

**Ready to deploy Phase 1?** It's safe, reversible, and won't break anything! 🏗️

