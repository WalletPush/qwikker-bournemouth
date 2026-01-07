# Franchise Free Tier & Founding Member Setup

## Overview
This document details the multi-tenant configuration for Google Places API integration and Founding Member program settings, ensuring each franchise can manage their own costs and benefits independently.

---

## Database Schema (Multi-Tenant ✅)

### New Columns Added to `franchise_crm_configs`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `google_places_api_key` | TEXT | NULL | Google Places API key (franchise-paid, ~£0.075/business) |
| `resend_api_key` | TEXT | NULL | Resend API key for email verification (already existed) |
| `founding_member_enabled` | BOOLEAN | `true` | Enable/disable founding member program |
| `founding_member_total_spots` | INTEGER | `150` | Maximum founding member spots (first X claims) |
| `founding_member_trial_days` | INTEGER | `90` | Free trial length for Featured tier |
| `founding_member_discount_percent` | INTEGER | `20` | Lifetime discount % (0-100) |

**Migration File:** `supabase/migrations/20250107000000_add_free_tier_franchise_config.sql`

---

## API Endpoint Updates

### `/api/admin/franchise` (POST)

Now accepts and stores all new fields:

```typescript
{
  city: string,
  display_name: string,
  subdomain: string,
  ghl_webhook_url: string,
  ghl_update_webhook_url?: string,
  slack_webhook_url?: string,
  slack_channel?: string,
  owner_name: string,
  owner_email: string,
  owner_phone?: string,
  timezone?: string,
  
  // NEW FIELDS
  google_places_api_key?: string,
  resend_api_key?: string,
  founding_member_enabled?: boolean,    // Default: true
  founding_member_total_spots?: number, // Default: 150
  founding_member_trial_days?: number,  // Default: 90
  founding_member_discount_percent?: number // Default: 20
}
```

**File:** `app/api/admin/franchise/route.ts`

---

## Frontend Components

### Franchise Setup Form Updates

Added two new sections to `components/admin/franchise-setup-form.tsx`:

#### 1. **API Keys & Services Section**
- Google Places API Key input
  - Info box explaining cost (£0.075/business, £15 for 200)
  - Link to Google Cloud Console
- Resend API Key input
  - Info box explaining purpose (email verification)
  - Link to Resend dashboard

#### 2. **Founding Member Program Section**
- Enable/disable toggle (checkbox)
- When enabled, shows 3 config fields:
  - Total Spots Available
  - Free Trial Days
  - Lifetime Discount %
- **Live Benefits Preview** that dynamically shows:
  - Trial value calculation
  - Discount details
  - Founding member perks
  - Scarcity messaging

**File:** `components/admin/franchise-setup-form.tsx`

---

## Multi-Tenant Architecture

### ✅ Each Franchise Controls:

1. **Import Costs**
   - Own Google Places API key
   - Budget control (import 1, 50, or 500+ businesses)
   - Cost: ~£0.075 per business imported

2. **Email Service**
   - Own Resend API key
   - Own from_email and from_name
   - Cost: Resend free tier (100 emails/day)

3. **Founding Member Program**
   - Enable/disable independently
   - Set their own trial length (30, 60, 90 days, etc.)
   - Set their own discount rate (10%, 20%, 30%, etc.)
   - Set their own spot limit (50, 100, 150, 200, etc.)

### 🔒 Security

**Current Implementation (MVP):**
- API keys stored in `franchise_crm_configs` table
- Protected by Row Level Security (RLS)
- Only franchise owner and QWIKKER HQ admin can access

**Future Enhancement:**
- Encrypt API keys using Supabase Vault
- See: https://supabase.com/docs/guides/database/vault

---

## Database Helper Functions

### `is_founding_member_spot_available(city TEXT)`

Returns `BOOLEAN` indicating if founding member spots are still available for a given franchise.

**Logic:**
1. Check if founding member program is enabled for the city
2. Count approved claims marked as founding members
3. Compare against `founding_member_total_spots`
4. Return `true` if spots remain, `false` otherwise

**Usage:**
```sql
SELECT is_founding_member_spot_available('bournemouth'); -- true/false
```

**Note:** This function is a placeholder for now. Will be fully implemented when `claim_requests` table is created.

---

## Example: Bournemouth Default Settings

```sql
UPDATE franchise_crm_configs
SET 
  founding_member_enabled = true,
  founding_member_total_spots = 150,
  founding_member_trial_days = 90,
  founding_member_discount_percent = 20
WHERE city = 'bournemouth';
```

**Founding Member Benefits for Bournemouth:**
- ✅ 90-day FREE trial of Featured tier (£225 value)
- ✅ 20% OFF FOR LIFE on annual plans
- ✅ Exclusive founding member badge
- ✅ Priority support from Bournemouth team
- ⏰ Limited to first 150 claims only

---

## Next Steps (Pending)

1. **Create `claim_requests` table** (migration)
2. **Add `is_founding_member` flag** to claim requests
3. **Update `is_founding_member_spot_available()` function** with real logic
4. **Build Free Tier Dashboard** with upgrade CTAs
5. **Test end-to-end claim flow** with founding member benefits

---

## Cost Calculator Reference

### Google Places API Pricing
- **Nearby Search:** £0.032 per request
- **Place Details:** £0.017 per request  
- **Place Photos:** £0.007 per photo (4 photos/business avg)
- **Total per business:** ~£0.075

**Example Import Costs:**
- 50 businesses = £3.75
- 100 businesses = £7.50
- 200 businesses = £15.00
- 500 businesses = £37.50

### Resend Email Pricing
- **Free tier:** 100 emails/day, 3,000 emails/month
- **Paid:** £16/month for 50,000 emails

---

## Testing Checklist

- [ ] Create new franchise via admin UI
- [ ] Verify all fields save to `franchise_crm_configs`
- [ ] Verify RLS prevents unauthorized access
- [ ] Test founding member toggle enable/disable
- [ ] Test live benefits preview calculations
- [ ] Verify API keys are stored (check in Supabase dashboard)
- [ ] Test importing businesses with Google Places API
- [ ] Test sending verification emails with Resend API

---

## Documentation Links

- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Resend API Documentation](https://resend.com/docs/introduction)
- [Supabase Vault (for encryption)](https://supabase.com/docs/guides/database/vault)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

