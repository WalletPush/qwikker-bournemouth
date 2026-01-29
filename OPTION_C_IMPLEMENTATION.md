# Option C Implementation: Hybrid Review Strategy

## Executive Summary

**Strategy**: Delete cached reviews after 30 days, fetch fresh reviews on-demand during chat if needed.

**Cost**: $25-250/month (depends on Tier 3 traffic)  
**Compliance**: ✅ 100% Google ToS compliant (always fresh or deleted)  
**User Experience**: ✅ Rich review snippets always available (when needed)

---

## How It Works

### Phase 1: Import (One-Time)
```
Business imported → Reviews stored in DB → Valid for 30 days
Cost: $0.034 per business (includes reviews)
```

### Phase 2: Auto-Delete (Daily Cron)
```
Day 30 → Cron job runs → Deletes ONLY review snippets → DB shows NULL
Cost: $0

🔒 SAFETY GUARANTEE:
- ✅ Deletes: google_reviews_highlights (review text snippets)
- ✅ Keeps: rating (4.5★), review_count (127), google_place_id, ALL other data
- ✅ Business still shows "4.5★ (127 reviews)" in chat
- ❌ Business no longer shows verbatim review text
```

### Phase 3: On-Demand Fetch (During Chat)
```
User asks chat → Tier 3 triggered → Business has NULL reviews + google_place_id
  → Fetch fresh reviews from Google → Display in response (don't store)
Cost: $0.025 per fetch
```

---

## Three Critical Protections

### 🛡️ Protection #1: Max 1 Fetch Per Chat

**Code location**: `lib/ai/hybrid-chat.ts`

```typescript
let alreadyFetchedReviews = false

if (!alreadyFetchedReviews && needsReviews) {
  const freshReviews = await fetchGoogleReviewsOnDemand(...)
  alreadyFetchedReviews = true // ✅ Prevents multiple fetches
}
```

**Prevents**: Accidentally fetching reviews for multiple businesses in one chat response

**Worst case without this**: 10,000 chats × 5 fetches each = $1,250/month

**With protection**: 10,000 chats × 1 fetch each = $250/month

---

### 🛡️ Protection #2: Only Fetch When Displaying

**Code location**: `lib/ai/hybrid-chat.ts`

```typescript
// Only fetch if we're building a rich response (not just conversational)
if (firstUnclaimedBusiness.google_place_id && shouldAttachCarousel) {
  const freshReviews = await fetchGoogleReviewsOnDemand(...)
}
```

**Prevents**: Fetching reviews for chats that don't actually display snippets

**Example**: User asks "thanks" → conversational response → no fetch needed

**Saves**: ~50% of potential fetches

---

### 🛡️ Protection #3: Rate Limiting

**Code location**: `lib/utils/google-reviews-on-demand.ts`

```typescript
// 5-minute cooldown per user per business
const rateLimitCache = new Map<string, number>()

function checkReviewFetchRateLimit(userKey, businessId) {
  if (lastFetch < 5 minutes ago) {
    return { allowed: false }
  }
  return { allowed: true }
}
```

**Prevents**: Same user hammering same business repeatedly

**Example**: User asks "pizza" 10 times in 1 minute → only 1 fetch

**Saves**: Prevents abuse/bot attacks

---

## Cost Breakdown (Corrected)

### Google Places API Pricing

| Operation | SKU | Cost |
|-----------|-----|------|
| **Import** (one-time) | Place Details Pro + Contact + Atmosphere | $0.034 per business |
| **On-Demand Fetch** (recurring) | Place Details Enterprise + Atmosphere | $0.025 per fetch |

### Real-World Cost Scenarios

#### Scenario A: Low Tier 3 Traffic (Most Realistic)
- 10,000 total chats/month
- 10% trigger Tier 3 (no paid businesses match) = 1,000 chats
- 50% of those actually fetch reviews (shouldAttachCarousel gate) = 500 fetches
- **Monthly cost**: 500 × $0.025 = **$12.50**

#### Scenario B: Medium Tier 3 Traffic
- 50,000 total chats/month
- 20% trigger Tier 3 = 10,000 chats
- 50% fetch reviews = 5,000 fetches
- **Monthly cost**: 5,000 × $0.025 = **$125**

#### Scenario C: High Tier 3 Traffic (Worst Case)
- 100,000 total chats/month
- 20% trigger Tier 3 = 20,000 chats
- 50% fetch reviews = 10,000 fetches
- **Monthly cost**: 10,000 × $0.025 = **$250**

---

## Comparison: Option A vs Option C

| Metric | Option A (Auto-Delete Only) | Option C (Hybrid On-Demand) |
|--------|----------------------------|----------------------------|
| **Google API Cost** | $0/month | $12.50-250/month |
| **User Experience** | Rating + count only (no snippets after 30 days) | Full snippets always available |
| **Compliance** | ✅ Perfect | ✅ Perfect |
| **Complexity** | Simple (1 cron job) | Medium (cron + on-demand fetch) |
| **Best For** | High claim rate (50%+) | Low claim rate, critical UX |

---

## Implementation Files

### 1. Auto-Delete Cron Job
**File**: `supabase/migrations/20260128000000_auto_delete_stale_reviews.sql`

**What it does**:
- Runs daily at 3 AM UTC
- Deletes `google_reviews_highlights` for unclaimed businesses > 30 days old
- Logs how many were deleted

**Run manually**:
```sql
SELECT * FROM delete_stale_unclaimed_reviews();
```

---

### 2. On-Demand Fetch Utility
**File**: `lib/utils/google-reviews-on-demand.ts`

**Functions**:
- `fetchGoogleReviewsOnDemand(googlePlaceId, city)` - Fetch reviews from Google API
- `checkReviewFetchRateLimit(userKey, businessId)` - Prevent abuse

**Cost per call**: $0.025

---

### 3. Chat Integration
**File**: `lib/ai/hybrid-chat.ts`

**Logic**:
1. Check if business has cached reviews → use those
2. If NULL but has `google_place_id` → fetch on-demand
3. Apply all three protections (max 1, only when displaying, rate limit)
4. Display snippets in chat response

---

## Monitoring & Alerts

### Critical Metrics to Track

```sql
-- Daily cost estimate (run this query daily)
SELECT 
  COUNT(*) as stale_unclaimed_businesses,
  COUNT(*) * 0.025 as worst_case_daily_cost_if_all_fetched_once,
  COUNT(*) * 0.025 * 30 as worst_case_monthly_cost
FROM business_profiles
WHERE 
  status = 'unclaimed'
  AND auto_imported = true
  AND google_reviews_highlights IS NULL
  AND google_place_id IS NOT NULL;
```

### Set Up Alerts

**If monthly cost > $100**:
- Check: Are most businesses staying unclaimed? (low claim rate)
- Check: Is Tier 3 being triggered too often? (weak Tier 1/2 results)
- Action: Switch to Option A (auto-delete only) to eliminate recurring cost

**If monthly cost > $250**:
- 🚨 **EMERGENCY**: Something is wrong (bot attack or runaway fetching)
- Check logs for repeated fetches from same user
- Check rate limiting is working
- Consider temporary disable: Comment out on-demand fetch in hybrid-chat.ts

---

## Testing Before Production

### Test 1: Auto-Delete Works
```sql
-- Manually set a business to > 30 days old (for testing)
UPDATE business_profiles
SET created_at = NOW() - INTERVAL '35 days'
WHERE id = 'test-business-id';

-- Run delete function
SELECT * FROM delete_stale_unclaimed_reviews();

-- Verify reviews were deleted
SELECT business_name, google_reviews_highlights
FROM business_profiles
WHERE id = 'test-business-id';
-- Should show: google_reviews_highlights = NULL
```

---

### Test 2: On-Demand Fetch Works
```typescript
// In your dev environment
import { fetchGoogleReviewsOnDemand } from '@/lib/utils/google-reviews-on-demand'

const reviews = await fetchGoogleReviewsOnDemand(
  'ChIJ...', // Real Google Place ID
  'bournemouth'
)

console.log(reviews)
// Should show: array of 10 reviews (or null if none)
```

**Cost**: $0.025 per test

---

### Test 3: Rate Limiting Works
```typescript
import { checkReviewFetchRateLimit } from '@/lib/utils/google-reviews-on-demand'

// First call
const check1 = checkReviewFetchRateLimit('test-user', 'test-business')
console.log(check1) // { allowed: true }

// Immediate second call
const check2 = checkReviewFetchRateLimit('test-user', 'test-business')
console.log(check2) // { allowed: false, resetAt: Date }
```

---

### Test 4: Chat Integration (End-to-End)

**Setup**:
1. Import a business with reviews
2. Manually set `created_at` to 35 days ago
3. Run `delete_stale_unclaimed_reviews()` to clear reviews
4. Ask chat a query that triggers Tier 3 for that business

**Expected result**:
- Chat fetches reviews on-demand (logs "$0.025 cost")
- Response includes 3 review snippets
- Second query within 5 minutes uses cached result (no fetch)

---

## Rollback Plan

If Option C costs too much or causes issues:

### Step 1: Disable On-Demand Fetching
```typescript
// In lib/ai/hybrid-chat.ts, comment out the on-demand fetch:
/*
else if (!alreadyFetchedReviews && firstUnclaimedBusiness.google_place_id) {
  const freshReviews = await fetchGoogleReviewsOnDemand(...)
}
*/
```

**Effect**: Chat will show rating/count but no review snippets for stale businesses

**Cost savings**: Immediate (drops to $0/month)

---

### Step 2: Switch to Option A Permanently
```sql
-- Unschedule the cron job (if you want to stop deleting)
SELECT cron.unschedule('delete-stale-reviews');

-- Or keep it running (doesn't hurt, just prevents ToS violations)
```

**Effect**: Graceful degradation to Option A (auto-delete only, no on-demand fetching)

---

## FAQ

### Q: What if I run out of testing budget?

**A**: Comment out the on-demand fetch in `hybrid-chat.ts`. Chat will still work, just without review snippets for businesses > 30 days old.

---

### Q: Can I increase the rate limit timeout?

**A**: Yes, change `5 * 60 * 1000` (5 minutes) to `10 * 60 * 1000` (10 minutes) in `google-reviews-on-demand.ts`.

---

### Q: Can I cache the on-demand fetched reviews in DB?

**A**: Technically yes, but then you're back to the 30-day refresh problem. The whole point of on-demand is to stay fresh without storage.

---

### Q: What if Google API is down?

**A**: The fetch has a try/catch that logs the error and continues without snippets. Chat gracefully degrades to showing rating/count only.

---

### Q: Can I fetch reviews for Tier 1/2 businesses?

**A**: No. Tier 1/2 businesses use their own descriptions/menus (premium positioning). Google review snippets are ONLY for Tier 3 fallback.

---

## Decision Matrix

| If... | Then... |
|-------|---------|
| Most businesses claim within 30 days (50%+ claim rate) | ✅ Use **Option A** (auto-delete only, $0/month) |
| Low claim rate but Tier 1/2 strong (good paid business coverage) | ✅ Use **Option A** (Tier 3 rarely triggered) |
| Low claim rate AND Tier 3 often triggered | ✅ Use **Option C** (on-demand fetching, $25-250/month) |
| You have $6 testing budget | ✅ Start with **Option C**, switch to A if costs spike |
| You're risk-averse on costs | ✅ Use **Option A** (guaranteed $0 recurring) |

---

## Recommendation

**For your situation** (200 Bournemouth businesses, promo pack strategy, $6 testing budget):

1. **Start with Option C** for the first month
2. Monitor daily costs using the SQL query above
3. If costs stay < $25/month → keep Option C ✅
4. If costs spike > $100/month → switch to Option A (disable on-demand fetch)

**Why**: Your promo pack strategy should achieve 50%+ claim rate, so most businesses won't need on-demand fetching. The ones that stay unclaimed probably won't appear in chat often anyway (low popularity).

**Estimated cost**: $5-15/month (likely < your testing budget)

---

## Summary Checklist

- [x] Auto-delete cron job created (`20260128000000_auto_delete_stale_reviews.sql`)
- [x] On-demand fetch utility created (`google-reviews-on-demand.ts`)
- [x] Chat integration updated with 3 protections (`hybrid-chat.ts`)
- [ ] Run auto-delete migration in production
- [ ] Test on-demand fetch with 1 business ($0.025)
- [ ] Monitor costs for 1 week
- [ ] Decide: Keep Option C or switch to Option A

---

**Last updated**: 2026-01-28  
**Status**: ✅ Ready for production testing
