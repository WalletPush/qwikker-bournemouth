# Free Listing Downgrade Logic

## Question:
**Can a business that started with the founding member onboarding form (free trial) downgrade to a free listing when their trial expires?**

---

## Answer: YES, but it requires manual admin intervention currently

### Current Flow:
1. Business completes founding member onboarding form
2. Gets 90-day free trial of Featured tier
3. Trial expires
4. Business is set to `status: 'trial_expired'` or similar
5. Business can upgrade to paid plan

### What Needs to Happen for Downgrade:
To allow a business to "downgrade" to Free Listing, we need:

1. **Admin Action** (currently manual):
   - Admin updates `business_profiles.status` from `'trial_expired'` to `'claimed_free'`
   - Admin deletes/deactivates the `business_subscriptions` entry
   - Business now has Free Listing access

2. **What They Lose** (when downgraded to Free Listing):
   - ❌ AI chat visibility
   - ❌ Offers
   - ❌ Events
   - ❌ Secret menu items
   - ❌ Menu/file uploads
   - ❌ Analytics
   - ❌ Social wizard
   - ❌ Loyalty portal
   - ❌ Push notifications

3. **What They Keep** (Free Listing features):
   - ✅ Listed in Discover directory
   - ✅ Basic business profile
   - ✅ Update profile info (logo, hours, description, etc.)

---

## Recommended Implementation (Future):

### Option 1: Self-Service Downgrade Button
- Add a "Downgrade to Free Listing" button in Settings
- Shows a confirmation modal warning about lost features
- On confirm:
  - Update `status` to `'claimed_free'`
  - Deactivate subscription
  - Send email confirming downgrade

### Option 2: Auto-Downgrade After Trial Expiry
- When trial expires, auto-downgrade to Free Listing instead of locking out
- Send email: "Your trial has ended. You're now on Free Listing. Upgrade anytime!"
- Keeps business on platform instead of losing them

---

## Current Database Structure:

### For Onboarding Form Businesses:
```
business_profiles:
  - user_id: UUID (set on signup)
  - owner_user_id: UUID (set on signup, same as user_id)
  - status: 'incomplete' → 'approved' → (after trial) → 'trial_expired'?
  - visibility: 'ai_enabled' (during trial)

business_subscriptions:
  - business_id: UUID
  - tier_id: UUID (trial tier)
  - is_in_free_trial: true
  - free_trial_end_date: timestamp
```

### For Claimed Businesses (Free Listing):
```
business_profiles:
  - user_id: UUID (set on claim approval)
  - owner_user_id: UUID (set on claim approval)
  - status: 'unclaimed' → 'pending_claim' → 'claimed_free'
  - visibility: 'discover_only'

business_subscriptions:
  - business_id: UUID
  - tier_id: UUID (free tier)
  - is_in_free_trial: false
  - (no trial dates)
```

---

## SQL to Manually Downgrade a Business:

```sql
-- Step 1: Update business status
UPDATE business_profiles
SET 
  status = 'claimed_free',
  visibility = 'discover_only'
WHERE id = '<business_id>';

-- Step 2: Update subscription to free tier
UPDATE business_subscriptions
SET 
  tier_id = (SELECT id FROM subscription_tiers WHERE tier_name = 'free'),
  is_in_free_trial = false,
  free_trial_end_date = NULL
WHERE business_id = '<business_id>';

-- Step 3: Remove from knowledge base (so they don't show in AI)
DELETE FROM knowledge_base
WHERE business_id = '<business_id>';
```

---

## Recommendation:
**Implement Option 2 (Auto-Downgrade)** so businesses don't get locked out when trials expire. This:
- Keeps them on the platform
- Shows them what they're missing
- Makes upgrading a single click away
- Reduces support burden

