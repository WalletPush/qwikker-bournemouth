# Browse Fill + Intent Relevance Gating Spec

**Problem:** Current three-tier system is too strict. Tier 3 only shows when Tier 1 is completely empty, making cities with few paid listings look dead.

**Solution:** Two different behaviors for browse vs. intent queries.

---

## Core Rule

**Paid businesses get the top slots by default, but relevance overrides tier when paid results are clearly wrong. Tier 3 exists to fill inventory and preserve trust, not to compete.**

---

## Constants

```typescript
const TARGET_RESULTS = 8              // Target total results to show
const MIN_RELEVANT_FOR_INTENT = 2     // Min relevant Tier 1 needed to skip Tier 3
const MIN_TIER1_TOP_SCORE = 3         // Min score for Tier 1 to be "truly relevant" (category match)
const MAX_TIER3_WHEN_PAID_RELEVANT = 2 // Max Tier 3 to show when Tier 1 is relevant (assist only)
const MAX_TIER2_IN_TOP = 2            // Max Tier 2 in top section (prevent crowding premium)
const MAX_TIER3_IN_MORE = 3           // Max Tier 3 in "more options"
```

---

## 1. Browse Mode (Fill Inventory)

### Triggers:
- "show me all businesses"
- "all restaurants"
- "restaurants"
- "cafes"
- "any more"
- "more"
- "next"

**CRITICAL:** `detectBrowse()` ALWAYS overrides `detectIntent()`. If query contains "show me all restaurants", it's browse mode even though "restaurants" might trigger intent detection.

### Behavior:
1. Fetch Tier 1 (paid/trial)
2. Fetch Tier 2 (claimed-free with menus)
3. **Always fetch Tier 3** to fill
4. Combine: Tier 1 + Tier 2 first, then Tier 3 to reach TARGET_RESULTS (8)
5. Present as:
   - **"Featured picks"** (Tier 1/2, max 6)
   - **"More places"** (Tier 3 fill, max 3-6)

### Why:
Without this, cities with 5 paid listings look empty. Tier 3 is **inventory**, not just safety net.

---

## 2. Intent Mode (Relevance Gating)

### Triggers:
- "greek"
- "sushi"
- "thai"
- "vegan"
- "dog friendly"
- Any specific cuisine/attribute

### Behavior:
1. Detect intent: `detectIntent(query)` → categories + keywords
2. Fetch Tier 1 and score each business:
   ```typescript
   relevanceScore = 
     (category match ? 3 : 0) +
     (name keyword ? 2 : 0) +
     (KB content ? 1 : 0)
   
   isRelevant = relevanceScore >= 2
   ```

3. Count relevant Tier 1: `tier1RelevantCount = tier1.filter(b => b.isRelevant).length`

4. **Decision:**
   - If `tier1RelevantCount >= MIN_RELEVANT_FOR_INTENT` (2):
     - **Don't fetch Tier 3**, Tier 1 wins
   - Else:
     - **Fetch Tier 3**, score it, merge and re-rank

5. Present as:
   - **"Top matches"** (highest scoring, max 6)
   - **"More options"** (lower scoring, max 3-6)

### Why:
Prevents "Greek query returns Italian restaurants" problem while protecting paid visibility when relevant.

---

## 3. Generic Conversational (No Fill)

### Triggers:
- "what's good for date night?"
- "somewhere quiet"
- Natural language, no specific category

### Behavior:
1. Fetch Tier 1 only
2. Don't score, don't fill with Tier 3
3. Let AI inference handle it

### Why:
These are contextual, not inventory queries. KB + AI should handle without Tier 3 spam.

---

## Output Format (What Users See)

### Browse Query Response:
```
🍴 Here are restaurants in Bournemouth:

[Featured picks]
• Ember & Oak Bistro (Tier 1 - carousel card)
• Alexandra's Café (Tier 1 - carousel card)
• David's grill shack (Tier 1 - carousel card)

[More places]
• Triangle GYROSS (Tier 3 - text)
  ⭐ 5.0 (83 reviews) • Greek Restaurant
  📍 0.4 miles away • Open until 10pm
  
• Kalimera Bournemouth (Tier 3 - text)
  ⭐ 5.0 (16 reviews) • Greek Restaurant
  📍 0.6 miles away • Open now
```

### Intent Query Response (Relevant Tier 1):
```
🇬🇷 I found some great Greek places:

[Top matches]
• Triangle GYROSS (Tier 3 - but scored highest)
• Kalimera Bournemouth (Tier 3)
• Ember & Oak Bistro (Tier 1 - if has Greek menu items)
```

### Intent Query Response (Irrelevant Tier 1):
```
🇬🇷 I don't have confirmed Greek restaurants on our Featured tier yet, but here are some options:

[From the wider city guide]
• Triangle GYROSS
• Kalimera Bournemouth

💡 These businesses haven't claimed their listing yet - call ahead to confirm.
```

---

## Implementation Checklist

### Files to modify:
1. **`lib/ai/intent-detector.ts`** (new)
   - `detectIntent(query)` → cuisine categories + keywords
   - `detectBrowse(query)` → `{ mode: 'browse' | 'browse_more' | 'not_browse' }` (pagination support)

2. **`lib/ai/relevance-scorer.ts`** (new)
   - `scoreBusinessRelevance(business, intent)` → number
   - Returns 0-6 score based on category/name/KB matches

3. **`lib/ai/hybrid-chat.ts`** (~line 787-850)
   - Replace strict "Tier 3 only when Tier 1 empty" logic
   - Add browse detection
   - Add relevance counting
   - Implement fill logic

### The exact logic block:

```typescript
// After fetching Tier 1 (businesses)
const intent = detectIntent(userMessage)
const browseMode = detectBrowse(userMessage) // Returns { mode: 'browse' | 'browse_more' | 'not_browse' }

let fallbackBusinesses = []
let topMatchesText = [] // NEW: Tier 3 that beats irrelevant Tier 1

  // CRITICAL: Browse detection overrides everything
if (browseMode.mode === 'browse' || browseMode.mode === 'browse_more') {
  // BROWSE MODE: Always fill with Tier 3
  console.log('📚 BROWSE MODE: Fetching Tier 3 to fill inventory')
  
  // Reset offset on new browse
  if (browseMode.mode === 'browse') {
    state.browseOffset = 0
  }
  
  const tier1Count = businesses?.length || 0
  const tier2Count = Math.min(liteBusinesses?.length || 0, MAX_TIER2_IN_TOP) // Cap Tier 2
  const combinedCount = tier1Count + tier2Count
  
  if (combinedCount < TARGET_RESULTS) {
    const tier3Limit = TARGET_RESULTS - combinedCount
    const { data: tier3 } = await supabase
      .from('business_profiles_ai_fallback_pool')
      .select('*')
      .eq('city', city)
      .order('rating', { ascending: false, nullsLast: true })
      .order('user_ratings_total', { ascending: false, nullsLast: true })
      .order('business_name', { ascending: true })
      .range(state.browseOffset || 0, (state.browseOffset || 0) + tier3Limit - 1) // Pagination
    
    fallbackBusinesses = tier3 || []
    
    // CRITICAL: Increment by ACTUAL results returned (handles end-of-list correctly)
    if (browseMode.mode === 'browse_more') {
      state.browseOffset = (state.browseOffset || 0) + fallbackBusinesses.length
    }
    
    console.log(`📚 Filled with ${fallbackBusinesses.length} Tier 3 businesses (offset: ${state.browseOffset})`)
  }
  
} else if (intent.hasIntent) {
  // INTENT MODE: Score relevance, fetch Tier 3 if needed
  console.log(`🎯 INTENT MODE: Checking relevance for "${intent.categories.join(', ')}"`)
  
  const tier1WithScores = businesses.map(b => ({
    ...b,
    relevanceScore: scoreBusinessRelevance(b, intent)
  }))
  
  const tier1RelevantCount = tier1WithScores.filter(b => b.relevanceScore >= 2).length
  const maxTier1Score = Math.max(...tier1WithScores.map(b => b.relevanceScore), 0)
  
  const tier1HasEnoughRelevant = tier1RelevantCount >= MIN_RELEVANT_FOR_INTENT
  const tier1HasStrongTop = maxTier1Score >= MIN_TIER1_TOP_SCORE
  
  console.log(`🎯 Tier 1: ${tier1RelevantCount} relevant, max score: ${maxTier1Score}`)
  console.log(`🎯 hasEnoughRelevant: ${tier1HasEnoughRelevant}, hasStrongTop: ${tier1HasStrongTop}`)
  
  // Only skip Tier 3 if BOTH conditions met
  const shouldFetchTier3 = !tier1HasEnoughRelevant || !tier1HasStrongTop
  
  if (shouldFetchTier3) {
    console.log(`🎯 Tier 1 weak - fetching Tier 3`)
    
    const { data: tier3 } = await supabase
      .from('business_profiles_ai_fallback_pool')
      .select('*')
      .eq('city', city)
      .order('rating', { ascending: false, nullsLast: true })
      .order('user_ratings_total', { ascending: false, nullsLast: true })
      .order('business_name', { ascending: true })
      .limit(10)
    
    const tier3WithScores = (tier3 || []).map(b => ({
      ...b,
      relevanceScore: scoreBusinessRelevance(b, intent),
      tierSource: 'tier3'
    }))
    
    if (tier1HasEnoughRelevant) {
      // Tier 1 has enough relevant matches (2+) - Tier 3 is just an assist
      // This catches: tier1HasEnoughRelevant=true + tier1HasStrongTop=false (false positives)
      fallbackBusinesses = tier3WithScores
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, MAX_TIER3_WHEN_PAID_RELEVANT)
      
      console.log(`🎯 Tier 1 has ${tier1RelevantCount} relevant - showing ${fallbackBusinesses.length} Tier 3 assist`)
      
    } else {
      // Tier 1 is genuinely irrelevant (< 2 relevant) - Tier 3 dominates
      const tier3Top = tier3WithScores
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 6)
      
      // CRITICAL: Put best Tier 3 in topMatchesText (shown first as text)
      // Keep businesses as-is for carousel (Tier 1), but it appears BELOW in response
      topMatchesText = tier3Top
      
      // Remaining Tier 3 goes to "more options" - use ID tracking to avoid .includes() bug
      const topIds = new Set(tier3Top.map(b => b.id))
      fallbackBusinesses = tier3WithScores
        .filter(b => !topIds.has(b.id))
        .slice(0, MAX_TIER3_IN_MORE)
      
      console.log(`🎯 Tier 1 irrelevant - showing ${topMatchesText.length} Tier 3 as top matches`)
    }
  } else {
    console.log(`✅ Tier 1 sufficient (${tier1RelevantCount} relevant, max score ${maxTier1Score})`)
  }
  
} else {
  // CONVERSATIONAL: Tier 1 only, no fill
  console.log('💬 CONVERSATIONAL MODE: Tier 1 only')
}

// Return buckets for UI rendering
return {
  businessCarousel: businesses,        // Tier 1 ONLY - always carousel cards
  topMatchesText,                      // Tier 3 when Tier 1 is irrelevant - text, shown FIRST
  liteBusinesses: liteBusinesses?.slice(0, MAX_TIER2_IN_TOP), // Tier 2 - "Also on Qwikker" (max 2)
  morePlacesText: fallbackBusinesses   // Tier 3 assist/fill - text, shown LAST
}
```

---

## UI Rendering (Three-Bucket System)

The response returns three buckets that the UI renders in this order:

### 1. Top Matches (Text - Shown First)
- **Source:** `topMatchesText` (Tier 3 only)
- **When shown:** Intent mode + Tier 1 is irrelevant
- **Label:** "Top matches" or "From the wider city guide"
- **Format:** Text bullets, NOT carousel

### 2. Featured Picks (Carousel - Shown Second)
- **Source:** `businessCarousel` (Tier 1 ONLY)
- **When shown:** Always (if Tier 1 exists)
- **Label:** "Featured picks" or just the carousel itself
- **Format:** Swipeable carousel cards

### 3. Also on Qwikker (Text - Shown Third)
- **Source:** `liteBusinesses` (Tier 2 only)
- **When shown:** When claimed-free businesses have menu_preview
- **Label:** "Also on Qwikker" or similar
- **Format:** Text bullets (max 2), NOT carousel
- **Why separate:** Prevents Tier 2 from crowding premium perception

### 4. More Places (Text - Shown Last)
- **Source:** `morePlacesText` (Tier 3 fill/assist)
- **When shown:** Browse mode OR intent mode assist
- **Label:** "More places" or "More options"
- **Format:** Text bullets, NOT carousel

### Why Four Buckets?

**Prevents the "Greek shows Italian first" bug:**
- When Tier 1 is irrelevant, `topMatchesText` (Tier 3) renders FIRST
- Carousel still renders, but BELOW with clear labeling
- User sees correct results first, preserves paid visibility second

**Keeps carousel behavior deterministic:**
- `businessCarousel` is ALWAYS Tier 1 (never mixed)
- No conditional logic like "sometimes carousel has Tier 3"
- Frontend rendering logic stays simple

---

## Testing

### Browse queries that should fill:
- [ ] "show me all restaurants" → Returns Tier 1 + Tier 3 fill (8 total)
- [ ] "any more" → Returns next batch with Tier 3
- [ ] "all businesses" → Returns mixed results

### Intent queries with weak Tier 1:
- [ ] "greek places" → Returns Triangle GYROSS, Kalimera (Tier 3 scores high)
- [ ] "sushi" with no paid sushi → Returns Tier 3 sushi places

### Intent queries with strong Tier 1:
- [ ] "italian" with 4 paid Italian → Returns paid only (no Tier 3)
- [ ] "pizza" with 3 paid pizza places → Returns paid only

### Conversational queries (no fill):
- [ ] "somewhere romantic" → AI inference, no Tier 3 spam
- [ ] "good for groups" → Contextual, no fill

---

## Why This Works

✅ **Inventory problem solved:** Browse queries always show options  
✅ **Relevance problem solved:** Intent queries get accurate matches  
✅ **Monetization protected:** Paid wins top slots when relevant  
✅ **Trust preserved:** Users never see "no results" or wrong results  
✅ **Clear UX:** Two sections make it obvious what's premium vs. directory

---

## What NOT to Do

❌ **Don't union everything always:** Dilutes paid value  
❌ **Don't hide Tier 3 completely:** Makes cities look empty  
❌ **Don't mix tiers without labels:** Creates "what's special?" confusion  
❌ **Don't show 10 unclaimed + 2 paid:** Breaks monetization  

---

## Key Improvements from First Draft

1. **Browse overrides everything:** `detectBrowse()` wins over `detectIntent()` to prevent "show me all restaurants" from collapsing
2. **Pagination support:** `detectBrowse()` returns mode enum, supports "any more/next" with offset tracking
3. **Dual threshold check:** Fetch Tier 3 if `relevantCount < 2` OR `maxScore < 3` (catches false positive matches)
4. **Three-bucket return:** `topMatchesText`, `businessCarousel`, `morePlacesText` - fixes "irrelevant Tier 1 shows first" bug
5. **Smart assist mode:** When Tier 1 is relevant, Tier 3 shows max 2 results as "assist" (not full takeover)
6. **Tier 2 capping:** Max 2 Tier 2 in top section to preserve premium perception

---

## Bugs Fixed in Final Version

1. **Dead code elimination:** Removed unreachable `tier1HasEnoughRelevant && tier1HasStrongTop` branch (can't happen inside `shouldFetchTier3`)
2. **Browse pagination fix:** Increment offset by `fallbackBusinesses.length` (actual returned), not `tier3Limit` (handles end-of-list)
3. **Object equality bug:** Use `Set` of IDs instead of `.includes()` for filtering remaining Tier 3
4. **Deterministic sort order:** Added `.order()` for rating, review count, and name to prevent random Tier 3 ordering
5. **Tier 2 separation:** Keep `liteBusinesses` separate from carousel to preserve premium perception

---

## Future UX Enhancement (Not Now)

Add a subtle disclaimer under "Top matches" when showing Tier 3:
> "Some places haven't claimed their listing yet — details may be limited."

This sets expectations for Tier 3 data quality without feeling negative.

---

**Status:** Ready to implement tomorrow  
**Estimated time:** 2-3 hours (intent detector + relevance scorer + hybrid-chat logic)
