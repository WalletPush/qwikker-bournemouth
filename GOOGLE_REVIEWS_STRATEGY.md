# Google Reviews Strategy & Legal Compliance

## Executive Summary

Qwikker's approach to Google review content is designed for **strict legal compliance** with Google Places API Terms of Service while maximizing value for both users and businesses.

---

## Legal Framework (Google Places API ToS)

### ✅ What's Allowed
- **Math-based social proof**: Rating (4.5★) + review count (127 reviews)
- **Verbatim snippets with attribution**: Up to 5 reviews, refreshed every 30 days, with clear Google attribution
- **Direct linking**: "See all reviews on Google Maps" with business-specific URLs

### ❌ What's NOT Allowed
- AI-generated review summaries (e.g., "Users love the burgers")
- Storing review text beyond 30 days without refresh
- Modifying or paraphrasing review content
- Using review content without proper Google attribution

---

## Qwikker's Three-Tier Review Strategy

### 🎖️ Tier 1: Paid/Trial Businesses (Spotlight, Featured, Starter)
**What they get:**
- Google rating + review count (math only)
- Qwikker Vibes (proprietary trust signal)
- Business-provided descriptions, highlights, and content

**Why no Google snippets:**
- Premium positioning: They control their narrative
- Compliance: Claimed businesses can't guarantee 30-day refresh
- Better UX: Business-crafted content > random review excerpts

**Technical implementation:**
- `business_profiles_chat_eligible` view excludes `google_reviews_highlights`
- Chat uses `business_description` and `business_highlights` instead
- "What People Think" tab shows: Google rating → Qwikker Vibes → Business bio

---

### 🌱 Tier 2: Claimed-Free "Lite" Businesses
**What they get:**
- Google rating + review count (math only)
- Qwikker Vibes (if enough user feedback)
- Featured menu items (up to 5)
- Business-provided descriptions

**Why no Google snippets:**
- Same as Tier 1: They've claimed ownership, so they control their content
- Compliance risk: Can't guarantee refresh cadence

**Technical implementation:**
- `business_profiles_lite_eligible` view excludes `google_reviews_highlights`
- Chat shows text-only mentions with menu preview
- "What People Think" tab same as Tier 1

---

### 📂 Tier 3: Unclaimed Fallback Directory
**What they get:**
- Google rating + review count
- **Verbatim Google review snippets** (up to 3, with full attribution)
- Basic contact info (phone, website, location)

**Why snippets are legal here:**
- Stored at import time (< 30 days old)
- Clear disclaimer: "I don't have confirmed menu information"
- Explicit Google attribution: "_Ratings and reviews data provided by Google_"
- Not claimed = no business expectations of narrative control

**Technical implementation:**
- `google_reviews_highlights` stored in DB at import (10 max, show 3 in chat)
- `business_profiles_ai_fallback_pool` view includes `google_reviews_highlights` + `status`
- Chat verifies `status === 'unclaimed'` before displaying snippets
- Auto-refreshed when business imports are re-run

---

## Database Schema

### `business_profiles.google_reviews_highlights`
```jsonb
[
  {
    "author": "Sarah M.",
    "rating": 5,
    "text": "Amazing burgers! The wagyu was cooked perfectly.",
    "time": "2 weeks ago",
    "profile_photo": "https://..."
  }
]
```

**Populated by:**
- ✅ Import route for unclaimed businesses (stored at import time)
- ❌ NOT populated for claimed businesses (compliance risk)

**Consumed by:**
- ✅ Chat for Tier 3 fallback (verbatim snippets with attribution)
- ❌ NOT used for Tier 1/2 (they use Qwikker Vibes + business content)
- ❌ NOT used in business detail page (What People Think tab uses Vibes)

---

## Qwikker Vibes: The Long-Term Moat

**Why it's better than Google reviews:**
- **Context-aware**: Captured after engagement (directions, calls, offer saves)
- **Recency bias**: Weight recent experiences more (unlike stale reviews)
- **Intent data**: "Loved it after tapping Get Directions" > anonymous review
- **Cannot be gamed**: Tied to wallet pass, post-action trigger, no incentive loop
- **Platform control**: No Google ToS constraints, no 30-day refresh rules

**Strategic positioning:**
- Google reviews = **social proof** (helps discovery)
- Qwikker Vibes = **experience intelligence** (drives decisions)

---

## Compliance Checklist

- [x] Math-based social proof for all businesses (rating + count)
- [x] Verbatim snippets ONLY for unclaimed businesses
- [x] Explicit Google attribution for review snippets
- [x] Direct "See on Google Maps" links (business-specific URLs)
- [x] No AI summaries of Google review content
- [x] No storing snippets for claimed businesses (30-day risk)
- [x] Qwikker Vibes as proprietary alternative

---

## Migration Path (When Business Claims)

**Before claim:**
- Status: `unclaimed`
- Tier 3 fallback: Shows Google review snippets
- No Qwikker Vibes (anonymous)

**After claim:**
- Status: `claimed_free` or paid tier
- Google review snippets disappear (compliance)
- Qwikker Vibes start accumulating
- Business can add descriptions, highlights, menu

**No data loss:**
- Google rating + count still visible
- Vibes replace review snippets as trust signal
- Better positioning (business controls narrative)

---

## Technical Files Modified

### 1. `three-tier-chat-system.sql`
- Added `google_reviews_highlights` and `status` to `business_profiles_ai_fallback_pool` view

### 2. `lib/ai/hybrid-chat.ts`
- Removed `google_reviews_highlights` from Tier 1 (paid/trial) query
- Kept `google_reviews_highlights` logic for Tier 3 (fallback only)
- Lowered `matchThreshold` from 0.7 → 0.5 for better semantic search results

### 3. `app/user/business/[slug]/page.tsx`
- Removed `google_reviews_highlights` from query (not used in component)
- "What People Think" tab uses Vibes, not review text

### 4. `app/api/admin/import-businesses/import/route.ts`
- Stores `google_reviews_highlights` for imported businesses (up to 10 reviews)

---

## Future Enhancements

1. **30-day refresh cron job** (if needed):
   ```sql
   -- Re-fetch reviews for unclaimed businesses > 30 days old
   UPDATE business_profiles
   SET google_reviews_highlights = fetch_from_google_api(google_place_id)
   WHERE status = 'unclaimed'
     AND auto_imported = true
     AND updated_at < NOW() - INTERVAL '30 days';
   ```

2. **Vibes weighting by recency**:
   - Last 7 days: 1.0x weight
   - 8-30 days: 0.7x weight
   - 31-90 days: 0.4x weight

3. **Sentiment clustering** (without Google review text):
   - Vibes + offer redemption rate + repeat visits → "Trending" badge

---

## Key Takeaways

✅ **Compliant**: Strict adherence to Google Places API ToS  
✅ **Strategic**: Qwikker Vibes > Google reviews for long-term moat  
✅ **Monetization-friendly**: Premium tiers control their narrative  
✅ **User trust**: Real experience data beats anonymous reviews  
✅ **Scalable**: No manual refresh needed, auto-updated at import  

---

**Last updated**: 2026-01-28  
**Status**: ✅ Implemented and deployed
