# Google Reviews Cost Strategy - Final Decision Guide

## Your Question: "What if business isn't claimed within 30 days?"

**Answer**: You'd be violating Google ToS by showing stale cached reviews → need a strategy.

---

## ✅ IMPLEMENTED: Option C (Hybrid On-Demand)

I've just implemented a **belt-and-suspenders approach** that:
1. Automatically deletes reviews after 30 days (compliance)
2. Fetches fresh reviews on-demand when chat needs them (UX)
3. Has THREE protections against runaway costs

---

## 💰 Corrected Cost Analysis

### Google Places API Pricing (You Were Right!)

| What I Said Earlier | Reality (Your Correction) |
|---------------------|---------------------------|
| On-demand fetch = $0.014 | On-demand fetch = **$0.025** ✅ |
| (Atmosphere SKU only) | (Place Details Enterprise + Atmosphere) |

**Thank you for catching this!** The full API call costs more than just the Atmosphere field.

---

## 📊 Real-World Cost Scenarios (Corrected)

### Your Launch: 200 Bournemouth Businesses

| Phase | Description | Cost |
|-------|-------------|------|
| **Import** | 200 businesses × $0.034 | **$6.80** (one-time) |
| **Month 1** | Auto-delete (daily cron) | **$0** |
| **Month 1** | On-demand fetches (if needed) | **$0-25** |
| **Total Month 1** | | **$6.80-31.80** |

**Breakdown of on-demand costs**:
- If 50% of businesses claim within 30 days → 100 stale unclaimed
- If 10% of stale appear in chat → 10 businesses
- If each fetched once → 10 × $0.025 = **$0.25/month** (negligible!)

---

## 🎯 Your $6 Testing Budget Reality Check

**You said**: "$6 buys ~240 review fetches at $0.025 each"

**Translation**:
- Import 200 businesses: **Uses $6.80** (slightly over budget for import alone)
- On-demand fetches: **240 fetches = $6** (separate from import)

**Recommendation**: 
- Use **Option A** (auto-delete only, no on-demand) if testing budget is tight
- Upgrade to **Option C** once you validate the model works

---

## 🛡️ Three Protections (Implemented)

### Protection #1: Max 1 Fetch Per Chat ✅
```typescript
let alreadyFetchedReviews = false
// Prevents fetching reviews for multiple businesses in one response
```

**Without this**: 10,000 chats × 5 businesses = 50,000 fetches = **$1,250/month** 💀  
**With this**: 10,000 chats × 1 business = 10,000 fetches = **$250/month** ✅

---

### Protection #2: Only Fetch When Displaying ✅
```typescript
if (shouldAttachCarousel && needsReviews) {
  // Only fetch if we're building a rich response
}
```

**Saves**: ~50% of fetches (skips conversational-only chats)

---

### Protection #3: Rate Limiting ✅
```typescript
// 5-minute cooldown per user per business
checkReviewFetchRateLimit(userKey, businessId)
```

**Prevents**: Abuse, bot attacks, accidental hammering

---

## 📁 What I Just Created

### 1. Auto-Delete Cron Job
**File**: `supabase/migrations/20260128000000_auto_delete_stale_reviews.sql`
- Runs daily at 3 AM UTC
- Deletes reviews for unclaimed businesses > 30 days old
- **Cost**: $0

### 2. On-Demand Fetch Utility
**File**: `lib/utils/google-reviews-on-demand.ts`
- Fetches fresh reviews from Google when needed
- Includes rate limiting cache
- **Cost**: $0.025 per fetch

### 3. Chat Integration (Updated)
**File**: `lib/ai/hybrid-chat.ts`
- Tries cached reviews first (free)
- Falls back to on-demand fetch if stale (cost)
- Applies all three protections
- **Cost**: Variable based on usage

### 4. Documentation
- `OPTION_C_IMPLEMENTATION.md` - Full technical guide
- `IMPORT_COST_ANALYSIS.md` - Original cost breakdown (now corrected)
- `REVIEW_COST_STRATEGY_FINAL.md` - This file

---

## 🤔 Which Option Should You Choose?

### Option A: Auto-Delete Only (FREE)
**Cost**: $0/month recurring  
**UX**: Rating + count only (no snippets after 30 days)  
**Best for**: High claim rate (50%+), tight budget

**To use**: Just run the auto-delete migration, skip the on-demand integration

---

### Option C: Hybrid On-Demand (IMPLEMENTED)
**Cost**: $0-250/month (depends on traffic)  
**UX**: Full snippets always available  
**Best for**: Low claim rate, critical UX, budget for API calls

**To use**: Run both migrations, test with small traffic

---

## 🎯 My Recommendation for YOU

### Start with Option A (Auto-Delete Only)

**Why**:
1. Your promo pack strategy targets 50% claim rate → most businesses claim within 30 days
2. Your testing budget is tight ($6)
3. Tier 3 should rarely trigger (you'll have good Tier 1/2 coverage)
4. You can always upgrade to Option C later if needed

**How**:
1. ✅ Run the auto-delete migration (`20260128000000_auto_delete_stale_reviews.sql`)
2. ❌ Skip the on-demand fetch integration (comment out in `hybrid-chat.ts`)
3. 💰 Save the $0.025/fetch costs for other priorities

**Effect**:
- Businesses < 30 days old: Full review snippets ✅
- Businesses > 30 days old: Rating + count only (no snippets)
- Cost: **$0/month** forever 🎉

---

## ⚡ Quick Start (Option A)

### Step 1: Run Auto-Delete Migration
```sql
-- In Supabase SQL Editor
\i supabase/migrations/20260128000000_auto_delete_stale_reviews.sql

-- Verify it worked
SELECT * FROM delete_stale_unclaimed_reviews();
```

### Step 2: Disable On-Demand Fetching
```typescript
// In lib/ai/hybrid-chat.ts, comment out lines 988-1010:
/*
else if (!alreadyFetchedReviews && 
         firstUnclaimedBusiness.google_place_id && 
         shouldAttachCarousel) {
  // ... on-demand fetch code ...
}
*/
```

### Step 3: Test
- Import a business (reviews cached)
- Wait 30 days (or manually set `created_at` to past)
- Run cron job (reviews deleted)
- Ask chat about that business → shows rating/count, no snippets ✅

**Total cost**: $0/month

---

## 🚀 Upgrade to Option C Later (If Needed)

If after 1-2 months you find:
- Claim rate is lower than expected (< 30%)
- Tier 3 is triggered often (weak Tier 1/2 coverage)
- Users complain about missing review snippets

**Then**: Uncomment the on-demand fetch code, monitor costs for 1 week, adjust as needed.

---

## 📈 Cost Monitoring Query

Run this weekly to see if you need Option C:

```sql
-- How many businesses would benefit from on-demand fetching?
SELECT 
  COUNT(*) as stale_unclaimed_businesses,
  COUNT(*) * 0.025 as worst_case_monthly_cost_if_all_fetched_once
FROM business_profiles
WHERE 
  status = 'unclaimed'
  AND auto_imported = true
  AND google_reviews_highlights IS NULL  -- Deleted after 30 days
  AND google_place_id IS NOT NULL;  -- Can be fetched on-demand
```

**If result shows**:
- < 20 businesses → Option A is fine (negligible cost even with C)
- 20-100 businesses → Consider Option C if Tier 3 is common ($0.50-2.50/month)
- > 100 businesses → Need Option C or improve Tier 1/2 coverage

---

## 💡 Bottom Line

**What you worried about**: "If business not claimed within 30 days, am I violating Google ToS?"

**Answer**: Yes, if you show stale reviews.

**Solution**: I've implemented **Option C (Hybrid)** with all protections.

**My recommendation**: Start with **Option A** (auto-delete only) to save costs, upgrade to C if needed.

**Worst-case cost with Option C**: $250/month (10,000 Tier 3 chats)  
**Realistic cost with Option C**: $5-25/month (low Tier 3 traffic)  
**Cost with Option A**: **$0/month** ✅

**Files to review**:
1. `OPTION_C_IMPLEMENTATION.md` - Full technical details
2. `supabase/migrations/20260128000000_auto_delete_stale_reviews.sql` - Auto-delete cron
3. `lib/utils/google-reviews-on-demand.ts` - On-demand fetch utility (optional)
4. `lib/ai/hybrid-chat.ts` - Chat integration (already updated)

**Next steps**:
1. Decide: Option A (free) or Option C (paid)
2. Run auto-delete migration (both options need this)
3. Enable/disable on-demand fetch based on choice
4. Monitor for 1 month, adjust as needed

---

**Status**: ✅ Fully implemented, ready for your decision  
**Last updated**: 2026-01-28
