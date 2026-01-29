# Qwikker Vibes MVP - Implementation Complete ✅

## Overview

"Qwikker Vibes" is Qwikker's proprietary experience intelligence system — a lightweight, high-signal trust metric that captures user sentiment **after meaningful engagement**, not before.

**Launch Date**: 2026-01-28  
**Status**: ✅ Complete and ready for testing

---

## What Makes Vibes Different

| Traditional Reviews | Qwikker Vibes |
|---------------------|---------------|
| Anonymous, anytime | Triggered post-engagement |
| Long-form text | 3-choice sentiment (instant) |
| Can be gamed | Tied to wallet pass (1 vibe per business) |
| Stale (months/years old) | Recency-weighted |
| No context | Captured after directions/call/offer save |
| Platform-dependent (Google ToS) | Platform-owned (Qwikker IP) |

---

## Architecture

### Database Schema

**New Table**: `qwikker_vibes`
```sql
CREATE TABLE public.qwikker_vibes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  vibe_user_key TEXT NOT NULL,  -- Stable device/pass identifier
  vibe_rating TEXT NOT NULL CHECK (vibe_rating IN ('loved_it', 'it_was_good', 'not_for_me')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate vibes from same user/device
  CONSTRAINT uq_qwikker_vibes_business_vibeuserkey UNIQUE (business_id, vibe_user_key)
);
```

**Key Features:**
- One vibe per business per user/device (enforced via unique constraint)
- `vibe_user_key` from `app_users.wallet_pass_id` for spam prevention
- `user_id` links to `app_users`, NOT `auth.users` (wallet pass = identity)
- RLS policies: authenticated users can submit, anonymous can read stats

**New Columns**: `business_profiles`
- `claim_welcome_modal_shown` (BOOLEAN) — for onboarding flow

**Migration File**: `/supabase/migrations/vibes-mvp-migration.sql`

---

### API Endpoints

#### `POST /api/vibes/submit`
**Purpose**: Submit or update a user's vibe for a business

**Request:**
```json
{
  "businessId": "uuid",
  "vibeRating": "loved_it" | "it_was_good" | "not_for_me",
  "vibeUserKey": "stable-device-key",
  "walletPassId": "pass-id-from-cookie"
}
```

**Security:**
- Service role client (bypasses RLS for upsert)
- Validates `walletPassId` against `app_users` table
- Upserts on conflict `(business_id, vibe_user_key)` → updates existing vibe

**Response:**
```json
{
  "success": true,
  "vibe": { "id": "...", "vibe_rating": "loved_it" }
}
```

---

### Utility Functions

#### `lib/utils/vibes.ts`
**`getBusinessVibeStats(businessId: string)`**
- Aggregates vibe counts: `total_vibes`, `positive_vibes`, `positive_percentage`
- Returns `null` if business has no vibes
- Used by business detail page and AI chat

**Returns:**
```typescript
{
  total_vibes: number
  positive_vibes: number  // loved_it + it_was_good
  positive_percentage: number  // Math.round((positive / total) * 100)
  loved_it_count: number
  it_was_good_count: number
  not_for_me_count: number
}
```

---

## User Experience

### 1. Vibe Capture (Bottom Sheet)

**Trigger conditions** (after engagement):
- User taps **Get Directions** → 3-second delay → prompt
- User taps **Call Now** → 3-second delay → prompt
- User taps **Save Offer** → 3-second delay → prompt

**UI Component**: `components/user/vibe-prompt-sheet.tsx`

**Design** (premium, text-led):
```
┌────────────────────────────────────┐
│  How was your experience?          │
│  Help others discover great places │
│  like [Business Name].             │
│                                    │
│  [ 💚 Loved it! ]                  │
│  [ 👍 It was good ]                │
│  [ 💔 Not for me ]                 │
│                                    │
│  Your feedback helps us improve    │
│  Qwikker for everyone.             │
└────────────────────────────────────┘
```

**Key decisions:**
- No playful emojis in-line with text (premium positioning)
- Emojis in buttons only (acceptable for sentiment)
- Dismissible (doesn't block flow)
- One-time per business per device

---

### 2. Vibe Display ("What People Think" Tab)

**Location**: Business detail page → "What People Think" tab (renamed from "Reviews")

**Layout** (3 blocks):

#### Block A: Google Reviews (Social Proof)
```
⭐ 4.5 (127 reviews)
See what customers are saying on Google →
```
- Math-only (rating + count)
- Direct link to Google Maps
- For unclaimed businesses: May show "No review text for claimed businesses"

#### Block B: Qwikker Vibes (Experience Intelligence)
**If 0 vibes:**
```
Be the first to share your experience with this business.
```

**If 1-4 vibes:**
```
🎯 3 Qwikker Vibes
```

**If 5+ vibes:**
```
🎯 87% positive Qwikker Vibes (23 total)
```

#### Block C: About (Business Content)
- Business description (or placeholder for imported/unclaimed)
- Business tagline

**Component**: `components/user/user-business-detail-page.tsx`

---

### 3. AI Chat Integration

**Tier 1 (Paid/Trial) & Tier 2 (Claimed-Free Lite):**
- Vibes included in chat context if business has **5+ vibes** (statistically significant)
- AI can say: _"Qwikker users love this place (87% positive)"_
- Used for **within-tier ranking** (not cross-tier jumping)

**Sorting logic:**
```typescript
// 1. Tier priority (spotlight > featured > starter)
// 2. Vibes (within same tier, 5+ vibes only)
// 3. Google rating
// 4. Offers count
```

**File**: `lib/ai/hybrid-chat.ts`

---

## Testing Checklist

### ✅ Database
- [x] `vibes-mvp-migration.sql` run successfully
- [ ] Verify RLS policies (write blocked for all, read allowed for anon)
- [ ] Insert test vibe manually in Supabase SQL Editor

### ✅ API
- [ ] Test `POST /api/vibes/submit` with valid `walletPassId`
- [ ] Test duplicate vibe (should update, not error)
- [ ] Test invalid `walletPassId` (should return 401)
- [ ] Test invalid `vibeRating` (should return 400)

### ✅ UI - Vibe Capture
- [ ] Click "Get Directions" → 3-second delay → prompt appears
- [ ] Click "Call Now" → 3-second delay → prompt appears
- [ ] Click "Save Offer" → 3-second delay → prompt appears
- [ ] Submit "Loved it!" → success toast → prompt closes
- [ ] Re-visit same business → submit different vibe → updates existing

### ✅ UI - Vibe Display
- [ ] Business with 0 vibes → "Be the first to share your experience"
- [ ] Business with 1-4 vibes → "X Qwikker Vibes" (total only)
- [ ] Business with 5+ vibes → "X% positive Qwikker Vibes (Y total)"

### ✅ AI Chat
- [ ] Ask "best burgers near me" → businesses with 5+ vibes ranked higher within tier
- [ ] AI mentions vibes in response: "Qwikker users love this place"
- [ ] Businesses with <5 vibes excluded from vibe context

---

## Implementation Files

### Core Implementation
1. **`vibes-mvp-migration.sql`** — Database schema, RLS policies, indexes
2. **`lib/utils/vibes.ts`** — `getBusinessVibeStats()` utility
3. **`lib/utils/wallet-pass-security.ts`** — `validateWalletPassId()` for API auth
4. **`app/api/vibes/submit/route.ts`** — Vibe submission endpoint
5. **`components/user/vibe-prompt-sheet.tsx`** — Bottom sheet UI
6. **`components/user/user-business-detail-page.tsx`** — Display + trigger logic
7. **`app/user/business/[slug]/page.tsx`** — Server-side vibe stats fetch
8. **`lib/ai/hybrid-chat.ts`** — AI context + within-tier ranking

### Documentation
9. **`VIBES_MVP_COMPLETE.md`** — This file
10. **`QWIKKER_VIBES_ROADMAP.md`** — Long-term vision + "Option B" strategy
11. **`GOOGLE_REVIEWS_STRATEGY.md`** — Legal compliance + review handling

### Supporting Changes
12. **`three-tier-chat-system.sql`** — Updated fallback view to include `google_reviews_highlights` + `status`
13. **`lib/ai/hybrid-chat.ts`** — Lowered `matchThreshold` from 0.7 → 0.5 (fixed semantic search)
14. **`app/user/business/[slug]/page.tsx`** — Removed unused `google_reviews_highlights` from query

---

## Key Metrics to Track

### Launch Week (Week 1-2)
- **Vibe capture rate**: % of engagement actions → vibe submitted
- **Sentiment distribution**: loved_it / it_was_good / not_for_me ratio
- **Repeat vibe rate**: % of users changing their vibe (device-level)

### Month 1
- **Businesses with 5+ vibes**: % reaching statistical significance threshold
- **AI ranking impact**: Do high-vibe businesses show up first in chat?
- **User trust signal**: Do users click businesses with vibes more often?

### Month 3
- **Vibes vs. Google reviews correlation**: Do they align or diverge?
- **Claimed businesses vibe growth**: Free tier vs. paid tier vibe accumulation
- **Upsell impact**: Do vibes drive free → paid conversions?

---

## Future Enhancements (Post-MVP)

### Phase 2: Recency Weighting
```sql
-- Weight recent vibes higher in positive_percentage calculation
SELECT
  business_id,
  SUM(CASE 
    WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1.0
    WHEN created_at >= NOW() - INTERVAL '30 days' THEN 0.7
    ELSE 0.4
  END) as weighted_positive_vibes
FROM qwikker_vibes
WHERE vibe_rating IN ('loved_it', 'it_was_good')
GROUP BY business_id;
```

### Phase 3: Intent Signals
- Track **which action** triggered the vibe (directions/call/offer)
- _"10 people loved it after visiting"_ (directions)
- _"5 people said it was good after calling"_ (call)

### Phase 4: Sentiment Clustering
- Group businesses by vibe patterns: "Consistently loved", "Mixed reviews", "Trending up"
- Show badges: 🔥 Trending, 💎 Hidden Gem, ⭐ Consistently Great

### Phase 5: Business Dashboard
- Let businesses see their vibes breakdown
- Respond to negative vibes (optional, gated feature)
- Export vibe data for marketing

---

## Known Limitations (MVP)

1. **No vibe editing** — Users can update their vibe but can't delete it
2. **No vibe history** — Only stores current vibe, not historical changes
3. **No user-facing vibe stats** — Users can't see their own vibes across businesses
4. **No admin moderation** — No way to flag/remove spam vibes (relies on uniqueness constraint)
5. **No business response** — Businesses can't reply to vibes (future feature)

---

## Success Criteria

**MVP is successful if:**
- ✅ 10% of engagement actions → vibe submitted (Week 1)
- ✅ 50%+ of businesses with traffic get 1+ vibe (Month 1)
- ✅ 20%+ of businesses reach 5+ vibes (statistical significance) (Month 2)
- ✅ Vibes visibly improve AI ranking accuracy (measured by user clicks)
- ✅ Zero spam vibes reported (uniqueness constraint works)

**Ready for Phase 2 if:**
- 100+ businesses with 10+ vibes each
- Clear sentiment patterns emerging (loved_it vs. not_for_me)
- User feedback requests more vibe context (e.g., "when did they visit?")

---

## Launch Checklist

- [ ] Run `vibes-mvp-migration.sql` in production Supabase
- [ ] Deploy all code changes to production
- [ ] Test vibe capture on live Bournemouth businesses
- [ ] Monitor logs for API errors (`/api/vibes/submit`)
- [ ] Check RLS policies (ensure users can't spam vibes)
- [ ] Verify AI chat uses vibes for businesses with 5+
- [ ] Send internal test vibes for 3-5 businesses
- [ ] Soft launch: monitor for 48 hours
- [ ] Full launch: announce to users via push notification

---

## Contact / Questions

**Implementation Lead**: Cursor AI Assistant  
**Date**: 2026-01-28  
**Status**: ✅ Complete, pending production deployment

---

**Next Steps:**
1. User reviews this document
2. User runs `vibes-mvp-migration.sql` in production
3. User deploys code to production
4. User tests vibe capture + display + AI chat
5. User launches to users! 🚀
