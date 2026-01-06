# Free Tier Implementation - Critical Review & Risk Assessment

**Date:** January 6, 2026  
**Branch:** `free-tier-build`  
**Reviewer:** AI Assistant  
**Status:** ✅ DATABASE STRUCTURE CONFIRMED - READY FOR FINAL REVIEW

---

## Executive Summary

This document provides a comprehensive review of the planned free tier implementation to identify potential risks, conflicts, and issues before we start building.

### Key Findings (Updated After Database Review):

✅ **Database Structure Confirmed:**
- `business_profiles` = main table (43 total tables in system)
- `approved_businesses` = VIEW (not a real table)
- `user_id` has UNIQUE constraint (1 account = 1 business max)
- System uses combined owner+business model (not separate tables)

✅ **Migration Strategy Finalized:**
- Create system user (`system@qwikker.internal`) for imported businesses
- Add `owner_user_id` nullable column alongside existing `user_id`
- Existing test businesses auto-migrate to `claimed` + `ai_enabled`
- New Google imports start as `unclaimed` + `discover_only`

⚠️ **8 Major Risks Identified:**
1. Dual pricing system conflict
2. System user approach for NULL user_id constraint
3. AI filtering must be bulletproof (CRITICAL)
4. Mock business migration (SOLVED)
5. Email verification infrastructure (FRANCHISE-SPECIFIC)
6. Founding member timer logic (FRANCHISE-CUSTOMIZABLE)
7. Google Places API costs (FRANCHISE PAYS, NOT HQ)
8. API key security & encryption (NEW - CRITICAL)

🎯 **Estimated Timeline:** 30-50 hours over 3-4 weeks

**READ THIS CAREFULLY** before we proceed.

---

## 1. Current System Architecture

### Database Schema Status (CONFIRMED - Jan 6, 2026)

#### `business_profiles` Table (Main Business Table)
**What it contains:** Business owner info AND business details in ONE row (not separate tables!)

**Current Key Columns:**

**Owner Info:**
- `id` (UUID) - primary key (business ID)
- `user_id` (UUID) - references auth.users (UNIQUE - one user = one business)
- `first_name`, `last_name`, `email`, `phone`

**Business Info:**
- `business_name`, `business_type`, `business_category`
- `business_address`, `business_town`, `business_postcode`
- `city` - franchise city (bournemouth, calgary, london)
- `logo`, `business_images[]`, `business_tagline`, `business_description`
- `rating`, `review_count`
- `business_hours` (JSONB)

**Status & Plan:**
- `status` - CHECK('incomplete', 'pending_review', 'approved', 'rejected')
- `plan` - CHECK('starter', 'spotlight', 'pro')
- `features` (JSONB) - granular feature flags
- `trial_expiry` (TIMESTAMPTZ)
- `is_founder` (BOOLEAN)

**Important Facts:**
- ✅ `approved_businesses` is a VIEW, not a real table (filters WHERE status = 'approved')
- ✅ `user_id` has UNIQUE constraint (1 account = 1 business)
- ✅ Multi-venue owners need multiple accounts (intentional design)

**Missing Columns (Need to Add):**
- `owner_user_id` - will reference auth.users (for claim system)
- `claim_status` - will be CHECK('unclaimed', 'pending_claim', 'claimed')
- `visibility` - will be CHECK('discover_only', 'ai_enabled')
- `auto_imported` (BOOLEAN)
- `google_place_id` (TEXT UNIQUE)
- `google_data` (JSONB)
- `claimed_at` (TIMESTAMPTZ)
- `founding_member` (BOOLEAN)
- `founding_member_discount` (INTEGER)
- `trial_start_date` (TIMESTAMPTZ)
- `trial_end_date` (TIMESTAMPTZ)

#### `subscription_tiers` Table (GLOBAL - No City Column)
**Problem:** This table is **FRANCHISE-AGNOSTIC**. All cities share the same tier IDs.
- `tier_name` - 'free', 'starter', 'featured', 'spotlight'
- `monthly_price`, `yearly_price`
- `features` (JSONB)

**Migration Inserted:**
- free: £0
- starter: £29
- featured: £59
- spotlight: £89

**Issue:** These prices are GLOBAL. When Bournemouth changes pricing to £28, Calgary still sees £29 unless we update `subscription_tiers`. This is the **root conflict** we discussed yesterday.

#### `franchise_crm_configs` Table (Per-City Config)
**Current Columns:**
- `city` (VARCHAR, PRIMARY KEY)
- `currency`, `currency_symbol`, `tax_rate`, `tax_name`
- `pricing_cards` (JSONB) - **Display-only** pricing for business dashboard
- `stripe_account_id`, `billing_email`

**Decision:** We decided to use `franchise_crm_configs.pricing_cards` as the **single source of truth** for pricing, not `subscription_tiers`.

#### 🚨 NEW: Franchise Configuration Updates (Multi-Tenant Architecture)

**CRITICAL DISCOVERY:** This system is MULTI-TENANT. Each franchise should have their own:
- Email API keys (Resend/SendGrid)
- Google Places API keys
- Founding member settings
- Import strategy

**New Columns Needed in `franchise_crm_configs`:**

```sql
ALTER TABLE franchise_crm_configs
ADD COLUMN IF NOT EXISTS resend_api_key TEXT,  -- Encrypted, franchise-specific
ADD COLUMN IF NOT EXISTS google_places_api_key TEXT,  -- Encrypted, franchise-specific
ADD COLUMN IF NOT EXISTS founding_member_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS founding_member_trial_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS founding_member_discount_percent INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS founding_member_eligibility_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS auto_approve_claims BOOLEAN DEFAULT false;  -- Skip manual approval
```

**Franchise Setup Page Must Show:**
- Google Places API pricing calculator
- "Import 20 businesses = $1.96" (live estimate)
- Resend email service configuration
- Founding member offer customization
- Claim approval workflow (manual vs auto)

**Why This Matters:**
- ✅ Costs are franchise's responsibility, not HQ's
- ✅ Each franchise controls their own strategy
- ✅ Bournemouth can do promo packs, Calgary can do email outreach
- ✅ Scalable for future franchises
- ✅ No shared API quotas or rate limits

---

## 2. Critical Conflicts & Risks

### ⚠️ RISK 1: Dual Pricing System (MAJOR)

**Current State:**
- `subscription_tiers` table (global) defines actual tier pricing
- `franchise_crm_configs.pricing_cards` (per-city) defines display pricing
- These can become **out of sync**

**Our Solution (From Yesterday):**
- Use `pricing_cards` JSONB as single source of truth
- Update `/api/admin/billing/pricing-tiers` to update `pricing_cards`
- Eventually deprecate `subscription_tiers` for franchise-specific pricing

**Risk for Free Tier Implementation:**
- If we add "free" tier logic, we need to ensure it works with BOTH systems during transition
- `business_subscriptions` table still references `subscription_tiers.id`
- We can't easily add a "free" tier with `visibility=discover_only` to the global `subscription_tiers`

**Recommended Action:**
1. Add `free` tier to `subscription_tiers` (temporary, for backward compatibility)
2. Add `free` tier to each franchise's `pricing_cards` JSONB
3. Update ALL pricing/tier lookup logic to check `pricing_cards` first, fallback to `subscription_tiers`

---

### ⚠️ RISK 2: `user_id` vs `owner_user_id` Confusion (CRITICAL)

**Current System:**
- `business_profiles.user_id` references the **business owner** (required, NOT NULL, UNIQUE)
- Every business has a `user_id` because businesses are created during onboarding
- UNIQUE constraint means: 1 user account = 1 business (max)

**New System (Free Tier + Claim):**
- Google-imported businesses need NO owner initially
- `user_id = NULL` would break the NOT NULL constraint!
- When claimed, we need to link the business to the claiming user

**Problem:** `user_id` is NOT NULL but unclaimed businesses have no owner yet!

**Solution:**
Add a NEW nullable column `owner_user_id` to handle the claim system:

**Migration Strategy:**
```sql
-- 1. Add new nullable column for claim system
ALTER TABLE business_profiles
ADD COLUMN owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. For EXISTING businesses, copy user_id to owner_user_id
UPDATE business_profiles
SET owner_user_id = user_id
WHERE user_id IS NOT NULL;

-- 3. For NEW imported businesses:
--    - user_id stays NULL (or we create a system user)
--    - owner_user_id stays NULL until claimed
--    - After claim approval: owner_user_id = claimer's auth.users.id
```

**Two Approaches for Imported Businesses:**

**Approach A: System User (Cleaner)**
- Create a special `auth.users` account: `system@qwikker.com`
- All imported businesses have `user_id = system_user_id`
- Satisfies NOT NULL constraint
- `owner_user_id = NULL` until claimed

**Approach B: Make user_id Nullable (Risky)**
- Remove NOT NULL constraint from `user_id`
- Requires updating 77+ files that assume `user_id` always exists
- **NOT RECOMMENDED**

**Recommended Action:** Use Approach A. Create a system user for imported businesses.

---

### ⚠️ RISK 3: AI Filtering Will Break Without Careful Implementation (CRITICAL)

**Current AI Search Flow:**
1. User asks question → `generateHybridAIResponse()` in `lib/ai/hybrid-chat.ts`
2. Calls `searchBusinessKnowledge(query, city, options)` (line 129)
3. `searchBusinessKnowledge()` queries `knowledge_base` table via vector search
4. Results come back with `business_id`
5. AI generates response mentioning businesses

**Where We Need to Filter:**

**Location 1: `lib/ai/embeddings.ts` - Knowledge Base Sync**
```typescript
export async function syncBusinessToKnowledgeBase(business: any)
```
- Currently syncs ALL businesses to `knowledge_base`
- **MUST ADD:** Check `visibility = 'ai_enabled'` before syncing
- If `visibility = 'discover_only'`, **skip** or **delete** from knowledge_base

**Location 2: `lib/ai/hybrid-chat.ts` - Search Query**
```typescript
const businessResults = await searchBusinessKnowledge(enhancedQuery, city, { matchCount: searchLimit })
```
- `searchBusinessKnowledge()` must filter by `visibility = 'ai_enabled'`

**Location 3: Database RPC Function**
```sql
CREATE FUNCTION search_knowledge_base(...)
```
- Currently searches `knowledge_base` table
- **MUST ADD:** JOIN to `business_profiles` and filter `visibility = 'ai_enabled'`

**Risk:** If we miss ONE query location, free tier businesses will leak into AI chat. This violates the core principle.

**Recommended Action:**
1. Add `visibility` column to `knowledge_base` table (denormalized for performance)
2. Update `syncBusinessToKnowledgeBase()` to set `visibility` field
3. Update `search_knowledge_base` RPC function to filter by `visibility = 'ai_enabled'`
4. **MANUALLY AUDIT** all 77 locations that query `business_profiles` to ensure none bypass the filter

---

### ⚠️ RISK 4: Existing Mock Businesses Will Have Wrong State

**Current Situation:**
- User confirms: "everything in the system so far is mock data and mock businesses"
- These test businesses have:
  - `status = 'approved'` or `'incomplete'`
  - `user_id` set (someone created them during testing)
  - `plan = 'starter'` or `'spotlight'`

**What Happens During Migration:**

The migration SQL will automatically handle existing businesses:

```sql
UPDATE business_profiles
SET owner_user_id = user_id,      -- Link to existing owner
    claim_status = 'claimed',     -- They're already claimed
    visibility = 'ai_enabled',    -- Keep them in AI (paid plans)
    claimed_at = created_at       -- Set claim date to creation date
WHERE owner_user_id IS NULL 
  AND user_id IS NOT NULL;
```

**Result:**
- ✅ All existing test businesses become `claim_status = 'claimed'`
- ✅ All keep `visibility = 'ai_enabled'` (work in AI chat)
- ✅ `owner_user_id = user_id` (properly linked)
- ✅ No disruption to existing testing
- ✅ New imported businesses start as `claim_status = 'unclaimed'`

**Two Systems, No Conflict:**
- **Old businesses:** Created via onboarding → auto-set to `claimed` + `ai_enabled`
- **New businesses:** Imported from Google → start as `unclaimed` + `discover_only`

**Recommended Action:** Accept the migration as-is. Existing test data stays functional, new imports use the claim flow.

---

### ⚠️ RISK 5: Claim Flow Requires Email Verification (Complex)

**From Plan:**
- User clicks "Claim Listing"
- Verification options:
  - Email: Send code to business email (from Google)
  - Phone: Call business with code
  - Manual: Upload business license

**Problems:**

1. **Email Sending Infrastructure:**
   - Do we have an email service configured? (Resend? SendGrid? Supabase Auth Emails?)
   - Need templates for verification codes
   - Need rate limiting to prevent abuse

2. **Phone Verification:**
   - This requires Twilio or similar (expensive)
   - Not realistic for MVP

3. **Manual Verification:**
   - Requires admin review (works, but slow)

**Recommended Action:**
- **MVP:** Manual verification only (admin approval)
- **Phase 2:** Add email verification once email infrastructure is set up
- Skip phone verification entirely (too complex/expensive)

---

### ⚠️ RISK 6: Founding Member Logic is Time-Sensitive

**From Plan:**
```typescript
const daysFromCreation = differenceInDays(new Date(), business.created_at)
if (daysFromCreation <= 30) {
  // Apply founding member benefits
}
```

**Problem:** This assumes `business.created_at` is when the business was **first listed** (via Google import). But what if:
- Business is imported Jan 1
- User claims it Jan 25 (within 30 days) ✅ Gets founding member
- Business is imported Jan 1
- User claims it Feb 5 (35 days later) ❌ Doesn't get founding member

**But:** What if you hand-deliver promo packs over 2 weeks?
- Jan 1: Import 200 businesses
- Jan 8: Deliver first 100 promo packs
- Jan 15: Deliver next 100 promo packs
- Feb 1: Business #1 claims (31 days from import, but only 24 days from receiving promo pack)

**Should the 30-day timer start from:**
- A) Business import date (`created_at`)
- B) Promo pack delivery date (need new column: `promo_delivered_at`)
- C) First time they visit the claim page (need tracking)

**Recommended Action:**
- Add `promo_delivered_at` column
- 30-day timer starts from `promo_delivered_at`, NOT `created_at`
- Admin can manually set this date when they deliver promo packs

---

### ⚠️ RISK 7: Google Places API Costs & Rate Limits (PER FRANCHISE)

**Multi-Tenant Model:**
- Each franchise uses their own Google Places API key
- Each franchise pays their own costs
- HQ doesn't pay for any imports

**Google Places API Pricing (2025):**
- Place Search: $0.032 per request
- Place Details: $0.017 per request
- Place Photos: $0.007 per photo

**Cost Calculator (Built into Admin UI):**
```
Import 20 businesses:  $1.96
Import 50 businesses:  $4.90
Import 100 businesses: $9.80
Import 200 businesses: $19.60
Import 500 businesses: $49.00
```

**Rate Limits:**
- 1,000 requests per day (free tier)
- 100,000 requests per day (paid)
- Each franchise has their own rate limit

**Recommended Action:**
- Display live cost estimate in import UI
- Show rate limit warnings
- Add progress tracking to resume if rate limit hit
- Cache all Google data in `business_profiles.google_data` JSONB to avoid re-fetching
- Link to Google Cloud Console setup guide for franchises

---

### ⚠️ RISK 8: API Key Security (NEW - CRITICAL)

**Problem:**
- Franchise API keys stored in `franchise_crm_configs`
- Need to encrypt sensitive keys (Resend, Google Places, Stripe)
- Keys should NEVER appear in logs or error messages

**Solution:**
```sql
-- Use Supabase's Vault for encryption
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Store encrypted
INSERT INTO vault.secrets (secret)
VALUES ('franchise-resend-api-key-bournemouth');

-- Retrieve decrypted
SELECT decrypted_secret FROM vault.decrypted_secrets 
WHERE name = 'franchise-resend-api-key-bournemouth';
```

**Alternatively (Simpler):**
- Use application-level encryption (Node.js crypto module)
- Encrypt before storing, decrypt when needed
- Never log or expose keys in API responses

**Recommended Action:**
- Use Supabase Vault (more secure)
- Add API key validation on franchise setup
- Show masked keys in UI (e.g., `sk_live_••••••••••••1234`)
- Rotate keys functionality for franchise admins

---

## 3. Data Migration Strategy

### Phase 1: Create System User (For Imported Businesses)

```sql
-- Create a system user to own imported/unclaimed businesses
-- This satisfies the NOT NULL constraint on business_profiles.user_id
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'system@qwikker.internal',
  crypt('SYSTEM_USER_NO_LOGIN', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"system","providers":["system"]}'::JSONB,
  '{"system_user":true,"description":"System account for imported/unclaimed businesses"}'::JSONB,
  false,
  'service_role'
) ON CONFLICT (id) DO NOTHING;
```

### Phase 2: Add New Columns (Non-Breaking)

```sql
-- This migration is SAFE - only adds columns, doesn't modify existing data
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'claimed' 
  CHECK (claim_status IN ('unclaimed', 'pending_claim', 'claimed')),
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'ai_enabled'
  CHECK (visibility IN ('discover_only', 'ai_enabled')),
ADD COLUMN IF NOT EXISTS auto_imported BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS google_place_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS google_data JSONB,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS founding_member BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS founding_member_discount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS promo_delivered_at TIMESTAMPTZ;

-- Copy existing user_id to owner_user_id for existing businesses
-- (They're already claimed since they went through onboarding)
UPDATE business_profiles
SET owner_user_id = user_id,
    claim_status = 'claimed',
    claimed_at = created_at
WHERE owner_user_id IS NULL AND user_id IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_profiles_owner_user_id 
  ON business_profiles(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_claim_status 
  ON business_profiles(claim_status);
CREATE INDEX IF NOT EXISTS idx_business_profiles_visibility 
  ON business_profiles(visibility);
CREATE INDEX IF NOT EXISTS idx_business_profiles_google_place_id 
  ON business_profiles(google_place_id);
```

**When Importing from Google:**
```sql
INSERT INTO business_profiles (
  user_id,              -- '00000000-0000-0000-0000-000000000001' (system user)
  owner_user_id,        -- NULL (unclaimed)
  claim_status,         -- 'unclaimed'
  visibility,           -- 'discover_only'
  auto_imported,        -- true
  business_name,
  business_address,
  google_place_id,
  google_data,
  city,
  status                -- 'approved' (pre-approved by admin)
) VALUES (...);
```

**Safety Check:**
- ✅ Doesn't drop any columns
- ✅ Doesn't change existing constraints on `user_id`
- ✅ Uses `IF NOT EXISTS` (idempotent)
- ✅ Defaults preserve existing behavior ('claimed', 'ai_enabled')
- ✅ System user satisfies NOT NULL constraint
- ✅ `owner_user_id` is nullable (for unclaimed businesses)

---

### Phase 2: Create Claim Requests Table

```sql
CREATE TABLE IF NOT EXISTS claim_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'approved', 'denied')),
  verification_method TEXT CHECK (verification_method IN ('email', 'phone', 'manual')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  UNIQUE(business_id, user_id)
);
```

**Safety Check:**
- ✅ New table, no conflicts
- ✅ Proper foreign keys with ON DELETE CASCADE
- ✅ Unique constraint prevents duplicate claims

---

## 4. Implementation Order (Safest Path)

### Week 1: Foundation (No User Impact)

1. **Database Schema** ✅
   - Run migrations (Phase 1 & 2 above)
   - Add franchise config columns (API keys, founding member settings)
   - Add RLS policies for `claim_requests`
   - Add indexes

2. **Google Places Service** ✅
   - Build API integration (uses franchise's API key from config)
   - Support variable batch sizes (1-500)
   - Cost calculator UI
   - Test with 5 businesses first
   - Verify data quality

3. **Admin Import Tool** ✅
   - Build UI in admin dashboard
   - Franchise-specific API key input
   - Batch size selector with cost estimate
   - Preview before import
   - Test import flow with 10 businesses
   - Verify no duplicates

### Week 2: Core Logic (Internal Testing)

4. **AI Visibility Filter** 🔴 **CRITICAL**
   - Update `syncBusinessToKnowledgeBase()`
   - Update `search_knowledge_base` RPC function
   - Add `visibility` filter to all AI queries
   - **TEST EXTENSIVELY** - free tier businesses MUST NOT appear in AI

5. **Claim Landing Page** ✅
   - Build `/claim/[slug]` page
   - Show business info
   - "Claim" CTA only (manual verification MVP)

6. **Admin Claim Approval** ✅
   - Add tab to admin dashboard
   - Approve/deny flow
   - Links `owner_user_id` and sets `claim_status = 'claimed'`

### Week 3: Integration & Testing

7. **Feature Locks** ✅
   - Block offers/events/secret menus for `visibility = 'discover_only'`
   - Show upgrade prompts

8. **Dashboard Integration** ✅
   - Pre-fill action items with Google data
   - Show confirmation flow

9. **UI Badges** ✅
   - "Unclaimed" badge on business cards
   - "Founding Member" badge

10. **Founding Member Logic** ✅
    - Implement 90-day trial + 20% discount
    - Based on `promo_delivered_at` + 30 days

### Week 4: Polish & Launch

11. **Trial Expiration Handler** ✅
    - Cron job to check expiring trials
    - Email reminders (if email service ready)
    - Auto-downgrade or charge

12. **Testing** 🔴 **CRITICAL**
    - Import 20 test businesses
    - Verify AI doesn't show them
    - Test claim flow end-to-end
    - Test upgrade flow
    - Verify analytics work

---

## 5. Breaking Changes & Rollback Plan

### Potentially Breaking Changes

1. **AI Search Results**
   - **Change:** Free tier businesses excluded from AI
   - **Risk:** If filter is too aggressive, PAID businesses might also be excluded
   - **Mitigation:** Default all existing businesses to `visibility = 'ai_enabled'`
   - **Rollback:** Remove `visibility` filter from AI queries

2. **Business Onboarding**
   - **Change:** New state machine for claim flow
   - **Risk:** Existing onboarding might break
   - **Mitigation:** Keep old onboarding flow working in parallel
   - **Rollback:** Set `ENABLE_CLAIM_FLOW=false` env var

3. **Subscription System**
   - **Change:** Using `pricing_cards` instead of `subscription_tiers`
   - **Risk:** Billing might break
   - **Mitigation:** Keep both systems working during transition
   - **Rollback:** Revert API route to use `subscription_tiers`

### Emergency Rollback Procedure

```bash
# 1. Disable claim flow
DATABASE: UPDATE business_profiles SET claim_status = 'claimed', visibility = 'ai_enabled';

# 2. Remove AI filter
CODE: Remove .eq('visibility', 'ai_enabled') from all queries

# 3. Revert to old system
GIT: git revert <free-tier-commits>
```

---

## 6. Testing Checklist

### Unit Tests Needed

- [ ] Google Places API integration
- [ ] Business import deduplication (by `google_place_id`)
- [ ] Claim verification flow
- [ ] Feature access control functions
- [ ] Founding member eligibility calculation

### Integration Tests Needed

- [ ] End-to-end claim flow (unclaimed → pending → claimed → trial)
- [ ] AI filter (verify free tier excluded, paid tier included)
- [ ] Action items pre-fill from Google data
- [ ] Trial expiration and downgrade logic
- [ ] Upgrade flow (free → paid)

### Manual Testing Needed

- [ ] Import 10 test businesses from Google
- [ ] Verify they appear in Discover (but NOT in AI chat)
- [ ] Claim a business as new user
- [ ] Complete action items with pre-filled Google data
- [ ] Submit for approval
- [ ] Verify AI chat NEVER mentions unclaimed businesses
- [ ] Test founding member offer (within 30 days)
- [ ] Test non-founding member (after 30 days)

---

## 7. Questions for User (ANSWER BEFORE PROCEEDING)

### Critical Decisions Needed:

1. **Existing Mock Businesses:**
   - Should we leave them as-is (Option A), or migrate them to new system (Option B)?
   - **Recommendation:** Leave as-is for now

2. **Email Verification:**
   - Do you have an email service set up (Resend, SendGrid)?
   - If not, we'll start with manual verification only
   - **Need to know:** Can we send verification emails?

3. **Promo Pack Delivery Tracking:**
   - Do you want to track when each business receives their promo pack?
   - This affects the 30-day founding member timer
   - **Need to know:** Should we add `promo_delivered_at` column?

4. **Google Places API Budget:**
   - Are you comfortable spending ~$20 for initial 200-business import?
   - **Need to know:** What's your API budget?

5. **Rollout Timeline:**
   - Do you want to import ALL 200 businesses at once, or batch them?
   - **Recommendation:** Start with 20, then 50, then full 200

---

## 8. Success Metrics

### How We'll Know It's Working:

1. **AI Filter Accuracy:** 0 free tier businesses appear in AI chat (100% success rate)
2. **Import Success Rate:** 95%+ of Google imports create valid listings
3. **Claim Conversion:** 50% of delivered promo packs result in claims
4. **Trial→Paid Conversion:** 50% of trials convert to paying customers
5. **User Retention:** 70%+ of users return after seeing 200 businesses
6. **No Regressions:** Existing paid businesses continue to work normally

---

## 9. Final Recommendations

### ✅ READY TO PROCEED:

**Database Structure:** CONFIRMED ✅
- `business_profiles` is the main table
- System user approach solves NOT NULL constraint
- Migration is non-breaking and reversible

**Architecture:** SOLID ✅
- 1 user = 1 business (keeps it simple)
- Existing businesses auto-migrate safely
- New imports use claim flow
- AI filtering is well-defined

**Risks:** IDENTIFIED & MITIGATED ✅
- All 7 major risks have solutions
- Rollback plan in place
- Testing checklist prepared

### ⚠️ MUST ANSWER BEFORE STARTING:

**5 Critical Questions (Section 7):**

1. **Mock Businesses:** ✅ ANSWERED - Leave as-is, auto-migrate to 'claimed'
2. **Email Service:** ❓ NEED ANSWER - Do you have Resend/SendGrid set up?
3. **Promo Tracking:** ❓ NEED ANSWER - Add `promo_delivered_at` column?
4. **API Budget:** ❓ NEED ANSWER - Okay with ~$20 for Google Places?
5. **Rollout:** ❓ NEED ANSWER - Import 20 first, then 50, then 200?

### 🚦 GO/NO-GO CRITERIA:

**GREEN LIGHT (Start Building):**
- ✅ Database structure confirmed
- ✅ You answer questions 2-5 above
- ✅ Comfortable with 3-4 week timeline
- ✅ Can test before going live

**YELLOW LIGHT (Proceed with Caution):**
- ⚠️ No email service (manual verification only for MVP)
- ⚠️ Limited API budget (start with 20 businesses)
- ⚠️ Need faster delivery (can parallelize work)

**RED LIGHT (Do Not Start):**
- 🔴 Need email verification working for MVP
- 🔴 Can't afford Google Places API costs
- 🔴 Need this done in less than 2 weeks
- 🔴 Launching to real users immediately without testing

---

## 10. Next Steps

### ✅ COMPLETED:
- [x] Database structure investigation (83 migrations analyzed)
- [x] Entity relationships confirmed (user/business/subscription)
- [x] Migration strategy finalized (system user approach)
- [x] Risk assessment complete (7 risks identified + solutions)
- [x] Mock data strategy confirmed (auto-migrate to 'claimed')

### ✅ QUESTIONS ANSWERED (Multi-Tenant Architecture):

**Question 2: Email Service**
- ✅ **FRANCHISE-SPECIFIC:** Each franchise admin inputs their own Resend API key during setup
- Add to `franchise_crm_configs`: `resend_api_key` (encrypted)
- Claim verification emails sent from franchise's Resend account
- Manual verification still available as fallback

**Question 3: Promo Pack Tracking**
- ✅ **KEEP IT SIMPLE:** Don't add `promo_delivered_at` column
- Each franchise decides their own promo pack strategy
- 30-day founding member timer starts from `created_at` (business import date)
- Franchises can manually adjust `founding_member` flag if needed

**Question 4: Google Places API Budget**
- ✅ **FRANCHISE-SPECIFIC:** Each franchise uses their own Google Places API key
- Add to `franchise_crm_configs`: `google_places_api_key` (encrypted)
- Import costs are franchise's responsibility, not HQ's
- Display clear pricing on franchise setup page ($0.032/search + $0.017/details + $0.007/photo)

**Question 5: Rollout Strategy**
- ✅ **FLEXIBLE BATCH SIZE:** Admin can choose how many to import (1-500)
- UI shows: "Import 20 businesses (estimated cost: $1.96)"
- Preview results before confirming import
- Can test small batch first, compare to Google, then import more

### 🚀 READY TO START:

**Once you answer the 4 questions above, I'll immediately begin:**

**Phase 1 (Week 1): Foundation**
1. Create system user migration
2. Add free tier columns to `business_profiles`
3. Create `claim_requests` table
4. Test migrations on dev database

**Phase 2 (Week 2): Core Logic**
5. Build Google Places API integration
6. Add AI visibility filter (CRITICAL)
7. Create claim landing page
8. Build admin claim approval UI

**Phase 3 (Week 3): Integration**
9. Feature locks (offers/events/menus)
10. Dashboard integration + pre-fill
11. UI badges (unclaimed/founding member)
12. Founding member logic

**Phase 4 (Week 4): Polish**
13. Trial expiration handler
14. Testing (unit + integration + manual)
15. Documentation
16. Launch prep

**Estimated Timeline:**
- Week 1: Database + Google Import (5-10 hours)
- Week 2: AI Filter + Claim Flow (10-15 hours)
- Week 3: Integration + UI (10-15 hours)
- Week 4: Testing + Polish (5-10 hours)
- **Total:** 30-50 hours of development

---

## 🎯 Give me your answers and I'll start building! 🚀

**Answer format:**
```
Q2 (Email): No, use manual verification for MVP
Q3 (Promo tracking): Yes, add promo_delivered_at column
Q4 (API budget): Yes, $20 is fine / Start with 20 businesses first
Q5 (Rollout): Batch it - 20, then 50, then 200
```

---

## 📊 Summary Table: Old vs New System

| Aspect | Current System | Free Tier System | Change Type |
|--------|---------------|------------------|-------------|
| **Business Creation** | User signs up → fills form → creates business | Admin imports from Google → user claims | ✅ Additive |
| **Business Owner** | `user_id` (NOT NULL, UNIQUE) | `owner_user_id` (nullable) | ✅ New column |
| **Status Field** | 'incomplete', 'pending_review', 'approved' | + `claim_status` ('unclaimed', 'claimed') | ✅ New column |
| **AI Visibility** | All approved businesses | Only `visibility = 'ai_enabled'` | ⚠️ Filter added |
| **Discover Page** | All approved businesses | All businesses (free + paid) | ✅ No change |
| **Tier System** | Starter, Spotlight, Pro | + Free tier | ✅ Additive |
| **Pricing Source** | `subscription_tiers` (global) | `franchise_crm_configs.pricing_cards` (per-city) | ⚠️ Shift strategy |
| **Feature Access** | Based on `plan` field | Based on `visibility` + `plan` | ⚠️ Filter added |
| **Trial Logic** | 120 days from approval | 90 days for founding members | ✅ New logic |
| **Database Tables** | 43 tables | + `claim_requests` | ✅ New table |
| **Franchise Config** | Basic settings | + API keys + founding member settings | ✅ New columns |
| **API Keys** | HQ manages costs | Each franchise uses own keys | ✅ Multi-tenant |
| **Import Strategy** | N/A | Franchise-specific (1-500 businesses) | ✅ Flexible |
| **Email Service** | N/A | Franchise-specific Resend key | ✅ Multi-tenant |
| **Founding Member** | N/A | Franchise-customizable (days/discount) | ✅ Flexible |
| **Mock Businesses** | Test data, status='approved' | Auto-migrate to 'claimed' | ✅ Safe migration |
| **Multi-Business** | 1 user = 1 business (UNIQUE) | Still 1 user = 1 business | ✅ No change |

---

## 🎯 Key Multi-Tenant Decisions (FINALIZED)

| Decision | Approach | Reason |
|----------|----------|--------|
| **Email Service** | Franchise-specific Resend API key in `franchise_crm_configs` | Each franchise manages own email costs & deliverability |
| **Google Places API** | Franchise-specific API key in `franchise_crm_configs` | Each franchise pays own import costs |
| **Promo Pack Tracking** | ❌ Not implemented | Each franchise decides own strategy (delivery vs email) |
| **Founding Member Timer** | Starts from `created_at` (import date), 30 days default | Simple, no delivery tracking needed |
| **Founding Member Settings** | Franchise-customizable (trial days, discount %, eligibility) | Bournemouth: 90 days, Calgary: 60 days, etc. |
| **Import Batch Size** | Franchise chooses 1-500, UI shows cost estimate | Flexible, test-first approach |
| **Claim Verification** | Manual approval (admin) OR auto-approve (franchise setting) | Each franchise decides security level |
| **API Key Storage** | Encrypted in database (Supabase Vault or app-level) | Security best practice |

---

**Last Updated:** January 6, 2026  
**Status:** ✅ Multi-tenant architecture confirmed, database structure validated, ready for implementation! 🎯

---

## ✅ FINAL CLAIM FLOW APPROVED (2026-01-06 - 4:30 PM)

### **Claim Journey (Step-by-Step)**

```
1. Universal QR Code → bournemouth.qwikker.com/claim
2. Search for business name
3. Select business from results
4. Confirm: "Is this your business?"
5. Enter:
   📧 Business email (REQUIRED)
      - Clear copy: Use business email, not personal
      - Examples: info@business.com, businessname@gmail.com
   🌐 Website URL (OPTIONAL)
      - Helps verification if domain matches email
6. Email verification (6-digit code)
7. Create account (name, password)
8. Submit claim → Admin queue
9. Admin approval (10-second review)
10. Approved → Dashboard access (Free tier)
11. Upgrade CTA: Start 90-day Featured trial (opt-in)
12. 30 days to start trial + qualify for Founding Member
```

### **Image Strategy (FINALIZED)**

```typescript
// Google Photos
- Stored as references (URLs from Google CDN)
- Displayed via hotlinking (LEGAL)
- Attribution: "Photo from Google Business Profile"
- Never downloaded/re-uploaded to Cloudinary

// Display Priority
1. If owner has uploaded photos → Show owner photos
2. Else → Show Google photos (fallback)
3. Never show empty gallery

// Database Schema
business_profiles {
  google_photos: JSONB[] // [{url, attribution, width, height}]
  owner_photos: TEXT[]   // Cloudinary URLs
}
```

### **Fraud Prevention (SIMPLE 2-STEP)**

**Step 1: Email Verification (Automatic)**
- User verifies email with 6-digit code
- Emphasis on business email vs personal

**Step 2: Admin Approval (10-second manual check)**

```typescript
Admin Decision Matrix:

✅ APPROVE (5-10 seconds):
- Email looks reasonable
- Business exists on Google
- No red flags
- Optional: Website matches email domain

❌ DENY (5 seconds):
- Obviously fake email (user12345@gmail.com)
- Multiple businesses claimed by same user
- Account created <1 hour ago + immediate claim
- Business doesn't exist

🚫 NO PROOF REQUESTS
- Too complex per-country
- Slows down process
- Admin gut-check is enough

Red Flags (Auto-detected):
⚠️ Same user claimed 2+ businesses today
⚠️ Account created <1 hour ago
⚠️ Email doesn't match business name
⚠️ Business has 0 Google reviews

Confidence Badges:
✅ VERY HIGH: Email domain matches website
💡 MEDIUM: Gmail + website provided
💡 MEDIUM: Gmail + no website + email matches business
🚨 LOW: Generic email + no connection to business
```

### **Multi-Tenant (Domain-Based Context)**

```typescript
// Dynamic franchise detection
bournemouth.qwikker.com → Bournemouth
calgary.qwikker.com → Calgary

// All emails/UI use franchise context:
"Bournemouth Team will review your claim within 48 hours"
"Questions? bournemouth@qwikker.com"

// Each franchise manages:
- Own Google Places API key
- Own Resend API key
- Own founding member settings (150 spots, 90-day trial, 20% off)
- Own claim queue (admins see only their city)
```

### **Free Tier vs Paid (Clear Boundaries)**

| Feature | Free (Unclaimed/Claimed) | Featured Trial | Paid Plans |
|---------|--------------------------|----------------|------------|
| **Discover Listing** | ✅ Yes | ✅ Yes | ✅ Yes |
| **AI Recommendations** | ❌ No | ✅ Yes | ✅ Yes |
| **Edit Profile** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Upload Photos** | ✅ Yes (10 max) | ✅ Yes (50 max) | ✅ Yes (unlimited) |
| **Create Offers** | ❌ No | ✅ Yes (5 max) | ✅ Yes (unlimited) |
| **Secret Menus** | ❌ No | ✅ Yes | ✅ Yes |
| **Analytics** | ❌ No | ✅ Yes | ✅ Yes |
| **Badge Assets** | ❌ No | ✅ Yes | ✅ Yes |

### **Founding Member Program (Per Franchise)**

```typescript
Eligibility:
- First 150 claims per franchise (configurable)
- Must START trial within 30 days of claim approval
- Trial duration: 90 days (configurable per franchise)
- Convert to paid within trial = 20% OFF FOR LIFE

UI Display:
"🏅 FOUNDING MEMBER OFFER
 Start your 90-day FREE trial now
 Upgrade to paid within 90 days = 20% OFF FOREVER
 ⚠️ Only 73 founding member spots left!"

After 30 days:
- Can still upgrade to paid
- But NO founding member discount
- Trial offer expires
```

### **Implementation Order (Next Steps)**

```
✅ Phase 1: UI with Mock Data (Week 1-2)
   - Claim landing page
   - Admin claim approvals
   - Admin import tool preview
   - Franchise setup updates
   
⏳ Phase 2: Database + API (Week 3)
   - Migrations
   - Claim submission/approval logic
   - AI filter updates
   
⏳ Phase 3: Testing (Week 4)
   - End-to-end claim flow
   - Multi-tenant testing
   - Fraud scenario testing
   
⏳ Phase 4: Google Import (Week 5+, per franchise)
   - Each franchise decides when/if to import
   - Use own API key
   - Choose batch size (1-500)
```

---

**IMPLEMENTATION STATUS:** 🚀 Ready to Build  
**APPROVED BY:** User  
**START DATE:** January 6, 2026

