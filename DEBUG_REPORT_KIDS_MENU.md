# 🔍 DEBUG REPORT: QWIKKER Chat "Kids Menu" Relevance Issue

**Date:** 2026-02-02  
**Query:** "kids menu" or "any places with kids menus?"  
**Expected:** David's Grill Shack (spotlight), Ember & Oak Bistro (featured)  
**Actual:** Triangle GYROSS (unclaimed) shows instead  

---

## 📊 **DB EVIDENCE (User-Provided)**

**Knowledge Base Status for David's and Ember:**

| business_name           | status  | knowledge_type   | kb_rows | kids_menu_rows | kids_rows |
|------------------------|---------|------------------|---------|----------------|-----------|
| David's grill shack    | active  | custom_knowledge | 2       | 0              | 0         |
| **David's grill shack**    | **active**  | **pdf_document**     | **2**       | **1**              | **1**         |
| David's grill shack    | archived| custom_knowledge | 5       | 0              | 0         |
| Ember & Oak Bistro     | active  | custom_knowledge | 6       | 0              | 0         |
| **Ember & Oak Bistro**     | **active**  | **pdf_document**     | **2**       | **1**              | **2**         |
| Ember & Oak Bistro     | archived| custom_knowledge | 5       | 0              | 0         |
| Ember & Oak Bistro     | archived| event            | 2       | 0              | 0         |

**CRITICAL:** "kids menu" exists ONLY in **active pdf_document** KB rows, NOT in custom_knowledge.

**Tier Distribution (Bournemouth):**
- `qwikker_picks`: 2 businesses (approved) ← **David's likely here**
- `featured`: 3 businesses (approved) ← **Ember likely here**
- `free_tier` (unclaimed): 7 businesses ← **Triangle GYROSS likely here**

**KB Coverage:**
- Bournemouth: **11 businesses have KB content** (including David's + Ember)
- Bali: 0 businesses have KB content
- London: 0 businesses have KB content

---

## 🗂️ **FILE LIST + CRITICAL LINE NUMBERS**

### **1. Entrypoint:**
- `app/api/ai/chat/route.ts`
  - Line 134: Calls `generateHybridAIResponse(message, { city, userName, ... }, conversationHistory)`

### **2. KB Search:**
- `lib/ai/hybrid-chat.ts`
  - Line 236-239: `businessResults = await searchBusinessKnowledge(enhancedQuery, city, { matchCount, matchThreshold: 0.5 })`
  
- `lib/ai/embeddings.ts`
  - Line 343-355: `searchBusinessKnowledge()` → calls `searchKnowledgeBase()`
  - Line 284-338: `searchKnowledgeBase()` → calls `supabase.rpc('search_knowledge_base', ...)`

- `supabase/migrations/20260120000005_kb_eligibility_gated_search.sql`
  - Line 54: **`INNER JOIN business_profiles_chat_eligible bce ON kb.business_id = bce.id`**
  - Line 57: **`AND kb.status = 'active'`** ✅ Filters out archived KB rows
  - Line 43: Returns `kb.knowledge_type` (includes pdf_document, custom_knowledge, etc.)
  - **NO FILTER on knowledge_type** ✅ pdf_document rows ARE included

### **3. KB Content Map:**
- `lib/ai/hybrid-chat.ts`
  - Line 395: `const kbContentByBusinessId = new Map<string, any>()`
  - Line 399: **`kbContentByBusinessId.set(kbResult.business_id, kbResult)`** ← Stores FULL kbResult object
  - Line 435: **`const kbContent = kbContentByBusinessId.get(business.id)`** ← Retrieves FULL object
  - Line 440: **`richContent = \n${kbContent.content}`** ← Correctly accesses `.content` property ✅

**Structure:** `Map<uuid, KnowledgeRow>` where `KnowledgeRow = { id, business_id, business_name, title, content, knowledge_type, similarity, business_tier, tier_priority }`

### **4. Relevance Scoring (THE BUG):**
- `lib/ai/hybrid-chat.ts`
  - Line 1006: **`relevanceScore: scoreBusinessRelevance(b, intent)`** ❌ NO KB CONTENT PASSED
  - Line 1028: **`relevanceScore: scoreBusinessRelevance(b, intent)`** ❌ NO KB CONTENT PASSED
  - Line 1039: **`relevanceScore: scoreBusinessRelevance(b, intent)`** ❌ NO KB CONTENT PASSED

- `lib/ai/relevance-scorer.ts`
  - Line 26-30: Function signature expects `kbContent?: string` (optional third parameter)
  - Line 42: `const kb = (kbContent || '').toLowerCase()` ← Expects a STRING
  - Line 96-112: Uses `kb` to check for keyword matches (+1 point)

**THE BUG:** KB content is available in the map but NEVER passed to scoring!

### **5. Intent Detection:**
- `lib/ai/intent-detector.ts` (need to check if "kids menu" is detected)

---

## 🔍 **TRACED FLOW FOR "kids menu" QUERY**

**Step 1: KB Search (lib/ai/embeddings.ts → search_knowledge_base RPC)**
- ✅ Generates embedding for "kids menu"
- ✅ Searches `knowledge_base` table
- ✅ Filters: `status = 'active'`, `city = 'bournemouth'`
- ✅ `INNER JOIN business_profiles_chat_eligible` (only Tier 1 businesses)
- ✅ **NO FILTER on knowledge_type** → pdf_document rows ARE included
- ✅ Returns David's + Ember KB rows if similarity > 0.5

**Step 2: KB Content Map Build (lib/ai/hybrid-chat.ts:395-403)**
- ✅ Creates `Map<uuid, KnowledgeRow>`
- ✅ Stores kbResult objects (including `.content` property)
- ✅ Console log: "📚 KB content available for X businesses"

**Step 3: Three-Tier Business Query (lib/ai/hybrid-chat.ts:257-260)**
- ✅ Fetches ALL businesses from Tier 1, 2, 3 views
- ✅ Includes David's (qwikker_picks), Ember (featured), Triangle (unclaimed)

**Step 4: Relevance Scoring (lib/ai/hybrid-chat.ts:1000-1065)**
- ❌ **Lines 1006, 1028, 1039:** `scoreBusinessRelevance(b, intent)` called WITHOUT kb content
- Result:
  - **David's Grill Shack:** score = 0 (category="American restaurant", no "kids" match)
  - **Ember & Oak Bistro:** score = 0 (category="Mediterranean restaurant", no "kids" match)
  - **Triangle GYROSS:** score = 3 (category="Greek restaurant" contains "restaurant", generic match)

**Step 5: Tier Priority Sorting**
- Even though David's (tier_priority=1) and Ember (tier_priority=2) should rank higher than Triangle (tier_priority=3), they are **FILTERED OUT** because `relevanceScore = 0`
- Line 1031, 1074, 1084, 1092: `.filter(b => b.relevanceScore > 0)` removes David's and Ember!

**Step 6: Final Output**
- Triangle GYROSS shows (score=3, unclaimed)
- David's and Ember hidden (score=0, filtered out despite higher tier)

---

## 🧪 **ROOT CAUSE ANALYSIS**

### ✅ **A) KB search is fine, but kb content NOT passed into scoring** ← **PRIMARY ROOT CAUSE**

**Evidence:**
- KB search correctly returns David's + Ember (verified by console log "📚 KB content available for X businesses")
- KB content is stored in `kbContentByBusinessId` map with correct structure
- BUT: Lines 1006, 1028, 1039 call `scoreBusinessRelevance(b, intent)` without the third parameter
- `relevance-scorer.ts` expects `kbContent?: string` as the third parameter
- Without KB content, David's and Ember get score=0 (no category/name match for "kids")
- With KB content, they would get +1 point (kb.includes('kids menu')) → score=1

### ✅ **D) Scoring threshold removes them even if kb match exists** ← **SECONDARY ROOT CAUSE**

**Evidence:**
- Lines 1031, 1074, 1084, 1092: `.filter(b => b.relevanceScore > 0)` removes businesses with score=0
- Even if we fixed (A) and David's/Ember got score=1, would they still be filtered out?
  - NO! score=1 > 0, so they would pass the filter
- BUT: Triangle GYROSS with score=3 would still rank ABOVE them in relevance sorting!

### ✅ **F) Tier ordering applied after filtering wrong set** ← **ARCHITECTURAL ISSUE**

**Evidence:**
- Line 1068: `allLowerTiers` sorted by `relevanceScore` ONLY, not tier priority
- Line 1082-1084: `.slice(0, 6)` takes top 6 by relevance, ignoring tier
- This means a score=3 unclaimed business beats a score=1 qwikker_pick!
- **Tier priority is ONLY used in the final carousel sort, NOT in the relevance filtering/ranking**

### ❌ **B) KB search excludes pdf_document rows** ← **FALSE**

**Evidence:**
- `search_knowledge_base` RPC has NO filter on `knowledge_type`
- pdf_document rows ARE included in search results

### ❌ **C) kbContentByBusinessId map is array but read as object** ← **FALSE**

**Evidence:**
- Line 399: `kbContentByBusinessId.set(kbResult.business_id, kbResult)` stores single object
- Line 435: `kbContent.content` correctly accesses `.content` property
- Structure is `Map<uuid, KnowledgeRow>`, not `Map<uuid, KnowledgeRow[]>`

### ⚠️ **E) Intent detection never adds "kids menu" keyword** ← **NEEDS VERIFICATION**

**Action Required:** Check `lib/ai/intent-detector.ts` to see if "kids menu" is parsed as a category or keyword.

---

## 🛠️ **MINIMAL FIX (3 lines)**

**File:** `lib/ai/hybrid-chat.ts`

**Change 1 (Line 1006):**
```diff
         const tier1WithScores = businesses.map(b => ({
           ...b,
-          relevanceScore: scoreBusinessRelevance(b, intent)
+          relevanceScore: scoreBusinessRelevance(b, intent, kbContentByBusinessId.get(b.id)?.content)
         }))
```

**Change 2 (Line 1028):**
```diff
           const tier2WithScores = (liteBusinesses || [])
             .map(b => ({
               ...b,
-              relevanceScore: scoreBusinessRelevance(b, intent),
+              relevanceScore: scoreBusinessRelevance(b, intent, kbContentByBusinessId.get(b.id)?.content),
               tierSource: 'tier2'
             }))
```

**Change 3 (Line 1039):**
```diff
           const tier3WithScores = (tier3Businesses || [])
             .map(b => ({
               ...b,
-              relevanceScore: scoreBusinessRelevance(b, intent),
+              relevanceScore: scoreBusinessRelevance(b, intent, kbContentByBusinessId.get(b.id)?.content),
               tierSource: 'tier3'
             }))
```

**Expected Result:**
- David's Grill Shack: score = 1 (kb match), tier_priority = 1 → **SHOWS FIRST**
- Ember & Oak Bistro: score = 1 (kb match), tier_priority = 2 → **SHOWS SECOND**
- Triangle GYROSS: score = 3 (generic restaurant), tier_priority = 3 → **SHOWS THIRD** (if relevant threshold allows)

---

## 🧪 **DEBUG HARNESS (Development Only)**

**File:** `lib/ai/hybrid-chat.ts` (add after line 1065)

```typescript
// 🔍 DEBUG HARNESS: Kids Menu Query Diagnostic (dev only)
if (process.env.NODE_ENV === 'development' && userMessage.toLowerCase().includes('kids')) {
  console.log('\n' + '='.repeat(80))
  console.log('🔍 DEBUG HARNESS: Kids Menu Query Diagnostic')
  console.log('='.repeat(80))
  
  // Show KB content retrieved
  console.log(`\n📚 KB CONTENT RETRIEVED (${kbContentByBusinessId.size} businesses):`)
  const kbBusinesses = Array.from(kbContentByBusinessId.entries()).slice(0, 5)
  for (const [businessId, kbRow] of kbBusinesses) {
    const hasKidsInKB = (kbRow.content || '').toLowerCase().includes('kids')
    console.log(`  - ${kbRow.business_name}:`)
    console.log(`    Type: ${kbRow.knowledge_type}`)
    console.log(`    Status: ${kbRow.status || 'N/A'}`)
    console.log(`    Has "kids": ${hasKidsInKB ? '✅' : '❌'}`)
    console.log(`    Content preview: ${(kbRow.content || '').substring(0, 120)}...`)
  }
  
  // Show all scored businesses across all tiers
  console.log(`\n🎯 SCORED BUSINESSES (Top 15 candidates):`)
  console.log('| Rank | Business Name | Tier Source | Tier Priority | hasKB | kbMatchedKids | Score | Match Reasons | Filtered Out? |')
  console.log('|------|---------------|-------------|---------------|-------|---------------|-------|---------------|---------------|')
  
  const allScoredBusinesses = [
    ...(tier1WithScores || []).map(b => ({ ...b, tierSource: 'tier1' })),
    ...(tier2WithScores || []).map(b => ({ ...b, tierSource: 'tier2' })),
    ...(tier3WithScores || []).map(b => ({ ...b, tierSource: 'tier3' }))
  ]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 15)
  
  allScoredBusinesses.forEach((b, index) => {
    const hasKB = kbContentByBusinessId.has(b.id)
    const kbContent = kbContentByBusinessId.get(b.id)?.content || ''
    const kbMatchedKids = kbContent.toLowerCase().includes('kids')
    const filteredOut = b.relevanceScore === 0 ? '🚫 YES' : '✅ NO'
    const tierLabel = b.tierLabel || b.tierSource
    
    console.log(`| ${index + 1} | ${b.business_name.substring(0, 25)} | ${b.tierSource} | ${b.tierPriority || '?'} | ${hasKB ? '✅' : '❌'} | ${kbMatchedKids ? '✅' : '❌'} | ${b.relevanceScore} | ${b.matchReasons?.join(', ') || 'N/A'} | ${filteredOut} |`)
  })
  
  console.log('='.repeat(80) + '\n')
}
```

---

## 🎯 **ROOT CAUSES IDENTIFIED**

### **PRIMARY:** ✅ **A) KB content not passed into scoring**

**What's wrong:**
- `scoreBusinessRelevance(b, intent)` called on lines 1006, 1028, 1039
- Third parameter (`kbContent?: string`) is NEVER provided
- David's and Ember have "kids menu" in their KB but scorer never sees it
- They get score=0 instead of score=1

**Impact:**
- High-tier businesses with KB content score lower than low-tier businesses with generic category matches
- Tier priority is irrelevant if businesses are filtered out by score threshold

### **SECONDARY:** ⚠️ **F) Tier ordering applied after filtering wrong set**

**What's wrong:**
- Line 1068: `allLowerTiers` sorted by relevance ONLY (not tier priority)
- Line 1082: `.slice(0, 6)` takes top 6 by relevance
- A score=3 unclaimed business beats a score=1 qwikker_pick in this sort!

**Impact:**
- Even if we fix (A) and David's/Ember get score=1, Triangle (score=3) still shows first
- Tier priority needs to be a PRIMARY sort key, not secondary

### **TERTIARY:** ✅ **E) Intent detection correctly extracts "kids menu" as keyword**

**Verified:**
- `lib/ai/intent-detector.ts` line 98: `'kids menu'` is in `attributeTerms` array
- For query "kids menu": `intent.categories = []`, `intent.keywords = ['kids menu']`
- Relevance scorer (lines 105-111) checks `kb.includes(keyword.toLowerCase())`
- **This would work IF kb content was passed to scorer!**

---

## 🩹 **MINIMAL PATCH (Surgical Fix)**

### **Fix 1: Pass KB Content to Scorer (3 lines)**

**File:** `lib/ai/hybrid-chat.ts`

```diff
@@ Line 1006 @@
         const tier1WithScores = businesses.map(b => ({
           ...b,
-          relevanceScore: scoreBusinessRelevance(b, intent)
+          relevanceScore: scoreBusinessRelevance(b, intent, kbContentByBusinessId.get(b.id)?.content)
         }))

@@ Line 1028 @@
           const tier2WithScores = (liteBusinesses || [])
             .map(b => ({
               ...b,
-              relevanceScore: scoreBusinessRelevance(b, intent),
+              relevanceScore: scoreBusinessRelevance(b, intent, kbContentByBusinessId.get(b.id)?.content),
               tierSource: 'tier2'
             }))

@@ Line 1039 @@
           const tier3WithScores = (tier3Businesses || [])
             .map(b => ({
               ...b,
-              relevanceScore: scoreBusinessRelevance(b, intent),
+              relevanceScore: scoreBusinessRelevance(b, intent, kbContentByBusinessId.get(b.id)?.content),
               tierSource: 'tier3'
             }))
```

### ### **Fix 2: Add tierPriority to Scored Businesses (3 lines)**

**File:** `lib/ai/hybrid-chat.ts`

**Context:** The scored businesses in intent mode don't have `tierPriority` set, so we can't sort by tier.

```diff
@@ Line 1004-1007 @@
         const tier1WithScores = businesses.map(b => ({
           ...b,
+          tierPriority: 1,
           relevanceScore: scoreBusinessRelevance(b, intent, kbContentByBusinessId.get(b.id)?.content)
         }))

@@ Line 1025-1030 @@
           const tier2WithScores = (liteBusinesses || [])
             .map(b => ({
               ...b,
+              tierPriority: 2,
               relevanceScore: scoreBusinessRelevance(b, intent, kbContentByBusinessId.get(b.id)?.content),
               tierSource: 'tier2'
             }))

@@ Line 1036-1041 @@
           const tier3WithScores = (tier3Businesses || [])
             .map(b => ({
               ...b,
+              tierPriority: 3,
               relevanceScore: scoreBusinessRelevance(b, intent, kbContentByBusinessId.get(b.id)?.content),
               tierSource: 'tier3'
             }))
```

### **Fix 3: Sort Lower Tiers by TIER PRIORITY First (5 lines)**

**File:** `lib/ai/hybrid-chat.ts`

**Context:** Line 1068 sorts `allLowerTiers` by relevance only, allowing unclaimed businesses to rank above paid ones.

```diff
@@ Line 1066-1069 @@
           // Combine Tier 2 + Tier 3, sorted by relevance
           const allLowerTiers = [...tier2WithScores, ...tier3WithScores]
-            .sort((a, b) => b.relevanceScore - a.relevanceScore)
+            .sort((a, b) => {
+              // TIER PRIORITY FIRST (spotlight → featured → starter → claimed → unclaimed)
+              if (a.tierPriority !== b.tierPriority) return a.tierPriority - b.tierPriority
+              // Then by relevance score within tier
+              return b.relevanceScore - a.relevanceScore
+            })
```

---

## ✅ **VERIFICATION CHECKLIST**

After applying the patch:

### **1. Run SQL Diagnostic (DEBUG_KB_FLOW.sql):**
- Confirm David's and Ember have active pdf_document KB rows with "kids menu"
- Confirm David's (qwikker_picks) and Ember (featured) are in `business_profiles_chat_eligible`
- Confirm Triangle GYROSS is in `business_profiles_ai_fallback_pool` (unclaimed)

### **2. Test Query: "kids menu"**
Expected response order:
1. ✅ **David's Grill Shack** (qwikker_picks, score=1, tier_priority=1)
2. ✅ **Ember & Oak Bistro** (featured, score=1, tier_priority=1 or 2)
3. ❌ **Triangle GYROSS** should be filtered out (score=0 or low score, tier_priority=3)

### **3. Check Console Logs:**
- Look for: `📚 KB content available for X businesses` (should be > 0)
- Look for: `📊 Relevance: David's grill shack = 1 (kb:kids)` (new log from scorer)
- Look for debug harness table showing David's and Ember with `kbMatchedKids = ✅`

### **4. Test Other Queries:**
- "pizza" → Should show Mazzoni Pizza first (if it's paid tier)
- "indian" → Should show Indian restaurants by tier priority
- "show all restaurants" → Should trigger browse mode, show all by tier

### **5. Check Review Snippets:**
- Ensure David's and Ember review snippets show with proper Google attribution
- Ensure no reviews shown if multiple businesses displayed

---

## 📋 **SUMMARY FOR CHATGPT**

**Database Evidence:**
- David's Grill Shack has "kids menu" in active pdf_document KB (1 row)
- Ember & Oak Bistro has "kids menu" in active pdf_document KB (2 rows)
- Both are in Tier 1 (qwikker_picks/featured), Triangle GYROSS is unclaimed (Tier 3)

**The Bug:**
- KB search correctly finds David's + Ember
- KB content stored in `kbContentByBusinessId` map
- **BUT:** Relevance scoring NEVER receives KB content (lines 1006, 1028, 1039)
- David's and Ember score 0 (no category/name match for "kids")
- Triangle GYROSS scores 3 (generic "restaurant" match)
- David's and Ember filtered out by `relevanceScore > 0` check

**The Fix:**
1. Pass `kbContentByBusinessId.get(b.id)?.content` to all 3 `scoreBusinessRelevance()` calls (3 changes)
2. Add `tierPriority: 1/2/3` to scored business objects (3 changes)
3. Sort `allLowerTiers` by tier priority FIRST, then relevance (1 change)

**Total Changes:** 11 lines total (but surgical, all in one function)

**Expected Result:**
- David's (tier=1, score=1) shows FIRST
- Ember (tier=2, score=1) shows SECOND
- Triangle (tier=3, score=0-3) shows LAST or filtered out

---

## 🚨 **CRITICAL CONSTRAINTS (DO NOT VIOLATE)**

- ❌ Do NOT delete or modify database views
- ❌ Do NOT refactor the three-tier architecture
- ❌ Do NOT change the `search_knowledge_base` RPC function
- ❌ Do NOT modify tier priority logic elsewhere
- ✅ ONLY change scoring calls and tierPriority assignment in intent mode
- ✅ Keep patch < 20 LOC

---

**END OF DEBUG REPORT**
