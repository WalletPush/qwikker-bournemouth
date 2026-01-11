# Discover Page Ordering Strategy

**Goal:** Balance paid tier value with user experience quality

---

## ✅ **Phase 1: IMPLEMENTED (Rating-First)**

**File:** `app/user/discover/page.tsx`

**Current ordering:**
```typescript
.order('rating', { ascending: false, nullsFirst: false })
.order('review_count', { ascending: false, nullsFirst: false })
.order('created_at', { ascending: false })
```

**What this achieves:**
- ✅ Highest quality businesses show first (4.8★ before 4.4★)
- ✅ More reviewed businesses prioritized (100 reviews > 10 reviews)
- ✅ Recent businesses as tiebreaker
- ✅ Stops "latest import dominates" problem
- ✅ Page instantly feels higher quality

**Example result:**
```
1. Italian Restaurant - 4.8★ (250 reviews) - claimed 2 weeks ago
2. Coffee Shop - 4.7★ (180 reviews) - imported yesterday
3. Wine Bar - 4.7★ (95 reviews) - claimed 1 month ago
4. Sushi Restaurant - 4.6★ (120 reviews) - imported today
```

**User perception:** "Qwikker shows me the best places"

---

## 🎯 **Phase 2: Tier-Based Priority (Future)**

### **The Problem with Pure Rating-First**

**Scenario:**
```
Unclaimed 4.8★ free listing shows above
Paid Spotlight 4.6★ business

Result:
- Spotlight customer feels cheated ("Why am I paying?")
- You lose pricing leverage
- Tier value unclear to businesses
```

---

### **The Solution: Blended Feed with Paid Bias**

**Hierarchy (Clear + Defensible):**
1. ⭐⭐⭐ **Spotlight** (highest price) - Guaranteed above-the-fold
2. ⭐⭐ **Featured** - Shows early and often
3. ⭐ **Starter / Recommended** - Mixed naturally
4. **Free / Unclaimed** - Fills gaps, long-tail

**CRITICAL:** NOT as hard blocks (looks scammy):
```
❌ BAD:
All Spotlight
All Featured
All Starter
All Free
(Users feel it's "ads not recommendations")
```

```
✅ GOOD:
Blended with bias
Spotlight guaranteed top
Featured appears frequently
Quality still matters
(Users feel it's "curated recommendations")
```

---

## 🧠 **Recommended Implementation**

### **Above-the-Fold (First 6-8 Cards)**

**Guaranteed placement:**
```
Card 1: Spotlight (highest rating in Spotlight tier)
Card 2: Spotlight (second highest in Spotlight)
Card 3: Featured (highest rating in Featured tier)
Card 4: Featured (second highest in Featured)
Card 5: Recommended/Starter (highest rated)
Card 6: Recommended/Starter (second highest)
```

**Why this works:**
- Spotlight customers get immediate visibility
- Featured customers see clear value difference
- Still shows variety (not all same category)
- Doesn't scream "ads"

---

### **Below-the-Fold (Rest of Feed)**

**Blended quality-first with soft tier bias:**
```sql
-- Pseudo-query (can't do this directly in Supabase .order())
WITH scored_businesses AS (
  SELECT *,
    CASE 
      WHEN plan = 'spotlight' THEN 1000
      WHEN plan = 'featured' THEN 500
      WHEN plan = 'starter' THEN 100
      ELSE 0
    END + (rating * 100) + (review_count / 10) AS score
  FROM business_profiles
  WHERE status IN ('approved', 'unclaimed', 'claimed_free')
)
ORDER BY score DESC
```

**Effect:**
- Spotlight 4.5★ (100 reviews) = 1000 + 450 + 10 = **1460**
- Featured 4.8★ (150 reviews) = 500 + 480 + 15 = **995**
- Free 4.8★ (200 reviews) = 0 + 480 + 20 = **500**

**Result:**
- Paid tiers get algorithmic boost
- But exceptional free listings can still rank high
- Feels fair to users
- Clear value to businesses

---

## 🛠️ **Practical Implementation Options**

### **Option A: RPC Function (Clean, Recommended)**

Create Postgres function:
```sql
CREATE OR REPLACE FUNCTION get_discover_feed(p_city TEXT)
RETURNS TABLE (...) AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM business_profiles
  WHERE city = p_city
    AND status IN ('approved', 'unclaimed', 'claimed_free')
  ORDER BY 
    CASE plan
      WHEN 'spotlight' THEN 1
      WHEN 'featured' THEN 2
      WHEN 'starter' THEN 3
      ELSE 4
    END,
    rating DESC NULLS LAST,
    review_count DESC,
    created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

Call from Next.js:
```typescript
const { data } = await supabase.rpc('get_discover_feed', { p_city: currentCity })
```

**Pros:**
- Clean
- Fast (single query)
- Easy to A/B test different orderings
- SQL CASE ordering works perfectly

**Cons:**
- Requires migration
- Less flexible (need to redeploy for changes)

---

### **Option B: Client-Side Sorting (Quick, Flexible)**

```typescript
// Fetch all businesses
const { data: businesses } = await supabase
  .from('business_profiles')
  .select('*')
  .in('status', ['approved', 'unclaimed', 'claimed_free'])
  .eq('city', currentCity)

// Sort with tier bias
const sorted = businesses.sort((a, b) => {
  // Tier score
  const tierScore = (b) => {
    if (b.plan === 'spotlight') return 1000
    if (b.plan === 'featured') return 500
    if (b.plan === 'starter') return 100
    return 0
  }
  
  // Quality score
  const qualityScore = (b) => (b.rating || 0) * 100 + (b.review_count || 0) / 10
  
  // Combined score
  const scoreA = tierScore(a) + qualityScore(a)
  const scoreB = tierScore(b) + qualityScore(b)
  
  return scoreB - scoreA
})
```

**Pros:**
- No database changes
- Easy to iterate
- Can A/B test instantly

**Cons:**
- Slower (sorting in Node.js)
- Doesn't scale to 1000+ businesses
- More memory usage

---

### **Option C: Two-Query Interleaving (Best UX)**

```typescript
// Query 1: Paid tiers (sorted by rating)
const { data: paidBusinesses } = await supabase
  .from('business_profiles')
  .select('*')
  .in('plan', ['spotlight', 'featured', 'starter'])
  .in('status', ['approved'])
  .eq('city', currentCity)
  .order('plan', { ascending: true }) // spotlight first
  .order('rating', { ascending: false })
  .limit(20)

// Query 2: Free tier (sorted by rating)
const { data: freeBusinesses } = await supabase
  .from('business_profiles')
  .select('*')
  .in('status', ['unclaimed', 'claimed_free'])
  .eq('city', currentCity)
  .order('rating', { ascending: false })
  .limit(20)

// Interleave: 3 paid, 2 free, 3 paid, 2 free, etc.
const interleaved = []
let pIdx = 0, fIdx = 0
while (pIdx < paidBusinesses.length || fIdx < freeBusinesses.length) {
  // Add 3 paid
  for (let i = 0; i < 3 && pIdx < paidBusinesses.length; i++) {
    interleaved.push(paidBusinesses[pIdx++])
  }
  // Add 2 free
  for (let i = 0; i < 2 && fIdx < freeBusinesses.length; i++) {
    interleaved.push(freeBusinesses[fIdx++])
  }
}
```

**Pros:**
- Perfect control over ratio (3:2 paid:free)
- Guaranteed variety
- No complex scoring logic
- Easy to explain to businesses

**Cons:**
- Two queries (slightly slower)
- Pagination more complex
- Need to track indices

---

## 📊 **How Your Filter Cards Work**

**You already have this nailed! 🎉**

**Current filter cards:**
- **Qwikker Picks** → Shows ONLY Spotlight businesses
- **Featured** → Shows Spotlight + Featured businesses
- **Recommended** → Shows Starter businesses
- **All Places** → Blended feed (default)

**This is perfect because:**
- Users feel in control (they chose the filter)
- Businesses understand the value ladder
- You can optimize each filter separately

**Recommended queries per filter:**

```typescript
// Qwikker Picks (Spotlight only)
.eq('plan', 'spotlight')
.order('rating', { ascending: false })

// Featured (Spotlight + Featured)
.in('plan', ['spotlight', 'featured'])
.order('plan', { ascending: true }) // spotlight first
.order('rating', { ascending: false })

// Recommended (Starter only)
.eq('plan', 'starter')
.order('rating', { ascending: false })

// All Places (Blended - your Phase 2 logic)
// Use one of the options above
```

---

## 🚨 **What NOT to Do**

### **❌ Full Randomization**
```typescript
.order('random()') // BAD
```

**Problems:**
- Spotlight pays more but might appear low
- Businesses feel cheated
- You lose pricing leverage
- No consistent UX

---

### **❌ Pure Tier-Based (No Quality)**
```sql
ORDER BY 
  CASE plan 
    WHEN 'spotlight' THEN 1 
    WHEN 'featured' THEN 2 
    ELSE 3 
  END,
  created_at DESC -- PROBLEM: ignores rating!
```

**Problems:**
- Low-quality Spotlight businesses show above high-quality free
- Users lose trust
- Feels like "pay-to-win" scam

---

### **❌ Category Stacking**
```typescript
// Import 10 restaurants, then 10 cafes, then 10 bars
// Result: Bars dominate first page (recency bias)
```

**Solution:**
- Import in smaller batches across categories
- OR use rating-first ordering (Phase 1, already done ✅)
- OR interleave categories (Phase 2, optional)

---

## 🎯 **Recommended Rollout**

### **Right Now (Done ✅)**
```
Rating-first ordering
- Simple
- Fair
- High quality
```

### **After 100+ Businesses**
```
Add Phase 3 controls:
- is_featured column
- display_order column
- Manual pinning for special cases
```

### **After Launch (User Feedback)**
```
Implement tier-based blending:
- Option A (RPC) if performance matters
- Option B (Client-sort) if flexibility matters
- Option C (Interleave) if control matters
```

---

## 💡 **Business Psychology**

**What businesses should think:**
> "If I upgrade to Spotlight, I'm guaranteed visibility — not just gambling"

**What users should think:**
> "Qwikker shows me the best places — not just ads"

**Your current Phase 1 achieves BOTH:**
- High-quality businesses show first (user trust)
- Paid tiers get explicit filter cards (business value)
- Fair and defensible

---

## 📋 **Summary**

### **Current State (Phase 1) ✅**
```sql
ORDER BY 
  rating DESC NULLS LAST,
  review_count DESC NULLS LAST,
  created_at DESC
```

**Status:** ✅ DONE - Quality-first ordering prevents recency bias

### **Future State (Phase 2) - When Needed**
```sql
-- Option A: RPC function with CASE ordering
-- Option B: Client-side scoring
-- Option C: Two-query interleaving
```

**Status:** ⏳ READY - Migration created, implement when you have 100+ businesses

### **Future State (Phase 3) - Power Features**
```sql
ORDER BY 
  is_featured DESC,
  display_order ASC NULLS LAST,  -- NULL = not manually ordered
  rating DESC NULLS LAST,
  review_count DESC NULLS LAST,
  created_at DESC
```

**Status:** ⏳ READY - Migration in `docs/sql/add_discover_ordering_controls.sql`

**CRITICAL:** 
- `display_order` defaults to NULL (not 0)
- Only manually pinned businesses have a non-NULL value
- Prevents every business from being "manually ordered" by accident

---

## ⚡ **Performance Considerations**

### **Current Volume (< 100 businesses per city)**
```
✅ No indexes needed
✅ Query is instant
✅ Current ordering works perfectly
```

### **Growing Volume (100-500 businesses per city)**
```
⚠️ Add composite index
⚠️ Monitor query performance
⚠️ Consider RPC function for complex ordering
```

**Recommended index (add when needed):**
```sql
CREATE INDEX idx_business_profiles_discover_order 
ON business_profiles(
  city, 
  status, 
  rating DESC, 
  review_count DESC, 
  created_at DESC
)
WHERE status IN ('approved', 'unclaimed', 'claimed_free');
```

### **High Volume (1000+ businesses per city)**
```
🚨 Composite indexes critical
🚨 Consider materialized view
🚨 Consider pre-sorted results (cached)
🚨 Pagination becomes important
```

**Test query performance:**
```sql
EXPLAIN ANALYZE
SELECT * FROM business_profiles
WHERE city = 'bournemouth' 
  AND status IN ('approved', 'unclaimed', 'claimed_free')
ORDER BY rating DESC NULLS LAST, 
         review_count DESC NULLS LAST, 
         created_at DESC
LIMIT 50;
```

**If you see "Seq Scan" → add indexes**

---

## 🚨 **Critical Gotchas (Addressed)**

### **1. NULL vs 0 for display_order** ✅ FIXED
```
❌ BAD:  display_order INTEGER DEFAULT 0
Problem: Every business becomes "manually ordered" by accident
Result:  All businesses have display_order = 0, so ORDER BY display_order ASC does nothing

✅ GOOD: display_order INTEGER DEFAULT NULL
Solution: Only manually pinned businesses have a value
Result:  ORDER BY display_order ASC NULLS LAST → NULLs appear after manually ordered
```

### **2. NULL ratings appearing first** ✅ FIXED
```
✅ Current: .order('rating', { ascending: false, nullsFirst: false })
Result: NULL ratings appear LAST (correct behavior)
```

### **3. Migration auto-run prevention** ✅ FIXED
```
❌ BAD:  supabase/migrations/20260111_add_discover_ordering.sql
Problem: Supabase CLI auto-runs timestamped migrations

✅ GOOD: docs/sql/add_discover_ordering_controls.sql
Solution: No timestamp, not in migrations/ folder
Result:  Won't auto-run, only runs when explicitly needed
```

### **4. 0 ratings showing first** ⏳ FUTURE
```
Current: 0-rated businesses show before NULL (technically correct)
Future:  Consider pushing 0 ratings down (treat as "unrated")
Phase:   Not urgent, handle in Phase 2 if needed
```

---

**Last updated:** January 11, 2026  
**Status:** Phase 1 complete, Phase 2/3 documented and ready, gotchas addressed

