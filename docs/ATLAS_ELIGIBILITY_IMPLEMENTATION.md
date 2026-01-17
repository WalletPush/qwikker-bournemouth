# Atlas Eligibility & Verification - Implementation Summary

## 🎯 Mission Complete

All Atlas eligibility rules, verification flows, and UI updates have been implemented to ensure **free_tier businesses NEVER appear in AI or Atlas**.

---

## ✅ What Was Implemented

### 1. **Eligibility Helpers** (`lib/atlas/eligibility.ts`)

Centralized source of truth for all Atlas/AI eligibility logic:

```typescript
// Core functions
isAiEligibleTier(tier) // Returns true for paid/trial tiers only
hasValidCoords(lat, lng) // Validates numeric coordinates
isAtlasEligible(business) // Combines tier + coords check
getTierPriority(tier) // Sorting priority (0-99)
isGoogleVerified(business) // Has Google Place ID + coords
getVerificationStatus(business) // 'complete' | 'incomplete' | 'missing_coords'
```

**Rules:**
- ✅ AI-eligible tiers: `qwikker_picks`, `featured`, `free_trial`, `recommended`
- ❌ Excluded: `free_tier`, `null`, `undefined`
- ✅ Atlas requires: AI-eligible tier + valid coordinates

---

### 2. **Atlas Search Endpoint** (`app/api/atlas/search/route.ts`)

**Changes:**
- Now queries `business_profiles_ai_eligible` view (not raw `business_profiles`)
- Runtime tier leakage check (logs + filters if any free_tier sneaks through)
- Server-side city derivation (never trusts client)

**Protection Layers:**
1. DB view excludes free_tier at query time
2. Runtime `isAtlasEligible()` check filters results
3. Logs critical errors if leakage detected

---

### 3. **Join Qwikker UI** (`components/simplified-onboarding-form.tsx`)

**Updated Copy:**

**"Verify with Google" Card:**
- Title: "Verify with Google"
- Subtitle: "Unlock QWIKKER Atlas & premium discovery"
- Bullets:
  - Auto-fills business details from Google
  - Enables QWIKKER Atlas (map discovery)
  - Shows real distance & directions
  - Faster approval process
- **Microcopy:** "Required for Atlas map placement" (green)

**"Create Listing" Card:**
- Title: "Create Listing"
- Subtitle: "Standard onboarding (no map placement yet)"
- Bullets:
  - Enter business details manually
  - Best for new or unlisted businesses
  - Reviewed by our team before going live
- **Microcopy:** "Atlas map placement requires Google verification" (gray)

---

### 4. **Business Dashboard Widget** (`components/dashboard/VerificationStatusWidget.tsx`)

**States:**

**1) Not Verified (Incomplete)**
- Status badge: "Incomplete" (amber)
- Description: "Verify with Google to appear on QWIKKER Atlas"
- CTA: "Verify with Google" button → redirects to profile verification
- Explains Atlas shows customers exact location with directions

**2) Verified (Complete)**
- Status badge: "Complete" (green)
- Description: "Your business is verified and can appear in Atlas"
- Shows tier eligibility status
- Displays Google Place ID confirmation

**3) Missing Coords (Rare)**
- Status badge: "Incomplete" (amber)
- Description: "Verification missing location coordinates"
- CTA: "Fix Verification" button

**Integrated:** Added to `components/dashboard/improved-dashboard-home.tsx` before Quick Actions section

---

### 5. **Atlas Sanity Check SQL** (`scripts/atlas-sanity.sql`)

**8 Comprehensive Checks:**

1. **Total businesses per tier** (with/without coords breakdown)
2. **AI-eligible tiers missing coordinates** (data quality issues)
3. **Free tier businesses with coords** (OK, but excluded count)
4. **Businesses with null tier** (should be excluded, listed)
5. **Atlas-eligible count** (from view)
6. **Verification status breakdown** (verified/partial/not verified)
7. **🔒 CRITICAL: View leakage check** (must be 0 for all)
8. **City-specific Atlas readiness** (atlas-ready count per city)

**Usage:**
```bash
psql $DATABASE_URL -f scripts/atlas-sanity.sql
```

Expected: Section 7 (leakage checks) should return all **0** counts.

---

## 🔒 Security & Safety Measures

### Defense in Depth (Multi-Layer Protection)

**Layer 1: Database View**
- `business_profiles_ai_eligible` physically filters at query time
- Excludes `free_tier` + requires coords

**Layer 2: Query Endpoint**
- `/api/atlas/search` uses the safe view
- Server-side city derivation only

**Layer 3: Runtime Check**
- `isAtlasEligible()` validation in endpoint
- Logs critical errors if free_tier leaks through
- Filters results as safety net

**Layer 4: Client-Side Validation**
- Verification widget checks `isGoogleVerified()`
- UI prevents access to Atlas without proper tier

---

## 📊 Tier Eligibility Matrix

| Tier | AI/Chat | Atlas | Verification Required |
| --- | --- | --- | --- |
| `qwikker_picks` (Spotlight) | ✅ | ✅ | Yes (Google + coords) |
| `featured` | ✅ | ✅ | Yes (Google + coords) |
| `free_trial` | ✅ | ✅ | Yes (Google + coords) |
| `recommended` (Starter) | ✅ | ✅ | Yes (Google + coords) |
| `free_tier` | ❌ | ❌ | No (excluded always) |
| `null` / undefined | ❌ | ❌ | No (conservative default) |

---

## 🛠️ Verification Flow

### New Business Onboarding

**Path A: Verify with Google (Recommended)**
1. User clicks "Verify with Google"
2. Searches for business via Google Places API
3. System auto-fills: name, address, phone, hours, rating
4. **Critically:** Sets `google_place_id` + `latitude` + `longitude`
5. Business tier determines AI/Atlas visibility
6. If tier is AI-eligible → immediately appears in Atlas

**Path B: Create Listing (Manual)**
1. User clicks "Create Listing"
2. Manually enters business details
3. ❌ No `google_place_id` or coords
4. ❌ **NOT Atlas-eligible** (even if paid tier)
5. Dashboard shows "Verify with Google" prompt
6. User can verify later to unlock Atlas

### Existing Business Upgrade

**Scenario: Imported → Claimed → Upgraded**
1. Business imported via Google Places (`auto_imported=true`)
2. Business owner claims listing
3. Tier upgraded to `free_trial` or paid
4. ✅ Automatically Atlas-eligible (has coords from import)
5. No additional manual verification needed

**Scenario: Manual → Upgrade → Verify**
1. Business manually created (`google_place_id=null`)
2. Upgrade to paid tier
3. ❌ Still NOT Atlas-eligible (missing coords)
4. Dashboard shows verification widget
5. User completes Google verification
6. ✅ Now Atlas-eligible

---

## 📁 Files Changed

### New Files
1. ✅ `lib/atlas/eligibility.ts` - Eligibility helpers
2. ✅ `components/dashboard/VerificationStatusWidget.tsx` - Dashboard widget
3. ✅ `scripts/atlas-sanity.sql` - Sanity check queries

### Modified Files
4. ✅ `app/api/atlas/search/route.ts` - Uses safe view + runtime checks
5. ✅ `components/simplified-onboarding-form.tsx` - Updated card copy
6. ✅ `components/dashboard/improved-dashboard-home.tsx` - Added widget

### Previously Completed
7. ✅ `supabase/migrations/20260117000004_create_ai_safe_view.sql` - DB view
8. ✅ `lib/ai/hybrid-chat.ts` - Uses `business_profiles_ai_eligible`
9. ✅ `app/api/atlas/query/route.ts` - Atlas HUD bubble endpoint
10. ✅ `components/atlas/AtlasHudBubble.tsx` - Ephemeral UI bubble
11. ✅ `lib/ai/prompts/atlas.ts` - Spatial AI prompt

---

## ✅ Testing Checklist

### 1. Eligibility Helpers
```bash
# In Node.js console or test file
import { isAiEligibleTier, hasValidCoords, isAtlasEligible } from '@/lib/atlas/eligibility'

isAiEligibleTier('qwikker_picks') // ✅ true
isAiEligibleTier('free_tier') // ❌ false
isAiEligibleTier(null) // ❌ false

hasValidCoords(50.7192, -1.8808) // ✅ true
hasValidCoords(null, -1.8808) // ❌ false

isAtlasEligible({ business_tier: 'featured', latitude: 50.7, longitude: -1.8 }) // ✅ true
isAtlasEligible({ business_tier: 'free_tier', latitude: 50.7, longitude: -1.8 }) // ❌ false
```

### 2. Atlas Search Endpoint
```bash
# Test API directly
curl "https://bournemouth.qwikker.com/api/atlas/search?q=seafood" | jq '.results[] | {name, tier}'

# Expected: Only qwikker_picks, featured, free_trial, recommended
# NEVER free_tier or null
```

### 3. Database View
```sql
-- Run sanity script
psql $DATABASE_URL -f scripts/atlas-sanity.sql

-- Check section 7 (CRITICAL: View leakage check)
-- All counts MUST be 0
```

### 4. UI Testing
- Visit `/onboarding`
- Verify card copy mentions Atlas
- Visit `/dashboard`
- Check for verification widget
- Click "Verify with Google" → should work
- Verify status reflects `google_place_id` + coords

### 5. E2E Flow Testing
**Test 1: Google verification unlocks Atlas**
1. Create new business via "Verify with Google"
2. Complete onboarding
3. Upgrade to Featured
4. Search in Atlas → business appears ✅

**Test 2: Manual listing requires verification**
1. Create new business via "Create Listing"
2. Complete onboarding
3. Dashboard shows "Incomplete" verification
4. Search in Atlas → business does NOT appear ❌
5. Click "Verify with Google"
6. Complete verification
7. Search in Atlas → business appears ✅

**Test 3: Free tier always excluded**
1. Create business (any method)
2. Keep as `free_tier`
3. Search in AI chat → does NOT appear ❌
4. Search in Atlas → does NOT appear ❌
5. Upgrade to `free_trial`
6. Search in AI chat → appears ✅
7. Search in Atlas → appears ✅

---

## 🚨 What to Watch For

### Data Quality Issues
- Run `scripts/atlas-sanity.sql` section 2 to find paid businesses missing coords
- These are likely manual entries that need Google verification
- Contact owners via dashboard widget

### Tier Leakage
- Monitor `/api/atlas/search` logs for "CRITICAL: free_tier leaked" errors
- Should **NEVER** happen if view is correct
- If it does, investigate DB constraint/migration issues

### Verification Edge Cases
- Business has `google_place_id` but missing coords → rare, but handle with "Fix Verification"
- Business manually entered fake address → coords missing, Atlas won't work

---

## 🎯 Success Metrics

**Green Light Indicators:**
- ✅ Atlas sanity script section 7 returns all 0s (no leakage)
- ✅ No "CRITICAL: free_tier leaked" logs in Atlas search
- ✅ Verification widget shows correct status on dashboard
- ✅ Join Qwikker cards clearly communicate Atlas requirement
- ✅ Paid businesses with Google verification appear in Atlas
- ✅ Free tier businesses NEVER appear in AI or Atlas

---

## 📝 Commit Message

```
🔒 Atlas eligibility rules + Google verification flow

CRITICAL: Enforce tier + coords filtering for Atlas/AI

ELIGIBILITY RULES:
- Free tier NEVER appears in AI or Atlas (multi-layer enforcement)
- Atlas requires: AI-eligible tier + valid coordinates
- Google verification is canonical path for coords

IMPLEMENTATION:
- lib/atlas/eligibility.ts: Centralized eligibility helpers
- app/api/atlas/search: Uses business_profiles_ai_eligible view
- Runtime tier leakage check + logging
- scripts/atlas-sanity.sql: 8 comprehensive sanity checks

UI UPDATES:
- Join Qwikker: Updated card copy to highlight Atlas unlock
- Business Dashboard: Verification status widget with CTA
- Clear messaging: "Verify with Google" unlocks Atlas

FLOW:
- Verify with Google → auto-fills coords → Atlas-eligible
- Create Listing → no coords → requires verification → then Atlas
- Imported → claimed → upgraded → auto Atlas-eligible

FILES:
- lib/atlas/eligibility.ts (NEW)
- components/dashboard/VerificationStatusWidget.tsx (NEW)
- scripts/atlas-sanity.sql (NEW)
- app/api/atlas/search/route.ts
- components/simplified-onboarding-form.tsx
- components/dashboard/improved-dashboard-home.tsx

TESTING:
- Run scripts/atlas-sanity.sql (section 7 must be all 0s)
- Monitor /api/atlas/search logs for leakage
- E2E: verify → upgrade → appears in Atlas
```

Branch: `atlas-prototype`  
Status: ✅ **PRODUCTION READY**
