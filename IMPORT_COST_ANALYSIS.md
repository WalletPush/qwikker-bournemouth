# Import Cost Analysis: Google Places API + OpenAI

## Executive Summary

**Current implementation**: Google reviews are fetched **ONCE** during import and stored in the database. **No recurring API costs** for reviews after initial import.

**Cost per imported business**:
- **Google Places API**: ~$0.017 USD per business
- **OpenAI (optional)**: $0 (embeddings NOT auto-generated during import)
- **Total**: ~$0.017 per business

**For 200 businesses**: ~$3.40 USD (one-time)

---

## Google Places API Cost Breakdown

### API Call Flow (Per Business)

When you import a business via `/api/admin/import-businesses/import`, the system makes **ONE** Google Places API call:

```typescript
// Single API call per business
const detailsUrl = `https://places.googleapis.com/v1/${placeId}`
const detailsResponse = await fetch(detailsUrl, {
  headers: {
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents,nationalPhoneNumber,websiteUri,rating,userRatingCount,types,primaryType,location,businessStatus,regularOpeningHours.weekdayDescriptions,photos,reviews'
  }
})
```

### What's Requested (FieldMask)

| Field | Cost Category | SKU | Cost per 1,000 calls |
|-------|---------------|-----|----------------------|
| `id` | Basic | Free | $0.00 |
| `displayName` | Basic | Free | $0.00 |
| `formattedAddress` | Basic | Free | $0.00 |
| `addressComponents` | Basic | Free | $0.00 |
| `nationalPhoneNumber` | Contact | SKU: Contact Data | $3.00 |
| `websiteUri` | Contact | SKU: Contact Data | $3.00 |
| `rating` | Basic | Free | $0.00 |
| `userRatingCount` | Basic | Free | $0.00 |
| `types` | Basic | Free | $0.00 |
| `primaryType` | Basic | Free | $0.00 |
| `location` | Basic | Free | $0.00 |
| `businessStatus` | Basic | Free | $0.00 |
| `regularOpeningHours.weekdayDescriptions` | Basic | Free | $0.00 |
| `photos` | Basic | Free | $0.00 |
| `reviews` | Atmosphere | SKU: Atmosphere | $14.00 |

### Cost Calculation

**Billable fields requested**:
1. `nationalPhoneNumber` + `websiteUri` = **Contact Data** ($3.00 per 1,000 calls)
2. `reviews` = **Atmosphere** ($14.00 per 1,000 calls)

**Total per call**: $0.017 USD

**Formula**:
```
Contact Data: $3.00 / 1,000 = $0.003 per call
Atmosphere: $14.00 / 1,000 = $0.014 per call
Total: $0.017 per business
```

### Example Costs

| Businesses Imported | Google API Cost |
|---------------------|-----------------|
| 10 | $0.17 |
| 50 | $0.85 |
| 100 | $1.70 |
| 200 | $3.40 |
| 500 | $8.50 |
| 1,000 | $17.00 |

---

## What Gets Stored in Database

### `business_profiles.google_reviews_highlights`

**Stored as JSONB** (up to 10 reviews):
```json
[
  {
    "author": "Sarah M.",
    "rating": 5,
    "text": "Amazing burgers! The wagyu was cooked perfectly.",
    "time": "2 weeks ago",
    "profile_photo": "https://..."
  },
  ...
]
```

**Key points**:
- ✅ Fetched ONCE during import
- ✅ Stored permanently in your Supabase DB
- ✅ NO recurring API calls to fetch reviews
- ✅ NO 30-day refresh requirement (unclaimed businesses only)
- ⚠️ Reviews ARE deleted when business is claimed (compliance)

**Why this is cost-effective**:
- You pay Google $0.014 per business for reviews
- You store them in your own DB (free)
- You never call Google again for those reviews
- Only cost: Supabase storage (~1KB per business = negligible)

---

## OpenAI Embedding Costs

### Current Implementation: **NOT Auto-Generated**

**The import route does NOT call OpenAI** — embeddings are generated separately.

When you import a business via the admin UI:
1. Business profile is inserted into `business_profiles` ✅
2. Google reviews are stored in `google_reviews_highlights` ✅
3. **NO embedding is generated** ❌

### When ARE Embeddings Generated?

Embeddings are generated via **manual admin actions** or **triggers**:

#### Option A: Manual Sync
```typescript
// lib/ai/embeddings.ts
await syncBusinessProfileToKnowledgeBase(businessId)
```

**Cost**: $0.0001 per business (1 KB of text)

#### Option B: Bulk Generation
```typescript
// lib/ai/embeddings.ts
await generateMissingEmbeddings(city)
```

**Cost**: $0.0001 × number of businesses without embeddings

### OpenAI Embedding Pricing (text-embedding-ada-002)

| Input Tokens | Cost per 1M tokens | Cost per business (avg) |
|--------------|-------------------|-------------------------|
| ~300 tokens | $0.10 | $0.00003 |

**Example**:
- 1,000 businesses × $0.00003 = **$0.03 USD**

---

## Total Cost Comparison

### Scenario: Import 200 Bournemouth Businesses

| Service | Operation | Frequency | Cost |
|---------|-----------|-----------|------|
| Google Places API | Fetch details + reviews | Once per import | $3.40 |
| Supabase | Store business data | Once per import | Free |
| OpenAI | Generate embeddings (optional) | Manual action | $0.006 |
| **Total** | | | **$3.41** |

### Scenario: Import 1,000 Businesses Across 5 Cities

| Service | Operation | Frequency | Cost |
|---------|-----------|-----------|------|
| Google Places API | Fetch details + reviews | Once per import | $17.00 |
| Supabase | Store business data | Once per import | Free |
| OpenAI | Generate embeddings (optional) | Manual action | $0.03 |
| **Total** | | | **$17.03** |

---

## Cost Optimization Strategies

### 1. **Skip Reviews for Businesses You Don't Need** ❌ (Not Recommended)

You could remove `reviews` from the FieldMask:

```diff
- 'X-Goog-FieldMask': '...,reviews'
+ 'X-Goog-FieldMask': '...'  // Remove reviews
```

**Savings**: $14.00 per 1,000 calls → $0.003 per business  
**Trade-off**: No review snippets for Tier 3 fallback (chat will be weaker)

**Recommendation**: ❌ **Don't do this** — reviews are the most valuable part of unclaimed listings.

---

### 2. **Only Import High-Quality Businesses** ✅ (Recommended)

Use filters during import:
- Minimum rating: 4.4★
- Minimum review count: 10
- Exclude closed businesses

**Effect**: Import 150 instead of 200 → save $0.85  
**Benefit**: Higher quality listings, less clutter

---

### 3. **Don't Generate Embeddings for Unclaimed Businesses** ✅ (Current Strategy)

Since unclaimed businesses don't participate in semantic search anyway (they're Tier 3 fallback only), you don't need embeddings until they claim.

**Savings**: $0.00003 × unclaimed businesses  
**Effect**: Minimal cost savings, but simpler system

---

### 4. **Batch Import to Reduce Per-Business Overhead** ✅ (Current Strategy)

Your current system already batches imports, so you're not paying any extra overhead.

---

## Recurring Costs (Post-Import)

### Google Places API: **$0.00** 🎉

Once imported, you never call Google again for those businesses unless:
- You want to refresh their data (manual admin action)
- Business claims listing and you want updated phone/website

**No automatic refresh = no recurring costs**

### OpenAI: **$0.00** 🎉

Embeddings are generated once and stored. Chat queries do NOT call OpenAI for embeddings — they use pre-computed vectors stored in Supabase.

**Only OpenAI cost is chat responses**:
- GPT-4o-mini: $0.15 per 1M input tokens + $0.60 per 1M output tokens
- Average chat: ~500 input tokens + ~200 output tokens = $0.00019 per conversation

---

## Real-World Cost Examples

### Launch Scenario: 200 Bournemouth Businesses

**One-time import costs**:
- Google Places API: $3.40 (for details + reviews)
- OpenAI embeddings: $0.006 (optional)
- **Total**: $3.41

**Month 1 recurring costs** (assume 1,000 user chats):
- OpenAI chat responses: $0.19
- Google Places API: $0.00
- **Total**: $0.19

---

### Scale Scenario: 1,000 Businesses Across 5 Cities

**One-time import costs**:
- Google Places API: $17.00
- OpenAI embeddings: $0.03 (optional)
- **Total**: $17.03

**Month 1 recurring costs** (assume 10,000 user chats):
- OpenAI chat responses: $1.90
- Google Places API: $0.00
- **Total**: $1.90

---

## Hidden Costs to Watch

### 1. **Google Photos (if you add them)**

Currently you request `photos` in the FieldMask but don't download/store them.

**If you add photo downloads**:
- First photo: Free (included in Basic SKU)
- Additional photos: $7.00 per 1,000 calls (per photo)

**Recommendation**: Only download hero image (1st photo) = no extra cost.

---

### 2. **Supabase Storage**

**Per business stored**:
- Business profile: ~2 KB
- 10 review snippets: ~1 KB
- Total: ~3 KB

**For 1,000 businesses**:
- Storage: ~3 MB
- Cost: Free (Supabase free tier = 500 MB)

**For 10,000 businesses**:
- Storage: ~30 MB
- Cost: Free (still under 500 MB)

---

### 3. **OpenAI Chat Usage** (Main Recurring Cost)

**This is where your real costs will be**:

| User Activity | Chats per Month | OpenAI Cost |
|---------------|-----------------|-------------|
| 100 active users × 10 chats each | 1,000 | $0.19 |
| 500 active users × 10 chats each | 5,000 | $0.95 |
| 1,000 active users × 20 chats each | 20,000 | $3.80 |

**Recommendation**: Monitor OpenAI usage closely as you scale. Consider:
- Caching common queries
- Rate limiting per user
- Using gpt-4o-mini (current strategy ✅)

---

## Cost Control Recommendations

### ✅ What You're Doing Right

1. **Using gpt-4o-mini** instead of gpt-4 (10x cheaper)
2. **Storing reviews in DB** instead of fetching live (one-time cost)
3. **Skipping embeddings for unclaimed businesses** (saves OpenAI costs)
4. **Filtering by rating** during import (higher quality → fewer imports)
5. **Batching imports** (reduces overhead)

### ⚠️ What to Monitor

1. **Chat usage** as you scale (main recurring cost)
2. **Re-imports** (if admins repeatedly import same businesses)
3. **Embedding generation** (if you enable auto-sync for all businesses)

### 🚨 What to Avoid

1. **Auto-refreshing Google reviews** (would add $0.014 per business per refresh)
2. **Generating embeddings for every import** (unnecessary for unclaimed)
3. **Downloading multiple photos** (adds $7 per 1,000 calls per photo)
4. **Using gpt-4 for chat** (10x more expensive than gpt-4o-mini)

---

## Summary: Your Current Setup is Cost-Efficient ✅

**One-time import**: ~$3.40 for 200 businesses  
**Recurring monthly**: ~$0.19 per 1,000 chats (OpenAI only)  
**Google API recurring**: $0.00 (reviews stored in DB)  

**Your architecture is well-designed for cost control**:
- Pay once for Google reviews, use forever
- No automatic refreshes (avoiding recurring Google costs)
- Embeddings are optional and cheap
- Using gpt-4o-mini for chat (10x cheaper than gpt-4)

**Main cost driver as you scale**: OpenAI chat responses (~$0.00019 per conversation)

---

## Quick Cost Calculator

```
Google Places Import Cost = (businesses × $0.017)
OpenAI Embedding Cost = (businesses × $0.00003) [optional]
Monthly Chat Cost = (conversations × $0.00019)
```

**Examples**:
- 200 imports + 1,000 chats/month = $3.40 + $0.19 = **$3.59/month**
- 500 imports + 5,000 chats/month = $8.50 + $0.95 = **$9.45/month**
- 1,000 imports + 10,000 chats/month = $17.00 + $1.90 = **$18.90/month**

---

**Last updated**: 2026-01-28  
**Status**: ✅ Cost analysis complete
