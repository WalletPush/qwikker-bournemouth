# KB SEARCH LOCKDOWN - STOP EXPIRED DEALS FROM SHOWING VIA KB

**Date:** 2026-01-20  
**Status:** ✅ COMPLETE  
**Objective:** Prevent knowledge_base search from returning expired deals and ineligible business information.

---

## 🎯 PROBLEM: KB WAS THE LEAK

### The Real Issue

**Chat was already using `chat_active_deals`** (✅ correct for direct offer queries)

**BUT:** Venezy's expired deals were showing because they were coming from **knowledge_base retrieval**, NOT from the offers query!

When users asked "What deals are available?", the AI:
1. ✅ Queried `chat_active_deals` (correctly excluded Venezy)
2. ❌ Also searched `knowledge_base` via `searchBusinessKnowledge()` (found Venezy's KB entries)
3. ❌ KB entries for Venezy contained text like "Enjoy 50% off your bill" (expired deal)
4. ❌ AI included this in the response because it was "relevant knowledge"

**Result:** Even though the offers query was correct, the KB search leaked expired information.

---

## 📋 HOW KB LEAKAGE HAPPENED

### Before (❌ BROKEN):

**RPC:** `search_knowledge_base()`
```sql
LEFT JOIN business_profiles bp ON kb.business_id = bp.id
WHERE kb.status = 'active'
  AND (similarity > threshold)
```

**Problems:**
1. **LEFT JOIN** = Includes businesses even if they don't exist or are ineligible
2. **No subscription check** = Includes expired trials, unclaimed, free tier
3. **Uses `bp.business_tier`** = Stale column from business_profiles

**Result:** KB entries for Julie's Sports Pub, Venezy Burgers (both expired trials) were being retrieved and included in AI responses.

---

## ✅ SOLUTION: ELIGIBILITY-GATED KB SEARCH

### After (✅ FIXED):

**RPC:** `search_knowledge_base()` (updated)
```sql
INNER JOIN business_profiles_chat_eligible bce ON kb.business_id = bce.id
WHERE kb.status = 'active'
  AND (similarity > threshold)
ORDER BY tier_priority ASC, similarity DESC
```

**Improvements:**
1. **INNER JOIN** with `business_profiles_chat_eligible` = ONLY eligible businesses
2. **Subscription-based** = Excludes expired trials, unclaimed, free tier
3. **Uses `effective_tier` and `tier_priority`** = Computed from subscriptions
4. **Also includes general city knowledge** (business_id IS NULL) via UNION

**Result:** KB search ONLY returns entries for approved + subscribed businesses (paid active OR trial active).

---

## 🗂️ FILES CHANGED

### 1. **`/supabase/migrations/20260120000005_kb_eligibility_gated_search.sql`**
- **Purpose:** Update `search_knowledge_base()` RPC to enforce business eligibility
- **Key Changes:**
  - Changed `LEFT JOIN business_profiles` to `INNER JOIN business_profiles_chat_eligible`
  - Uses `effective_tier` and `tier_priority` from eligibility view
  - Added UNION for general city knowledge (business_id IS NULL)
  - Orders by tier_priority first, then similarity
- **Effect:** KB search ONLY returns entries for eligible businesses

### 2. **`/lib/ai/hybrid-chat.ts`**
- **Lines 383-420:** Already using `chat_active_deals` ✅
- **Lines 387-395:** Added `valid_until` to SELECT
- **Lines 412-418:** Added dev console log showing each deal with expiry date
  - Format: `${business_name} | ${offer_name} | ends ${expiry_date}`
  - Only in development mode

### 3. **`/lib/ai/chat.ts`**
- **Lines 1122-1151:** Already using `chat_active_deals` ✅
- **Lines 1124-1132:** Added `valid_until` to SELECT
- **Lines 1149-1156:** Added dev console log showing each deal with expiry date
  - Format: `${business_name} | ${offer_name} | ends ${expiry_date}`
  - Only in development mode

---

## 🧪 VERIFICATION

### Test 1: Verify Venezy/Julie's Don't Appear (Jan 20)

**In browser console after asking "What deals are available?":**

**Expected logs:**
```
📋 Current Deals (Jan 20 verification):
  - David's Grill Shack | Kids eat free | ends No expiry
  - Emma's Cafe | Free coffee | ends 3/15/2026
```

**Should NOT see:**
```
❌ Venezy Burgers | ... | ends 1/1/2026  (EXPIRED - Jan 20 is after this)
❌ Julie's Sports Pub | ... | ends 12/31/2025  (EXPIRED)
```

---

### Test 2: Run SQL to Check KB Entries Excluded

```sql
-- Count KB entries that are now excluded by eligibility
SELECT COUNT(*) AS excluded_kb_entries
FROM knowledge_base kb
LEFT JOIN business_profiles_chat_eligible bce ON kb.business_id = bce.id
WHERE kb.city = 'bournemouth'
  AND kb.status = 'active'
  AND kb.business_id IS NOT NULL  -- Only business-specific KB
  AND bce.id IS NULL;  -- Business NOT in eligible view

-- Expected: > 0 (some KB entries are excluded)
```

---

### Test 3: Show Which Businesses Have KB But Are Excluded

```sql
SELECT 
  bp.business_name,
  bp.status,
  bp.auto_imported,
  COUNT(kb.id) AS kb_entries_count,
  CASE
    WHEN bp.status IN ('unclaimed', 'pending_claim') THEN 'UNCLAIMED'
    WHEN bp.status = 'claimed_free' THEN 'CLAIMED_FREE'
    WHEN bp.id NOT IN (SELECT id FROM business_profiles_chat_eligible) THEN 'NOT_CHAT_ELIGIBLE'
    ELSE 'OTHER'
  END AS exclusion_reason
FROM knowledge_base kb
JOIN business_profiles bp ON bp.id = kb.business_id
LEFT JOIN business_profiles_chat_eligible bce ON bce.id = bp.id
WHERE kb.city = 'bournemouth'
  AND kb.status = 'active'
  AND bce.id IS NULL  -- Not eligible
GROUP BY bp.business_name, bp.status, bp.auto_imported, bp.id
ORDER BY exclusion_reason, kb_entries_count DESC;
```

**Expected:** Should show Venezy, Julie's, and other expired trial businesses.

---

### Test 4: Test KB Search with Specific Query

```sql
-- This would require generating an actual embedding, so run via API instead
-- Ask chat: "Tell me about Venezy Burgers deals"
-- Expected: NO response about Venezy (KB search excludes it)
```

---

## 📊 BEFORE/AFTER COMPARISON

| Aspect | Before (❌) | After (✅) |
|--------|------------|----------|
| **KB Search Join** | LEFT JOIN business_profiles | INNER JOIN business_profiles_chat_eligible |
| **Eligibility Check** | None | Subscription-based (paid/trial active) |
| **Expired Trials** | Included in KB search | Excluded |
| **Free Tier** | Included | Excluded |
| **Unclaimed** | Included | Excluded |
| **Tier Source** | `bp.business_tier` (stale) | `bce.effective_tier` (subscription-based) |
| **Ordering** | tier_priority (stale) → similarity | tier_priority (computed) → similarity |
| **Venezy on Jan 20** | ❌ Shows expired deals | ✅ Excluded from KB search |

---

## 🚀 DEPLOYMENT

```bash
cd /Users/qwikker/qwikkerdashboard

# 1. Apply migration
supabase db push

# 2. Test in browser (dev mode)
# - Open chat
# - Ask "What are the current deals?"
# - Check console logs for deal list with expiry dates
# - Verify NO Venezy or Julie's appear

# 3. Deploy
git add .
git commit -m "feat: KB search lockdown - prevent expired deals via knowledge_base

- Update search_knowledge_base RPC to INNER JOIN business_profiles_chat_eligible
- Exclude KB entries for expired trials, unclaimed, free tier
- Add dev console logs showing deal expiry dates for Jan 20 verification
- Ensures Venezy/Julie's expired deals never appear in chat"

git push origin main
```

---

## 🔧 OPTIONAL: CLEANUP STALE KB ENTRIES

**WARNING:** This is destructive. Only run if you want to permanently remove KB entries for ineligible businesses.

### Option 1: Archive (Recommended)
```sql
-- Archive KB entries for ineligible businesses (keeps them in DB but inactive)
UPDATE knowledge_base kb
SET status = 'archived'
WHERE kb.business_id IS NOT NULL
  AND kb.business_id NOT IN (SELECT id FROM business_profiles_chat_eligible);
```

### Option 2: Delete (Permanent)
```sql
-- Permanently delete KB entries for ineligible businesses
DELETE FROM knowledge_base kb
WHERE kb.business_id IS NOT NULL
  AND kb.business_id NOT IN (SELECT id FROM business_profiles_chat_eligible);
```

**When to run:**
- After confirming KB search works correctly
- When you want to save database space
- When you're sure expired trial businesses won't re-activate

**Effect:**
- Removes KB entries for: expired trials, unclaimed, auto-imported, free tier
- Keeps KB entries for: approved + subscribed businesses only
- Keeps general city knowledge (business_id IS NULL)

---

## 📖 WHY BOTH CHAT_ACTIVE_DEALS AND KB LOCKDOWN?

### Two Separate Data Sources:

1. **`chat_active_deals`** (Offers Query)
   - Used when chat directly queries for "current deals"
   - Returns structured offer data
   - Already locked down ✅

2. **`search_knowledge_base`** (KB Retrieval)
   - Used for semantic search ("Tell me about X", "What's good at Y?")
   - Returns text content from KB (menus, deals descriptions, business info)
   - **Was NOT locked down** ❌ → **Now fixed** ✅

### The Leak:

Even if offers query is correct, KB can leak expired deal DESCRIPTIONS like:
- "Enjoy 50% off your bill" (Venezy - expired)
- "Free seasoned fries with any meal" (Julie's - expired)

These are stored in KB as business information and retrieved via semantic search.

**Solution:** Lock down BOTH data sources - offers query AND KB search.

---

## ✅ COMPLETION STATUS

| Task | Status |
|------|--------|
| Update `search_knowledge_base()` RPC | ✅ COMPLETE |
| INNER JOIN with chat_eligible view | ✅ COMPLETE |
| Add general knowledge UNION | ✅ COMPLETE |
| Add dev console logs to hybrid-chat.ts | ✅ COMPLETE |
| Add dev console logs to chat.ts | ✅ COMPLETE |
| Create verification queries | ✅ COMPLETE |
| Document KB cleanup options | ✅ COMPLETE |

**Date Completed:** 2026-01-20  
**Ready for deployment:** ✅ YES

---

## 📞 SUPPORT

**To verify fix is working:**
1. Check browser console logs for deal list with expiry dates
2. Verify NO deals with `ends` date before Jan 20
3. Run SQL verification queries (Test 2 & 3 above)

**If Venezy/Julie's still appear:**
- Check console logs - are they in the deal list?
- If YES: Migration not applied or query still broken
- If NO but AI mentions them: Check AI prompt/context (might be historical)

**Related Documentation:**
- `/CHAT_LOCKDOWN_COMPLETE_SUMMARY.md` - Complete lockdown overview
- `/CHAT_DEALS_LOCKDOWN.md` - Deals validity lockdown
- `/KB_DROPDOWN_LOCKDOWN.md` - KB target dropdown lockdown
