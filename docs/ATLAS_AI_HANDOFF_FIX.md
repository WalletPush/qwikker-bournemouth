# Atlas AI Handoff Fix

## Problem Statement

The "Show on Map" button in the AI Companion was not appearing because the AI was not returning structured business data in the `businessCarousel` field. When it did return data, it had several critical issues:

### Issues Identified

1. **Duplicates:** Same business appeared multiple times (e.g., 3 rows for David's Grill Shack)
2. **Wrong tier data:** All businesses showed as `free_trial` instead of their actual tier
3. **Missing data:** Categories, ratings, addresses incomplete or null
4. **Free tier leakage:** Unclaimed/imported `free_tier` businesses appeared in results (should be Discover-only)
5. **Carousel spam:** Carousel appeared on every AI response, even simple queries

## Root Cause

The Knowledge Base (KB) search returns **multiple rows per business** (menu, offers, PDF, info). The old code:
- Sliced first 6 KB rows → duplicates
- Trusted KB row data for tier/rating/category → incomplete/incorrect
- Had no deduplication or enrichment step
- Had no carousel gating logic

## Solution Implemented

### 1. Deduplication by business_id

```typescript
const bestHitByBusiness = new Map<string, KBRow>()

for (const r of businessResults.results) {
  if (!r.business_id || !r.business_name) continue
  
  const key = r.business_id
  const existing = bestHitByBusiness.get(key)
  
  // Keep highest similarity row per business
  const rScore = (r as any).similarity ?? 0
  const eScore = existing ? ((existing as any).similarity ?? 0) : -Infinity
  
  if (!existing || rScore > eScore) bestHitByBusiness.set(key, r)
}

const uniqueBusinessIds = Array.from(bestHitByBusiness.keys())
```

### 2. Enrichment from business_profiles

Fetch canonical business data from `business_profiles` table instead of trusting KB rows:

```typescript
const { data: businesses } = await supabase
  .from('business_profiles')
  .select(`
    id, business_name, business_tagline, system_category, display_category,
    business_tier, business_address, business_town, logo, business_images,
    rating, owner_user_id, claimed_at
  `)
  .in('id', uniqueBusinessIds)
```

### 3. Tier Priority & Exclusions

```typescript
const tierPriority: Record<string, number> = {
  qwikker_picks: 0,  // Spotlight (paid premium)
  featured: 1,        // Featured tier
  free_trial: 2,      // Featured trial (treat as Featured)
  recommended: 3,     // Starter tier
  free_tier: 9        // EXCLUDE: unclaimed/imported
}

const isExcludedTier = (tier: string) => tier === 'free_tier'
```

### 4. Carousel Gating

Only attach carousel when user explicitly asks for list/map:

```typescript
const msg = userMessage.toLowerCase()
const wantsList = /show|list|options|recommend|suggest|places|where should|near me|map|atlas|on the map|pins|results/.test(msg)

const shouldAttachCarousel = wantsList
```

### 5. hasBusinessResults Flag

Always set `hasBusinessResults` when businesses found (for "Show on Map" button):

```typescript
let hasBusinessResults = false

if (businessResults.success && businessResults.results.length > 0) {
  // ... deduplication ...
  hasBusinessResults = uniqueBusinessIds.length > 0
  
  // ... carousel building only if shouldAttachCarousel ...
}

return {
  success: true,
  response: aiResponse,
  hasBusinessResults, // For "Show on Map" CTA
  businessCarousel,   // Only populated when user asks for list/map
  // ...
}
```

### 6. UI Changes

Updated `components/user/user-chat-page.tsx`:

```typescript
// Before:
{atlasEnabled && message.type === 'ai' && message.businessCarousel && message.businessCarousel.length > 0 && (

// After:
{atlasEnabled && message.type === 'ai' && message.hasBusinessResults && (
```

### 7. API Route Update

Updated `app/api/ai/chat/route.ts` to include `hasBusinessResults` in response:

```typescript
return NextResponse.json({
  response: result.response,
  sources: result.sources || [],
  quickReplies,
  hasBusinessResults: result.hasBusinessResults, // NEW
  businessCarousel: result.businessCarousel,
  walletActions: result.walletActions,
  eventCards: result.eventCards,
  // ...
})
```

## Test Results

### Query: "restaurants"
```json
{
  "hasBusinessResults": true,
  "businessCarouselCount": 0,
  "sourcesCount": 12
}
```
✅ `hasBusinessResults` set correctly  
✅ Carousel gated (no "list" keyword in query)  
✅ "Show on Map" button appears

### Query: "show me restaurants on a map"
```json
{
  "hasBusinessResults": true,
  "businessCarouselCount": 5,
  "carouselBusinesses": [
    {"name": "Julie's Sports pub", "tier": "qwikker_picks"},
    {"name": "Venezy Burgers", "tier": "featured"},
    {"name": "Ember & Oak Bistro", "tier": "free_trial"},
    {"name": "David's grill shack", "tier": "free_trial"},
    {"name": "Alexandra's Café", "tier": "free_trial"}
  ]
}
```
✅ `hasBusinessResults` set correctly  
✅ Carousel populated (matched "show" + "map" pattern)  
✅ 5 UNIQUE businesses (no duplicates)  
✅ Tier-ordered: qwikker_picks first  
✅ Correct tier data from `business_profiles`

## UX Improvements

1. **"Earned" Atlas moment:** Button only appears when relevant (not spammy)
2. **Conversational first:** User sees text response, carousel only when they ask for options
3. **Tier priority:** Spotlight/Featured businesses appear first
4. **No free tier leakage:** Unclaimed businesses stay in Discover, not AI/Atlas

## Files Modified

- `lib/ai/hybrid-chat.ts` - Core carousel building logic
- `components/user/user-chat-page.tsx` - UI for "Show on Map" button
- `app/api/ai/chat/route.ts` - API response includes `hasBusinessResults`
- `scripts/test-ai-chat-api.sh` - New test script for auditing AI responses

## Next Steps (Optional Improvements)

1. **Refine gating pattern:** Add more conversational triggers ("shortlist", "narrow down")
2. **Query-based sorting:** Boost businesses that match query keywords
3. **Distance sorting:** If user location available, sort by proximity
4. **Smart tier blending:** Mix tiers but keep Spotlight first
5. **Analytics:** Track "Show on Map" click rate by query type

## Commit

```bash
git commit -m "🗺️ FIX: AI → Atlas handoff with proper deduplication and tier ordering"
```

Branch: `atlas-prototype`  
Status: ✅ Ready for testing/merge
