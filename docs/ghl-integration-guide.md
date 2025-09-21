# GHL Workflow Integration Guide

## Current WalletPass Flow Integration

### Step 1: Update Existing GHL Workflow

Your current GHL workflow receives WalletPass data. Add this webhook action AFTER the WalletPass creation:

**New Webhook Action in GHL:**
- **Webhook URL**: `https://bournemouth.qwikker.com/api/walletpass/user-creation`
- **Method**: POST
- **Headers**: `Content-Type: application/json`

**Webhook Payload** (use GHL custom values):
```json
{
  "First_Name": "{{contact.first_name}}",
  "Last_Name": "{{contact.last_name}}",
  "email": "{{contact.email}}",
  "serialNumber": "{{custom_values.serialNumber}}",
  "passTypeIdentifier": "{{custom_values.passTypeIdentifier}}",
  "url": "{{custom_values.url}}",
  "device": "{{custom_values.device}}"
}
```

### Step 2: Update WalletPass Creation Response

After successful pass creation, redirect users to dashboard:

**Current Flow:**
```
WalletPass Created → User gets pass → End
```

**New Flow:**
```
WalletPass Created → User gets pass → Redirect to Dashboard → User sees personalized content
```

**Redirect URL Format:**
```
https://bournemouth.qwikker.com/user/dashboard?wallet_pass_id={{serialNumber}}
```

### Step 3: Franchise City Detection

For franchise cities, update the configuration:

**Bournemouth:**
```javascript
const LANDING_PAGE_URL = 'https://bournemouth.qwikker.com/join';
// Webhook: https://bournemouth.qwikker.com/api/walletpass/user-creation
```

**Oxford (Example):**
```javascript
const LANDING_PAGE_URL = 'https://oxford.qwikker.com/join';
// Webhook: https://oxford.qwikker.com/api/walletpass/user-creation
```

### Step 4: Test the Integration

1. **Create Test Pass**: Use your current form
2. **Check GHL**: Verify contact created
3. **Check Supabase**: Verify user_members record created
4. **Test Dashboard**: Visit dashboard URL with pass ID
5. **Verify Data**: Ensure user data displays correctly

### Step 5: Franchise Deployment

For each new franchise:

1. **Update WalletPass Form**: Change `LANDING_PAGE_URL` to franchise domain
2. **Add GHL Workflow**: Copy workflow, update webhook URL to franchise domain
3. **Test Flow**: Verify end-to-end functionality

## Dashboard Access Methods

### Method 1: Direct URL (Primary)
```
https://bournemouth.qwikker.com/user/dashboard?wallet_pass_id=SERIAL_NUMBER
```

### Method 2: QR Code on Pass (Future)
Add QR code to wallet pass that points to dashboard URL

### Method 3: Deep Link (Future)
Configure pass to open dashboard when tapped

## Error Handling

### If User Creation Fails:
- User still gets wallet pass
- Dashboard shows demo data
- Admin gets notification to manually create user

### If Dashboard Access Fails:
- Show friendly error message
- Provide contact information
- Offer alternative access method

## Monitoring & Analytics

Track these metrics in admin dashboard:
- Pass creation success rate
- User creation success rate  
- Dashboard access rate
- User engagement metrics

## Franchise Scaling

Each franchise gets:
- Own WalletPass template (optional)
- Own GHL workflow
- Own user database (city-filtered)
- Own dashboard domain

All using the same core system architecture.
