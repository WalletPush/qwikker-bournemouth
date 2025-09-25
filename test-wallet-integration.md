# 🎫 Wallet Pass Integration Testing Guide

## ✅ FIXED: Single Pass Update System

### What Changed:
- ❌ **OLD**: Created individual wallet passes for each offer
- ✅ **NEW**: Updates the user's single main wallet pass with latest offer

### How It Works Now:

1. **User Signs Up** → Gets main Qwikker wallet pass via GHL
2. **User Claims Offer** → Main pass updates with offer details
3. **User Claims Another Offer** → Same pass updates with new offer
4. **User Always Has One Pass** → Shows their latest claimed offer

### Testing Steps:

#### 1. Test Main Pass Update
```bash
# Test the update API directly
curl -X POST http://localhost:3000/api/walletpass/update-main-pass \
  -H "Content-Type: application/json" \
  -d '{
    "userWalletPassId": "TEST-PASS-123",
    "currentOffer": "50% Off Pizza - Mario's Restaurant",
    "offerDetails": {
      "description": "Get 50% off any large pizza",
      "validUntil": "2024-12-31",
      "terms": "Valid until December 31st, 2024",
      "businessName": "Mario's Restaurant",
      "discount": "50% OFF"
    }
  }'
```

#### 2. Test Button Integration
- Go to `/user/offers`
- Click "Update Pass" on any offer
- Should see success notification
- Pass should update with new offer details

#### 3. Test Error Handling
- Try updating without `userWalletPassId`
- Should see proper error message

### Key Features:

✅ **Single Pass**: One pass per user, always up-to-date
✅ **Rich Details**: Includes business name, terms, expiry, etc.
✅ **Timestamps**: Shows when pass was last updated
✅ **QR Codes**: Unique barcode for business scanning
✅ **Notifications**: Beautiful success/error feedback
✅ **Mobile Friendly**: Works on iOS/Android wallet apps

### API Endpoints:

- `POST /api/walletpass/update-main-pass` - Updates user's main pass
- `POST /api/walletpass/create-main-pass` - Creates initial pass (GHL signup)

### Environment Variables Needed:
```
MOBILE_WALLET_APP_KEY=your_walletpush_api_key
MOBILE_WALLET_TEMPLATE_ID=your_main_template_id
```

### WalletPush Fields Updated:
- `Current_Offer` - Main offer text
- `Last_Message` - Latest update message  
- `Offer_Description` - Full offer description
- `Valid_Until` - Formatted expiry date
- `Terms` - Terms and conditions
- `Business_Name` - Business name
- `Discount_Amount` - Discount value
- `Last_Updated` - Timestamp
- `barcode_message` - Unique QR code

## 🚀 Ready for Production!

The wallet integration now:
- ✅ Uses a single, updating pass per user
- ✅ Provides rich offer details
- ✅ Has proper error handling
- ✅ Shows beautiful notifications
- ✅ Works on mobile devices
- ✅ Integrates with GHL signup flow
