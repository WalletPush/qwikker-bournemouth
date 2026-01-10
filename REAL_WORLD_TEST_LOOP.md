# 🧪 REAL-WORLD TEST LOOP (5 Minutes)

## After deploying Phase 1 + Sprint 1, run this test loop to verify everything works.

---

## Test 0: Phase 1 Health Check (Run First!)

**This single query catches 90% of category problems instantly:**

```sql
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN system_category IS NULL THEN 1 ELSE 0 END) AS null_system,
  SUM(CASE WHEN display_category IS NULL THEN 1 ELSE 0 END) AS null_display,
  SUM(CASE WHEN system_category NOT IN (
    'restaurant','cafe','bar','dessert','takeaway','salon','barber','tattoo',
    'retail','fitness','sports','hotel','venue','entertainment','professional','other'
  ) THEN 1 ELSE 0 END) AS invalid_system
FROM business_profiles;
```

### **Expected Results:**
```
total         | 15 (or however many businesses you have)
null_system   | 0   ✅ All have system_category
null_display  | 0   ✅ All have display_category
invalid_system| 0   ✅ All are valid enums
```

### **If ANY are non-zero:**
- `null_system > 0` or `null_display > 0`: Phase 1 migration didn't run or backfill failed
  - **Fix:** Run `migrations/001_add_category_layers.sql`
- `invalid_system > 0`: Some categories didn't map correctly
  - **Fix:** Find invalid rows:
    ```sql
    SELECT business_name, system_category
    FROM business_profiles
    WHERE system_category NOT IN (
      'restaurant','cafe','bar','dessert','takeaway','salon','barber','tattoo',
      'retail','fitness','sports','hotel','venue','entertainment','professional','other'
    );
    ```
  - Manually fix with UPDATE or re-run migration

**If all zeros: ✅ Phase 1 migration successful! Continue with remaining tests.**

---

## Test 1: Create Business via Onboarding

### **Steps:**
1. Start dev server: `pnpm dev`
2. Go to onboarding form
3. Create a new test business:
   - Name: "Test Restaurant Sprint 1"
   - Category: Select "Restaurant" (or any category)
   - Fill required fields
4. Submit

### **Verify in Database:**
```sql
SELECT 
  business_name,
  system_category,
  display_category,
  business_category,  -- Should be auto-synced by trigger
  google_types,
  status
FROM business_profiles
WHERE business_name LIKE '%Test Restaurant%'
ORDER BY created_at DESC
LIMIT 1;
```

### **Expected Results:**
```
business_name      | "Test Restaurant Sprint 1"
system_category    | "restaurant"              ✅ Stable enum
display_category   | "Restaurant"              ✅ User-friendly label
business_category  | "Restaurant"              ✅ Auto-synced by trigger
google_types       | {} or NULL                ✅ Empty for onboarded (default '{}')
status             | Any valid status          ✅ Depends on workflow
```

### **Verify AI Knowledge Base:**

**First, check if KB entry exists (may be async):**
```sql
SELECT COUNT(*) as kb_entries
FROM knowledge_base
WHERE business_id = (
  SELECT id FROM business_profiles 
  WHERE business_name LIKE '%Test Restaurant%' 
  ORDER BY created_at DESC 
  LIMIT 1
)
AND knowledge_type = 'custom_knowledge';
```

**If `kb_entries = 0`:** Knowledge base may be generated asynchronously. Trigger it by:
- Approving the business (if workflow requires)
- Using admin "Sync Knowledge Base" button
- Updating the business profile

**Then check the KB content:**
```sql
SELECT 
  title,
  content,
  metadata->>'system_category' as system_cat,
  metadata->>'display_category' as display_cat,
  tags
FROM knowledge_base
WHERE business_id = (
  SELECT id FROM business_profiles 
  WHERE business_name LIKE '%Test Restaurant%' 
  ORDER BY created_at DESC 
  LIMIT 1
)
AND knowledge_type = 'custom_knowledge'
LIMIT 1;
```

### **Expected Results:**
```
title       | "Test Restaurant Sprint 1 - Basic Information"
content     | Contains "Category: Restaurant"
system_cat  | "restaurant"                     ✅ Stable enum in metadata
display_cat | "Restaurant"                     ✅ User-friendly in metadata
tags        | ["restaurant", "incomplete", ...] ✅ Uses system_category (lowercase)
```

---

## Test 2: Import Business from Google Places

### **Steps:**
1. Go to `/admin/import` (if you have Google API key configured)
2. Search for a city (e.g., "Bournemouth")
3. Select category (e.g., "Restaurant")
4. Set min rating: 4.4
5. Preview → Select 1 business → Import

### **Verify in Database:**
```sql
SELECT 
  business_name,
  system_category,
  display_category,
  business_category,  -- Should be auto-synced by trigger
  google_types,
  auto_imported,
  status
FROM business_profiles
WHERE auto_imported = true
ORDER BY created_at DESC
LIMIT 1;
```

### **Expected Results:**
```
business_name      | "Joe's Pizza" (or whatever imported)
system_category    | "restaurant"              ✅ Mapped from google_types
display_category   | "Restaurant"              ✅ Derived from SYSTEM_CATEGORY_LABEL
business_category  | "Restaurant"              ✅ Auto-synced by trigger
google_types       | ["restaurant", "food", "point_of_interest"] ✅ Raw Google data
auto_imported      | true
status             | "unclaimed"
```

---

## Test 3: Check Analytics Grouping

### **Steps:**
1. Visit a business (as a user)
2. Check analytics endpoint

### **Verify Analytics Groups Correctly:**
```sql
SELECT 
  bp.system_category,
  bp.display_category,
  COUNT(ubv.id) as visit_count
FROM user_business_visits ubv
JOIN business_profiles bp ON bp.id = ubv.business_id
WHERE ubv.created_at > NOW() - INTERVAL '1 day'
GROUP BY bp.system_category, bp.display_category
ORDER BY visit_count DESC;
```

### **Expected:**
- Analytics should group by `system_category` (stable)
- Display labels from `display_category`
- No errors or null categories

### **Check for Broken Joins (Critical):**
```sql
SELECT COUNT(*) as bad_rows
FROM user_business_visits ubv
LEFT JOIN business_profiles bp ON bp.id = ubv.business_id
WHERE ubv.created_at > NOW() - INTERVAL '1 day'
  AND (bp.id IS NULL OR bp.system_category IS NULL);
```

### **Expected:**
```
bad_rows | 0  ✅ No orphaned visits or missing categories
```

**If `bad_rows > 0`:** Some visits point to businesses without `system_category`. Check:
- Did Phase 1 migration run successfully?
- Are there deleted businesses still referenced in visits?

---

## Test 4: Check All Existing Businesses

### **Verify Backfill Worked:**
```sql
SELECT 
  COUNT(*) as total,
  COUNT(system_category) as has_system,
  COUNT(display_category) as has_display,
  COUNT(business_category) as has_legacy
FROM business_profiles;
```

### **Expected:**
```
total       | 15 (or however many you have)
has_system  | 15  ✅ All have system_category
has_display | 15  ✅ All have display_category
has_legacy  | 15  ✅ All still have business_category (backward compat)
```

### **Check Distribution:**
```sql
SELECT 
  system_category,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM business_profiles
GROUP BY system_category
ORDER BY count DESC;
```

### **Expected:**
- All categories should be valid enums (restaurant, cafe, bar, etc.)
- No "Casual Dining" or other arbitrary strings
- Distribution looks reasonable

---

## Test 5: Check Trigger is Working

### **Create a New Business (Any Method):**
Then immediately check:

```sql
SELECT 
  business_name,
  system_category,
  display_category,
  business_category,
  CASE 
    WHEN business_category = display_category THEN '✅ Synced by trigger'
    WHEN business_category IS NULL AND display_category IS NOT NULL THEN '❌ Trigger not working!'
    ELSE '⚠️  Check manually (may be set by code)'
  END as trigger_status
FROM business_profiles
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### **Expected:**
- All new rows: `trigger_status = '✅ Synced by trigger'`
- If `⚠️ Check manually`: Some code may be writing `business_category` directly (not necessarily broken)
- If any show `❌ Trigger not working!`, check:
  ```sql
  SELECT tgname, tgenabled 
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relname = 'business_profiles'
    AND tgname = 'trg_tmp_sync_business_category';
  ```
  
**Expected trigger check:**
```
tgname                        | trg_tmp_sync_business_category
tgenabled                     | O  (enabled)
```

---

## Test 6: Run Tracking Script

```bash
./scripts/track-legacy-reads.sh
```

### **Expected Output:**
```
🚨 CRITICAL FILES (must be using new fields):
  ✅ lib/ai/embeddings.ts: Fixed!
  ✅ lib/ai/hybrid-chat.ts: Fixed!
  ✅ lib/ai/chat.ts: Fixed!
  ✅ app/api/analytics/comprehensive/route.ts: Fixed!
  ✅ lib/actions/file-actions.ts: Fixed!
  ✅ lib/actions/knowledge-base-actions.ts: Fixed!
```

---

## Troubleshooting:

### **Issue: `system_category` is NULL on new business**
**Fix:** Check Phase 1 migration ran successfully:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'business_profiles'
  AND column_name IN ('system_category', 'display_category', 'google_types');
```

### **Issue: `business_category` is NULL (trigger not working)**
**Fix:** Run the trigger migration:
```bash
psql [conn] < migrations/001a_temporary_bandaid_sync_business_category.sql
```

### **Issue: Knowledge base has old category format**
**Fix:** Re-sync knowledge base for test business:
```sql
-- Delete old entries
DELETE FROM knowledge_base WHERE business_id = '[TEST_BUSINESS_ID]';

-- Trigger will re-create on next profile update or via admin sync
```

---

## Success Criteria:

✅ New onboarded business has all 3 category fields  
✅ Imported business has `google_types` + mapped categories  
✅ Knowledge base metadata uses `system_category` + `display_category`  
✅ Analytics groups by `system_category`  
✅ Trigger syncs `business_category` automatically  
✅ All 6 critical files show "Fixed!" in tracking script  

---

**If all tests pass: Ship it! 🚀**

**If any fail: Check the specific section above for troubleshooting.**

