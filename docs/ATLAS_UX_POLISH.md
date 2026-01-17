# Atlas UX Polish - Critical Fixes

## Summary

Fixed 5 critical UX issues identified in the Atlas AI → Atlas handoff flow based on user audit:

1. ✅ **normalizeTier fallback** - `null` now maps to `free_trial` (not `free_tier`)
2. ✅ **Atlas awareness in AI** - System prompt updated to never say "can't show map"
3. ✅ **"Show top picks" quick reply** - Added when results exist but carousel gated
4. ✅ **UI mode classifier** - Explicit `conversational|suggestions|map` mode
5. ✅ **DB constraint** - Migration created to allow `free_trial` and `free_tier`

---

## Problem 1: null tier → excluded (BRUTAL)

### What Was Broken
```typescript
const normalizeTier = (tier: string | null | undefined) => tier ?? 'free_tier'
const isExcludedTier = (tier: string) => tier === 'free_tier'
```

**Impact:** Any business with `business_tier = null` in DB was excluded from AI results.

### Fix Applied
```typescript:554:556:lib/ai/hybrid-chat.ts
// CRITICAL: null tier → free_trial (not free_tier), so null doesn't exclude
const normalizeTier = (tier: string | null | undefined) => tier ?? 'free_trial'
const isExcludedTier = (tier: string) => tier === 'free_tier'
```

**Rationale:** `null` tier likely means "not yet set" or "legacy data", not "unclaimed import". Treat as Featured trial (safe, inclusive).

---

## Problem 2: "I can't show you a map" (trust-breaking)

### What Was Broken
AI response: *"I can't directly show you a map, but I can tell you about..."*

Even when Atlas is enabled and available.

### Fix Applied
```typescript:225:237:lib/ai/hybrid-chat.ts
🗺️ ATLAS (MAP) HANDLING:
- When user asks to see places on a map, NEVER say "I can't show you a map"
- Atlas (our interactive map) is available and will appear automatically
- Use phrases like: "Want to see these on Atlas?", "I can show you where they are!", or "Ready to explore on the map?"
- The "Show on Map" button will appear below your message when businesses are available
- Stay conversational—don't over-explain the tech, just offer it naturally
```

**Impact:** AI now knows Atlas exists and offers it naturally.

---

## Problem 3: Conversational responses feel "dead end"

### What Was Broken
Query: "restaurants"  
Response: "Bournemouth has some fantastic restaurants..."  
UI: *(No carousel, no next action)*

User thinks: "Where are they? Did it work?"

### Fix Applied
```typescript:1177:1204:lib/ai/chat.ts
// 🗺️ ATLAS: If AI is conversational but has business results, offer to show them
const isConversationalButHasResults = hasBusinessResults && 
  !lowerAIResponse.match(/\b(here's|here are|check out|try|recommend)\b/) &&
  !lowerMessage.match(/\b(show|list|map|atlas|options|recommend|suggest)\b/)

if (isConversationalButHasResults) {
  return tidy([
    'Show top picks',
    'See on map',
    'Compare options'
  ])
}
```

**Impact:** When AI is conversational (no carousel), quick replies surface the "show results" action.

---

## Problem 4: Regex magic for carousel gating (non-deterministic)

### What Was Broken
```typescript
const wantsList = /show|list|options|recommend|suggest|places|where should|near me|map|atlas|on the map|pins|results/.test(msg)
const shouldAttachCarousel = wantsList
```

**Problem:** Adding one word to query could randomly trigger/untrigger carousel.

### Fix Applied
```typescript:558:577:lib/ai/hybrid-chat.ts
// STEP 4: UI Mode classifier (deterministic carousel gating)
const msg = userMessage.toLowerCase()
const wantsMap = /\b(map|atlas|on the map|pins|show.*location|where.*located)\b/.test(msg)
const wantsList = /\b(show|list|options|recommend|suggest|places|where should|near me|results|give me)\b/.test(msg)

let uiMode: 'conversational' | 'suggestions' | 'map'
if (wantsMap) {
  uiMode = 'map'
} else if (wantsList) {
  uiMode = 'suggestions'
} else {
  uiMode = 'conversational'
}

const shouldAttachCarousel = uiMode !== 'conversational'

console.log(`🎨 UI Mode: ${uiMode}, shouldAttachCarousel: ${shouldAttachCarousel}`)
```

**Impact:**
- Explicit `uiMode` returned in API response
- More predictable carousel behavior
- Easier to debug/refine patterns

---

## Problem 5: DB constraint blocks free_trial and free_tier

### What Was Broken
```sql
CHECK (business_tier IN ('qwikker_picks', 'featured', 'recommended'));
```

**Impact:** Inserting/updating businesses with `free_trial` or `free_tier` would fail.

### Fix Applied
Created migration: `20260117000003_fix_business_tier_constraint.sql`

```sql
ALTER TABLE business_profiles
ADD CONSTRAINT business_profiles_business_tier_check
CHECK (business_tier IN (
  'qwikker_picks',  -- Spotlight tier (premium paid)
  'featured',       -- Featured tier (paid)
  'free_trial',     -- Featured trial (promotional)
  'recommended',    -- Starter tier (paid)
  'free_tier'       -- Free tier (unclaimed/imported businesses)
));
```

**Impact:** All tier values now valid in DB.

---

## Files Changed

- `lib/ai/hybrid-chat.ts` - normalizeTier fix, Atlas prompt, uiMode classifier
- `lib/ai/chat.ts` - "Show top picks" quick reply when conversational + results
- `supabase/migrations/20260117000003_fix_business_tier_constraint.sql` - DB constraint fix
- `docs/ATLAS_UX_POLISH.md` - This document

---

## Test Plan

### 1. Test normalizeTier fix
```sql
-- Create test business with null tier
INSERT INTO business_profiles (business_name, city, business_tier)
VALUES ('Test Null Tier', 'bournemouth', NULL);

-- Query AI: "restaurants"
-- Expected: Test Null Tier appears in results (treated as free_trial)
```

### 2. Test Atlas prompt
```bash
# Query: "show me restaurants on a map"
# Expected AI response: "Want to see these on Atlas?" or "Ready to explore on the map?"
# Should NOT say: "I can't show you a map"
```

### 3. Test "Show top picks" quick reply
```bash
# Query: "restaurants"
# Expected: Conversational response + quick replies: ["Show top picks", "See on map", "Compare options"]
```

### 4. Test uiMode classifier
```bash
# Query: "restaurants" → uiMode: 'conversational', carousel: empty
# Query: "show me restaurants" → uiMode: 'suggestions', carousel: populated
# Query: "restaurants on a map" → uiMode: 'map', carousel: populated
```

### 5. Test DB constraint
```sql
-- Should all succeed:
UPDATE business_profiles SET business_tier = 'free_trial' WHERE id = '...';
UPDATE business_profiles SET business_tier = 'free_tier' WHERE id = '...';
UPDATE business_profiles SET business_tier = 'qwikker_picks' WHERE id = '...';
```

---

## Next Steps (Optional Improvements)

1. **Parallelize enrichment + LLM** - Start LLM while fetching business_profiles data
2. **Query-based relevance scoring** - Boost businesses that match query keywords
3. **Distance sorting** - If user location available, sort by proximity
4. **Refine uiMode patterns** - Add more conversational triggers ("shortlist", "narrow down")
5. **Analytics** - Track `uiMode` distribution, "Show top picks" click rate

---

## Commit Message

```
🎨 UX: Atlas AI polish - normalizeTier fix, Atlas prompt, quick replies, uiMode

CRITICAL FIXES:
1. normalizeTier: null → free_trial (not free_tier, prevents brutal exclusion)
2. Atlas awareness: System prompt updated to never say "can't show map"
3. "Show top picks" quick reply: Added when conversational but has results
4. UI mode classifier: Explicit conversational|suggestions|map mode
5. DB constraint: Migration to allow free_trial and free_tier tiers

WHAT WAS BROKEN:
- null business_tier → excluded from AI (now treated as free_trial)
- AI says "can't show map" even when Atlas enabled (now offers naturally)
- Conversational responses feel like dead end (now has "Show top picks" CTA)
- Carousel gating via regex magic (now explicit uiMode classifier)
- DB constraint rejects free_trial/free_tier inserts (migration fixes)

IMPACT:
- More inclusive (null tiers no longer excluded)
- Trust-building (AI knows Atlas exists)
- Clear next actions (quick replies surface "show results")
- Predictable behavior (uiMode explicit, easier to debug)
- DB allows all valid tiers

Files:
- lib/ai/hybrid-chat.ts
- lib/ai/chat.ts  
- supabase/migrations/20260117000003_fix_business_tier_constraint.sql
- docs/ATLAS_UX_POLISH.md
```

Branch: `atlas-prototype`  
Ready for: Testing → Merge
