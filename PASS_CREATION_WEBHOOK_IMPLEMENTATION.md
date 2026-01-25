# Pass Creation Webhook - Multi-Tenant Implementation

## Overview
Added dedicated pass creation webhook support to properly track user wallet pass installations in GoHighLevel, separate from business CRM sync webhooks. This implementation is fully multi-tenant and includes required field validation in the setup wizard.

## Problem Solved
Previously, when users installed wallet passes via `/join`, the data was NEVER sent to GHL - the automation workflow you created was waiting for a webhook that was never triggered. This meant:
- No GHL contacts were created for users
- Your automation workflow never fired
- No tags, emails, or follow-up sequences were triggered

## Solution Architecture

### Webhook Types (3 separate webhooks per franchise)
1. **`ghl_pass_creation_webhook_url`** (NEW - REQUIRED)
   - **Purpose:** User onboarding flow - wallet pass installations
   - **Triggered by:** Users filling out `/join` form
   - **Example:** `https://services.leadconnectorhq.com/hooks/YOUR_ACCOUNT_ID/webhook-trigger/YOUR_WEBHOOK_ID`

2. **`ghl_webhook_url`** (EXISTING - OPTIONAL)
   - **Purpose:** Business CRM sync - business signups/updates
   - **Triggered by:** Businesses signing up or updating profiles
   - **Example:** `https://services.leadconnectorhq.com/hooks/YOUR_ACCOUNT_ID/webhook-trigger/YOUR_WEBHOOK_ID`

3. **`ghl_update_webhook_url`** (EXISTING - OPTIONAL)
   - **Purpose:** Business profile updates (falls back to main if not set)
   - **Triggered by:** Business profile changes

### Data Flow

```
User visits city.qwikker.com
↓
Clicks "Add to your mobile wallet"
↓
Fills out /join form (firstName, lastName, email)
↓
Frontend: POST to /api/walletpass/create-main-pass
↓
WalletPush API creates pass
↓
✅ NEW: Frontend sends to /api/internal/ghl-send
   └─ Includes: eventType='pass_creation'
   └─ Contains: user data + serialNumber + passUrl
↓
GHL Send API routes to ghl_pass_creation_webhook_url
↓
GHL Workflow triggers:
   - Create Contact from Data
   - Add Tag "MW Created"
   - Send shouts (AI Chat, Offers Gallery)
   - Update HighLevel User
   - Run automation sequences
↓
User pass is installed successfully
```

## Files Modified

### 1. Database Migration
**File:** `supabase/migrations/20260125000006_add_pass_creation_webhook.sql`

```sql
ALTER TABLE franchise_crm_configs
ADD COLUMN IF NOT EXISTS ghl_pass_creation_webhook_url TEXT;

-- Add helpful comments
COMMENT ON COLUMN franchise_crm_configs.ghl_pass_creation_webhook_url IS 
  'Webhook URL triggered when users install their wallet pass (user onboarding flow).';

-- Configure for your city (replace with actual values)
UPDATE franchise_crm_configs
SET ghl_pass_creation_webhook_url = 'YOUR_GHL_WEBHOOK_URL_HERE'
WHERE city = 'your_city';
```

### 2. Admin Setup Wizard UI
**File:** `components/admin/admin-setup-page.tsx`

**Changes:**
- Added `ghl_pass_creation_webhook_url` to `FranchiseConfig` interface
- Added validation functions for each step:
  - `isStep1Valid()` - Owner name & email
  - `isStep2Valid()` - Display name, timezone, phone
  - `isStep3Valid()` - Resend API + WalletPush keys (required for basic functionality)
  - `isStep4Valid()` - Pass creation webhook (REQUIRED)
- Updated all "Continue" buttons with validation and disable states
- Added highlighted pass creation webhook field in Step 4 with clear labels:
  ```
  [!] Pass Creation Webhook URL [REQUIRED]
  User Flow: Triggered when users install wallet passes via /join form
  ✓ This is critical - users cannot install passes without this configured
  ```
- Updated default webhook URLs for new cities:
  - `ghl_pass_creation_webhook_url`: `https://services.leadconnectorhq.com/hooks/{city}/qwikker-pass`
  - `ghl_webhook_url`: `https://services.leadconnectorhq.com/hooks/{city}/qwikker-business`

### 3. Admin Setup API
**File:** `app/api/admin/setup/route.ts`

**Changes:**
- Added `ghl_pass_creation_webhook_url` to sanitize function (masks secret, adds `has_*` flag)
- Added field to update logic (`addIfPresent()`)
- **Updated auto-activation requirements:**
  ```typescript
  const hasMinimumRequirements = (
    updatedConfig.ghl_pass_creation_webhook_url && // CRITICAL for users
    updatedConfig.resend_api_key && // Required for emails
    updatedConfig.resend_from_email &&
    updatedConfig.walletpush_api_key && // Required for pass creation
    updatedConfig.walletpush_template_id
  )
  ```

### 4. GHL Send API (Webhook Router)
**File:** `app/api/internal/ghl-send/route.ts`

**Changes:**
- Updated SELECT query to include `ghl_pass_creation_webhook_url`
- **Added webhook routing logic:**
  ```typescript
  const eventType = formData.eventType || 'business_crm_sync'
  let webhookUrl: string | null = null

  if (eventType === 'pass_creation') {
    webhookUrl = config.ghl_pass_creation_webhook_url
    console.log(`📱 Using pass creation webhook`)
  } else {
    webhookUrl = config.ghl_webhook_url
    console.log(`🏢 Using business CRM webhook`)
  }
  ```
- Updated fetch to use dynamic `webhookUrl`
- Enhanced error messages with webhook purpose

### 5. Pass Installer Client
**File:** `components/wallet/pass-installer-client.tsx`

**Changes:**
- Added GHL sync after successful pass creation:
  ```typescript
  // After WalletPush pass creation succeeds:
  const ghlResponse = await fetch('/api/internal/ghl-send', {
    method: 'POST',
    body: JSON.stringify({
      formData: {
        eventType: 'pass_creation', // Routes to pass webhook
        First_Name: formData.firstName,
        Last_Name: formData.lastName,
        email: formData.email,
        serialNumber: data.serialNumber,
        url: data.passUrl,
        device: deviceType,
        franchise_city: city
      },
      city: city
    })
  })
  ```
- Made GHL sync non-blocking (wrapped in try-catch, logs warnings but doesn't fail)
- Pass installation always succeeds, even if GHL sync fails

## Setup Wizard Validation

### Required Fields by Step

| Step | Required Fields | Purpose |
|------|----------------|---------|
| 1 | owner_name, owner_email | Admin account basics |
| 2 | display_name, timezone, owner_phone | Franchise details |
| 3 | resend_api_key, resend_from_email, walletpush_api_key, walletpush_template_id | Core functionality (email + passes) |
| 4 | ghl_pass_creation_webhook_url | User pass installation tracking |

### Validation Messages
- Clear, specific error messages for each step
- "Continue" buttons disabled when requirements not met
- Visual indicators (opacity, disabled state)
- Auto-dismissing validation messages

## Multi-Tenant Considerations

✅ **Fully Franchise-Aware:**
- All webhook URLs stored per-city in `franchise_crm_configs`
- City detection via hostname (server-side, secure)
- No hard-coded URLs or global fallbacks
- Each franchise has independent webhooks

✅ **Security:**
- All webhook URLs treated as secrets (masked in UI)
- Only service role can write to database
- City derived from request headers (can't be spoofed)

✅ **Scalability:**
- New franchises get placeholder webhook URLs
- Admin setup wizard guides configuration
- Auto-activation when all requirements met

## Testing Checklist

### 1. Database Migration
```bash
# Run migration
psql -f supabase/migrations/20260125000006_add_pass_creation_webhook.sql

# Verify
SELECT city, ghl_pass_creation_webhook_url IS NOT NULL as has_pass_webhook 
FROM franchise_crm_configs 
WHERE city = 'bournemouth';
```

### 2. Admin Setup Wizard
- [ ] Visit `/admin` (pending_setup city)
- [ ] Try advancing Step 1 without name/email (should block)
- [ ] Complete Step 1, advance to Step 2
- [ ] Try advancing Step 2 without phone (should block)
- [ ] Complete all steps through Step 4
- [ ] Verify pass creation webhook field is highlighted/required
- [ ] Save configuration
- [ ] Verify city auto-activates (status → 'active')

### 3. Pass Creation Flow
- [ ] Visit `bournemouth.localhost:3000/join`
- [ ] Fill out form (name, email)
- [ ] Submit form
- [ ] Check console logs:
  ```
  📡 Syncing pass creation to GHL...
  📱 Using pass creation webhook for Bournemouth
  ✅ Pass creation synced to GHL
  ```
- [ ] Verify pass created in WalletPush
- [ ] Check GHL workflow execution:
  - Contact created
  - "MW Created" tag added
  - Shouts sent
  - Automation triggered

### 4. GHL Webhook Verification
- [ ] Check GHL webhook logs
- [ ] Verify correct data received:
  ```json
  {
    "eventType": "pass_creation",
    "First_Name": "Test",
    "Last_Name": "User",
    "email": "test@example.com",
    "serialNumber": "QWIK-BOURNE-TEST-1234567890",
    "url": "https://app2.walletpush.io/...",
    "device": "iphone",
    "franchise_city": "bournemouth"
  }
  ```

## Rollback Plan

If issues arise, run:

```sql
-- Remove the column
ALTER TABLE franchise_crm_configs DROP COLUMN IF EXISTS ghl_pass_creation_webhook_url;
```

Then revert code changes:
```bash
git checkout main
```

## Future Enhancements

1. **Webhook Testing UI** - Add "Test Webhook" button in setup wizard
2. **Webhook Logs** - Store webhook attempts in database for debugging
3. **Retry Logic** - Automatically retry failed webhooks
4. **Webhook Health Monitoring** - Alert if webhook fails repeatedly

## Notes

- Business CRM webhook (`ghl_webhook_url`) is now OPTIONAL - only needed if you want to track business signups
- Pass creation webhook is the ONLY required webhook for basic user functionality
- The frontend gracefully handles GHL failures - pass installation never fails due to GHL issues
- All changes are backward compatible - existing cities continue working

## Support

For issues:
1. Check console logs for detailed error messages
2. Verify webhook URL is correct in database
3. Test webhook manually in GHL
4. Check GHL workflow execution logs
