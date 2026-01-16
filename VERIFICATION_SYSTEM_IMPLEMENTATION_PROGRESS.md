# QWIKKER Verification System Implementation Progress

## ✅ COMPLETED

### 1. SQL Migration
- **File**: `supabase/migrations/20250115000000_business_verification_and_uniqueness.sql`
- Added verification fields (`verification_method`, `google_verified_at`, `manual_override`, etc.)
- Added Google category fields (`google_primary_type`)
- Implemented tagline uniqueness with normalized index
- Backfilled existing data

### 2. Google Places Details API
- **File**: `app/api/google/places-details/route.ts`
- Server-side endpoint using `GOOGLE_PLACES_SERVER_KEY`
- Returns sanitized place data with derived fields
- Extracts town, postcode, primary type

### 3. Utility Functions
- **File**: `lib/utils/verification-utils.ts`
  - `verificationSatisfied()` - checks if profile meets verification requirements
  - `canApprove()` - enforces rating threshold (4.4★) and manual override rules
  - `normalizeTagline()` - for uniqueness checking
  - `normalizeTown()` - removes hardcoded town mappings

- **File**: `lib/utils/google-category-label.ts`
  - `getCategoryLabel()` - maps Google types to human-readable labels
  - Comprehensive type mappings (60+ categories)

### 4. Signup Actions Updated
- **File**: `lib/actions/signup-actions.ts`
- Added `VerificationData` interface
- Updated `createUserAndProfile` signature to accept verification data
- Handles Google verified vs Manual mode
- Sets `verification_method`, `google_place_id`, `google_verified_at`
- Populates rating/review_count from Google data
- Stores `google_types` and `google_primary_type`
- Removed hardcoded town mappings (now uses `normalizeTown`)
- Tagline duplicate error handling

### 5. Action Items Count
- **File**: `lib/utils/action-items-count.ts`
- Includes verification requirement in count
- Google mode: adds +1 if `google_place_id` missing
- Uses `verificationSatisfied()` for submission gating

### 6. Submit for Review
- **File**: `lib/actions/business-actions.ts`
- Fetches `verification_method` and `google_place_id`
- Enforces verification gate before allowing submission
- Adds admin note for manual listings
- Error: "Verify your business on Google or switch to Manual Listing..."

### 7. Admin Approval Route
- **File**: `app/api/admin/approve-business/route.ts`
- **CRITICAL GATES ENFORCED:**
  - Google verified: requires `google_place_id` AND `rating >= 4.4`
  - Manual: requires `manualOverride=true` in request body
- Sets `manual_override`, `manual_override_at`, `manual_override_by` on approval
- Uses `canApprove()` utility for validation
- Blocks approval with clear error messages

### 8. Discover Cards - Category Labels
- **File**: `components/user/business-card.tsx`
- Imported `getCategoryLabel`
- Replaced hardcoded category fallback logic
- Now shows: Google primary type > display_category > system_category

---

## 🚧 IN PROGRESS / REMAINING

### 9. Onboarding UX - Google vs Manual Choice
**Status**: NOT STARTED
**Files to update**:
- `components/simplified-onboarding-form.tsx`
- `components/franchise-onboarding-form.tsx` (if still used)

**Requirements**:
- Add choice cards at start: "Verify on Google (Recommended)" vs "My business isn't on Google"
- Google mode: Google Places Autocomplete → fetch details via `/api/google/places-details`
- Manual mode: show warning "Manual listings require admin override"
- Remove any city dropdowns
- Pass `verification` data to `createUserAndProfile`

### 10. Action Items Page UI
**Status**: NOT STARTED
**File**: `components/dashboard/action-items-page.tsx`

**Requirements**:
- Add verification action item for Google mode when `google_place_id` missing
- Title: "Verify your business on Google"
- Provide "Switch to Manual Listing" button
- Update submission gating to check `verificationSatisfied(profile)`
- Show modal warning for manual submissions

### 11. Admin CRM UI Updates
**Status**: NOT STARTED
**Files**:
- `components/admin/business-crm-card.tsx`
- `components/admin/comprehensive-business-crm-card.tsx`

**Requirements**:
- Display verification badges ("Google Verified", "Manual Listing", "Needs Manual Override")
- Show rating & review count for Google verified businesses
- Add "View on Google Maps" link using `google_place_id`
- Manual override checkbox in approval modal
- NFC upsell copy for <4.4★ or manual businesses

### 12. Remove City Dropdowns
**Status**: NOT STARTED
**Action**: Search and remove/disable
- Any city dropdown arrays
- Client-side `hostname.split('.')[0]` for data writes
- Hardcoded city lists in onboarding

### 13. Website URL Standardization
**Status**: PARTIALLY DONE (need to verify all usages)
**Action**: 
- Find all references to `business.website`, `business_website`
- Replace with `website_url` everywhere
- In CRM card, render as clickable link with https:// prefix

### 14. Remove Fake Reviews
**Status**: PARTIALLY DONE (removed from detail page)
**Action**:
- Search for remaining mock review data
- Confirm no "Julie's Sports Bar", lorem ipsum, or static review arrays
- Only show rating stars + count, no quotes

---

## 📋 TESTING CHECKLIST

### Google Verified Signup
- [ ] Can select place from Google Autocomplete
- [ ] Details auto-fill from Google
- [ ] `verification_method='google'` in DB
- [ ] `google_place_id` populated
- [ ] `rating` and `review_count` populated
- [ ] `google_types` and `google_primary_type` populated
- [ ] Submit for review allowed after profile complete
- [ ] Admin sees rating and Google link
- [ ] Approval blocked if rating < 4.4★
- [ ] Approval succeeds if rating >= 4.4★

### Manual Signup
- [ ] Can choose "Manual Listing" path
- [ ] Warning shown about admin override required
- [ ] `verification_method='manual'` in DB
- [ ] `google_place_id` is NULL
- [ ] Submit for review allowed after profile complete
- [ ] Admin sees "Manual Listing" badge
- [ ] Approval blocked without manual override checkbox
- [ ] Approval succeeds with checkbox ticked

### City Safety
- [ ] No city dropdowns in onboarding
- [ ] City always derived from subdomain server-side
- [ ] No client-side city writes

### Discover & UI
- [ ] No fake reviews visible anywhere
- [ ] Category labels show Google types (not internal labels)
- [ ] Rating stars and count display correctly
- [ ] Website URLs clickable and work

### Taglines
- [ ] Duplicate tagline rejected with friendly error
- [ ] Normalized comparison works (case/whitespace insensitive)

---

## 🔑 KEY ENVIRONMENT VARIABLES NEEDED

```env
GOOGLE_PLACES_SERVER_KEY=your_google_api_key_here
```

**Important**: This must be the NEW Google Places API key, not the legacy one.

---

## 🗄️ DATABASE BACKFILLS TO RUN

```sql
-- 1. Backfill website_url from legacy website column
UPDATE public.business_profiles
SET website_url = website
WHERE (website_url IS NULL OR btrim(website_url) = '')
  AND website IS NOT NULL
  AND btrim(website) <> '';

-- 2. Backfill auto_imported flag
UPDATE public.business_profiles
SET auto_imported = true
WHERE owner_user_id IS NULL
  AND status = 'unclaimed'
  AND (auto_imported IS NULL OR auto_imported = false)
  AND google_place_id IS NOT NULL;
```

---

## 🎯 PRIORITY NEXT STEPS

1. **Update onboarding forms** - add Google vs Manual choice
2. **Update Action Items Page** - add verification UI
3. **Update Admin CRM** - add verification badges and manual override checkbox
4. **Remove city dropdowns** - search and disable
5. **Test end-to-end** - both Google and Manual paths
