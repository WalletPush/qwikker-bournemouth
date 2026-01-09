# Database Relationship Map

## Key Tables and Their Relationships

### `app_users` (End Users / Customers)
- **Purpose**: People who installed wallet passes (customers/consumers)
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `user_id` (UUID) - References `auth.users(id)` - The customer's account
  - `name`, `email`, `phone` - Customer details

### `business_profiles` (Business Accounts)
- **Purpose**: Businesses on the platform (both founding members and future free-tier)
- **Key Fields**:
  - `id` (UUID) - Primary key (business profile ID)
  - `user_id` (UUID) - **References the account that CREATED this business profile** (via founding member onboarding form)
  - `owner_user_id` (UUID) - **NEW COLUMN** - References the account that OWNS/CLAIMED this business (for free tier claim flow)
  - `status` - Lifecycle status (see below)
  - `visibility` - AI visibility setting (see below)

### `business_subscriptions`
- **Purpose**: Tracks which tier/subscription a business is on
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `business_id` (UUID) - References `business_profiles(id)`
  - `user_id` (UUID) - References the business owner's account (should match `business_profiles.owner_user_id`)
  - `tier_id` (UUID) - References `subscription_tiers(id)`

---

## Two Separate Onboarding Flows

### Flow 1: Founding Member Onboarding (CURRENT SYSTEM)
**Who**: Business owners who self-sign up via the founding member form

**Process**:
1. Business owner fills out onboarding form
2. Creates account → gets `auth.users` ID
3. Business profile created with:
   - `user_id` = their account ID (they created it)
   - `owner_user_id` = their account ID (they own it)
   - `status` = `'incomplete'` initially
4. Business completes action items
5. Submits for approval → `status` = `'pending_approval'`
6. Admin approves → `status` = `'approved'`
7. Business goes live with free trial (Featured tier)
8. `visibility` = `'ai_enabled'` (they're on a paid/trial tier)

**Current Database State**:
- All 9 existing businesses followed this flow
- They all have `user_id` populated (their account from onboarding)
- When we add `owner_user_id`, it should be backfilled to match `user_id`

---

### Flow 2: Free Tier Claim Flow (NEW SYSTEM - NOT YET IMPLEMENTED)
**Who**: Businesses imported from Google Places that get claimed by owners

**Process**:
1. Admin imports businesses via Google Places API
2. Business profiles created with:
   - `user_id` = NULL (or admin's ID who imported them)
   - `owner_user_id` = NULL (unclaimed)
   - `status` = `'unclaimed'`
   - `visibility` = `'discover_only'` (not in AI results)
   - `auto_imported` = true
   - `google_place_id` = Google's Place ID
3. Business owner scans QR code, lands on `/claim/[slug]`
4. Owner creates account or logs in
5. Claims listing → creates entry in `claim_requests`
6. Admin reviews claim → approves/denies
7. If approved:
   - `owner_user_id` = claimer's account ID
   - `status` = `'claimed_free'`
   - `claimed_at` = NOW()
8. Business has limited dashboard access (locked features)
9. Business can upgrade to free trial or paid plan:
   - Completes action items
   - Submits for approval → `status` = `'pending_upgrade'`
   - Admin approves → `status` = `'approved'`
   - `visibility` = `'ai_enabled'`
   - Trial/subscription starts

---

## Status Values

### Founding Member Flow:
- `incomplete` - Onboarding started but not finished
- `pending_approval` - Submitted for admin review
- `approved` - Live on platform (trial or paid)
- `rejected` - Admin rejected
- `suspended` - Temporarily disabled
- `removed` - Permanently removed

### Free Tier Flow (NEW):
- `unclaimed` - Google-imported, no owner yet
- `pending_claim` - Claim request submitted, awaiting verification
- `claimed_free` - Claimed but on free tier (limited dashboard)
- `pending_upgrade` - Submitted for upgrade to trial/paid
- (then flows into `approved`, `rejected`, etc.)

---

## Visibility Values

- `discover_only` - Appears in Discover page only (NOT in AI chat) - **FREE TIER**
- `ai_enabled` - Appears in AI chat + Discover - **PAID/TRIAL TIERS**

---

## Critical Rules for Migration

### For Existing Businesses (Founding Member):
- `user_id` is already populated (their account from onboarding)
- Backfill `owner_user_id` = `user_id` (they own their own listings)
- Set `visibility` = `'ai_enabled'` (they're on trial/paid)
- Keep existing `status` values (`approved`, `incomplete`, etc.)
- Set `auto_imported` = false (they weren't imported)
- Set `founding_member` = true (they're founding members)

### For Future Google-Imported Businesses:
- `user_id` = NULL (or admin's ID)
- `owner_user_id` = NULL (unclaimed)
- `status` = `'unclaimed'`
- `visibility` = `'discover_only'`
- `auto_imported` = true
- `founding_member` = false

---

## Foreign Key Relationships

```
auth.users (Supabase Auth)
  ↓
business_profiles.user_id (who created the profile)
business_profiles.owner_user_id (who owns/claimed the profile)
  ↓
business_subscriptions.user_id (should match owner_user_id)
business_subscriptions.business_id (references business_profiles.id)
```

For founding member businesses: `user_id` = `owner_user_id` (same person)
For claimed free-tier businesses: `user_id` ≠ `owner_user_id` (imported by admin, claimed by owner)
