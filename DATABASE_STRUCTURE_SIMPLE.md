# QWIKKER Database Structure - Simplified Overview

**Generated:** January 6, 2026  
**Total Tables:** 43

---

## Core Entity Relationships

```
┌─────────────────┐
│   auth.users    │ ← Supabase Auth (all user accounts)
│   id (UUID)     │
└────────┬────────┘
         │
         ├──────────────────────────────────────────────┐
         │                                              │
         ▼                                              ▼
┌──────────────────┐                          ┌──────────────────┐
│   app_users      │                          │ business_profiles│
│   (consumers)    │                          │  (business owners│
│                  │                          │   + business)    │
│ - id (UUID)      │                          │                  │
│ - user_id (FK)   │                          │ - id (UUID)      │
│ - first_name     │                          │ - user_id (FK)   │
│ - last_name      │                          │ - first_name     │
│ - email          │                          │ - last_name      │
│ - phone          │                          │ - email          │
│                  │                          │ - business_name  │
│ (For browsing)   │                          │ - business_type  │
└──────────────────┘                          │ - business_town  │
                                              │ - city           │
                                              │ - status         │
                                              │ - plan           │
                                              └────────┬─────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────────────┐
                                              │  business_subscriptions │
                                              │                         │
                                              │ - id (UUID)             │
                                              │ - business_id (FK) ───┐ │
                                              │ - tier_id (FK)        │ │
                                              │ - billing_cycle       │ │
                                              │ - status              │ │
                                              │ - is_in_free_trial    │ │
                                              └───────────┬───────────┘ │
                                                          │             │
                                                          ▼             │
                                                 ┌──────────────────┐   │
                                                 │subscription_tiers│   │
                                                 │                  │   │
                                                 │ - id (UUID)      │   │
                                                 │ - tier_name      │   │
                                                 │ - monthly_price  │   │
                                                 │ - features       │   │
                                                 └──────────────────┘   │
                                                                        │
                                              ┌─────────────────────────┘
                                              │
                                              ▼
                                     ┌──────────────────┐
                                     │ business_offers  │
                                     │                  │
                                     │ - id (UUID)      │
                                     │ - business_id    │
                                     │ - offer_name     │
                                     │ - status         │
                                     └──────────────────┘
```

---

## Key Tables Explained

### 1. `auth.users` (Supabase Auth)
**Purpose:** Supabase's built-in authentication table  
**Contains:** ALL users (app users + business owners + admins)  
**Key Column:** `id` (UUID)

---

### 2. `app_users` (Consumer Users)
**Purpose:** People who browse and discover businesses  
**Key Columns:**
- `id` (UUID) - Primary key
- `user_id` (UUID) - References `auth.users.id`
- `first_name`, `last_name`, `email`, `phone`
- `ghl_contact_id` - GoHighLevel CRM integration
- `pass_type_identifier` - Apple Wallet integration

**Relationship:** `app_users.user_id` → `auth.users.id`

---

### 3. `business_profiles` (Business Owners + Businesses)
**Purpose:** Combined table for business owner info AND business details  
**Important:** ONE row = ONE business owner + ONE business (not separate!)

**Owner Columns:**
- `id` (UUID) - Primary key (business ID)
- `user_id` (UUID) - References `auth.users.id` (the owner's auth account)
- `first_name`, `last_name`, `email`, `phone`

**Business Columns:**
- `business_name`, `business_type`, `business_category`
- `business_address`, `business_town`, `business_postcode`
- `city` - Franchise city (bournemouth, calgary, london)
- `logo`, `business_images[]`, `business_tagline`, `business_description`
- `rating`, `review_count`
- `business_hours` (JSONB)

**Status & Plan:**
- `status` - 'incomplete', 'pending_review', 'approved', 'rejected'
- `plan` - 'starter', 'spotlight', 'pro'
- `features` (JSONB) - Feature flags

**Onboarding:**
- `profile_completion_percentage`
- `trial_expiry` (TIMESTAMPTZ)
- `is_founder` (BOOLEAN)

**Relationship:** `business_profiles.user_id` → `auth.users.id`

---

### 4. `business_subscriptions` (Subscription Records)
**Purpose:** Links businesses to pricing tiers  
**Key Columns:**
- `id` (UUID) - Primary key
- `business_id` (UUID) - References `business_profiles.id`
- `tier_id` (UUID) - References `subscription_tiers.id`
- `billing_cycle` - 'monthly', 'yearly'
- `status` - 'trial', 'active', 'past_due', 'cancelled', 'suspended'
- `is_in_free_trial` (BOOLEAN)
- `free_trial_start_date`, `free_trial_end_date`
- `base_price`, `discounted_price`
- `lifetime_discount_percent` - 20% for founding members

**Relationship:**
- `business_subscriptions.business_id` → `business_profiles.id`
- `business_subscriptions.tier_id` → `subscription_tiers.id`

---

### 5. `subscription_tiers` (Pricing Plans)
**Purpose:** Available subscription tiers  
**Key Columns:**
- `id` (UUID) - Primary key
- `tier_name` - 'free', 'starter', 'featured', 'spotlight'
- `tier_display_name` - 'Free Trial', 'Starter Plan', etc.
- `monthly_price`, `yearly_price`
- `features` (JSONB)
- `is_active` (BOOLEAN)

**Default Tiers (GLOBAL - Not city-specific):**
- free: £0
- starter: £29
- featured: £59  
- spotlight: £89

⚠️ **Problem:** These are global prices, but franchises want city-specific pricing!

---

### 6. `franchise_crm_configs` (Per-City Configuration)
**Purpose:** Franchise-specific settings  
**Key Columns:**
- `city` (VARCHAR) - Primary key: 'bournemouth', 'calgary', 'london'
- `currency`, `currency_symbol`, `tax_rate`, `tax_name`
- `pricing_cards` (JSONB) - **Display-only** pricing cards (what we decided to use as source of truth!)
- `stripe_account_id`, `billing_email`
- `admin_slack_webhook` - Notifications
- `onboarding_video_url`, `welcome_message`

**Pricing Cards Structure:**
```json
{
  "starter": { "price": 29.99, "features": [...] },
  "featured": { "price": 79.99, "features": [...] },
  "spotlight": { "price": 149.99, "features": [...] }
}
```

---

## Supporting Tables

### Business Content
- `business_offers` - Offers created by businesses
- `business_events` - Events hosted by businesses
- `menus` - PDF/image menus uploaded by businesses
- `secret_menus` - Special secret menu items
- `business_images` - Gallery images

### User Interactions
- `user_offer_claims` - When app users claim offers
- `user_saved_items` - Saved businesses/offers
- `business_visits` - Analytics tracking

### Admin/Workflow
- `business_changes` - Pending changes for admin approval
- `business_updates_log` - Audit trail of changes
- `city_admins` - Admin user accounts
- `businesses_pending_updates` - Queue for updates

### AI/Knowledge Base
- `knowledge_base` - Vector embeddings for AI chat
- `city_knowledge` - City-wide info (events, attractions)

### QR Codes
- `qr_codes` - Generated QR codes for businesses
- `qr_code_analytics` - Scan tracking
- `qr_code_scans` - Individual scan events

### Other
- `billing_history` - Payment records
- `referrals` - Referral tracking
- `points_transactions` - Loyalty points
- `intent_queue` - Background jobs

---

## Critical Discovery: The Real Structure

Based on your screenshots and migrations:

### ❌ What I Thought:
- `business_profiles` = business owners (people)
- `approved_businesses` = businesses (venues)
- Separate tables

### ✅ Actual Reality:
- `business_profiles` = **BOTH** owner info AND business details in ONE table
- ONE row = ONE person + ONE business
- `profiles` was renamed to `business_profiles` in migration 20250920210000

### The Confusion:
Your screenshots showed:
1. `app_users` - Consumer users ✅ Correct
2. `business_profiles` - Showed first_name/last_name (I thought it was just owners)
3. `approved_businesses` - I thought this was the businesses table
4. `business_subscriptions` - Subscription records ✅ Correct

But `approved_businesses` is probably a **VIEW** or a filtered query of `business_profiles WHERE status = 'approved'`, not a separate table!

---

## For Free Tier Implementation

### Columns to Add to `business_profiles`:

```sql
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id),  -- New
ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'claimed',
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'ai_enabled',
ADD COLUMN IF NOT EXISTS auto_imported BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS google_place_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS google_data JSONB,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS founding_member BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS founding_member_discount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS promo_delivered_at TIMESTAMPTZ;
```

### Migration Strategy:
1. Keep existing `user_id` (business owner reference)
2. Add new `owner_user_id` (for claim system, nullable)
3. Copy `user_id` → `owner_user_id` for existing businesses
4. Future: Deprecate `user_id` after full migration

---

## Questions for You:

1. **Is `approved_businesses` a real table or a view?** (Couldn't find it in migrations)
2. **Confirm:** `business_profiles` contains BOTH owner info AND business details in one row?
3. **Confirm:** One user_id can have multiple business_profiles (multiple businesses)?

---

**Next Step:** Once you confirm these, I'll revise the FREE_TIER_IMPLEMENTATION_REVIEW.md with the correct structure! 📋

