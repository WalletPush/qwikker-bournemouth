# Adding Links to Wallet Pass Back

## Current WalletPush API Call

Your current API call:
```javascript
fetch(apiUrl, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ 
        'First_Name': firstName, 
        'Last_Name': lastName, 
        'Email': email 
    }),
})
```

## Enhanced API Call with Back Links

Update your API call to include back fields:

```javascript
fetch(apiUrl, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ 
        'First_Name': firstName, 
        'Last_Name': lastName, 
        'Email': email,
        
        // BACK FIELDS - Add these for links
        'back_field_1_label': 'Your Dashboard',
        'back_field_1_value': `bournemouth.qwikker.com/dashboard?pass=${data.serialNumber}`,
        'back_field_1_link': `https://qwikkerdashboard-theta.vercel.app/user/dashboard?wallet_pass_id=${data.serialNumber}`,
        
        'back_field_2_label': 'Discover Local',
        'back_field_2_value': 'Find businesses & offers',
        'back_field_2_link': `https://qwikkerdashboard-theta.vercel.app/user/discover?wallet_pass_id=${data.serialNumber}`,
        
        'back_field_3_label': 'Support',
        'back_field_3_value': 'help@qwikker.com',
        'back_field_3_link': 'mailto:help@qwikker.com',
        
        'back_field_4_label': 'Website',
        'back_field_4_value': 'bournemouth.qwikker.com',
        'back_field_4_link': 'https://bournemouth.qwikker.com'
    }),
})
```

## What the Pass Back Will Look Like

```
┌─────────────────────────────────────┐
│           🎫 QWIKKER VIP            │
│        Bournemouth Explorer         │
│                                     │
│  Your Dashboard                     │
│  bournemouth.qwikker.com/dashboard  │ ← CLICKABLE LINK
│                                     │
│  Discover Local                     │
│  Find businesses & offers           │ ← CLICKABLE LINK
│                                     │
│  Support                            │
│  help@qwikker.com                   │ ← CLICKABLE EMAIL
│                                     │
│  Website                            │
│  bournemouth.qwikker.com            │ ← CLICKABLE LINK
└─────────────────────────────────────┘
```

## Dynamic Serial Number Integration

The tricky part is getting the serial number BEFORE the API response. Here's how:

### Option 1: Two-Step Process (Recommended)
```javascript
// Step 1: Create pass
fetch(apiUrl, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ 
        'First_Name': firstName, 
        'Last_Name': lastName, 
        'Email': email 
    }),
})
.then(response => response.json())
.then(data => {
    // Step 2: Update pass with dashboard links
    const updateUrl = `https://app2.walletpush.io/api/v1/passes/${data.serialNumber}`;
    
    return fetch(updateUrl, {
        method: 'PUT',
        headers: apiHeaders,
        body: JSON.stringify({
            'back_field_1_label': 'Your Dashboard',
            'back_field_1_value': 'Tap to open',
            'back_field_1_link': `https://qwikkerdashboard-theta.vercel.app/user/dashboard?wallet_pass_id=${data.serialNumber}`,
            
            'back_field_2_label': 'Discover',
            'back_field_2_value': 'Find local businesses',
            'back_field_2_link': `https://qwikkerdashboard-theta.vercel.app/user/discover?wallet_pass_id=${data.serialNumber}`
        })
    });
})
```

### Option 2: Pre-generate Serial Number
```javascript
// Generate predictable serial number
const predictableSerial = `QWIK-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

fetch(apiUrl, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ 
        'First_Name': firstName, 
        'Last_Name': lastName, 
        'Email': email,
        'serialNumber': predictableSerial, // Force specific serial number
        
        // Add back fields with known serial
        'back_field_1_label': 'Your Dashboard',
        'back_field_1_value': 'Tap to open',
        'back_field_1_link': `https://qwikkerdashboard-theta.vercel.app/user/dashboard?wallet_pass_id=${predictableSerial}`,
    }),
})
```

## Alternative: QR Code on Back

Instead of text links, add a QR code to the back:

```javascript
// Add QR code field
'back_field_qr_code': `https://qwikkerdashboard-theta.vercel.app/user/dashboard?wallet_pass_id=${serialNumber}`,
'back_field_qr_label': 'Scan for Dashboard'
```

This creates a QR code on the back that opens the dashboard when scanned.

## Testing the Links

After implementing:
1. Create a test pass
2. Check the back of the pass for clickable links
3. Tap each link to verify they work
4. Test on both iOS and Android

## Franchise Scaling

For different cities, just change the domain:

```javascript
// Bournemouth
'back_field_1_link': `https://bournemouth-dashboard.vercel.app/user/dashboard?wallet_pass_id=${serialNumber}`,

// Oxford
'back_field_1_link': `https://oxford-dashboard.vercel.app/user/dashboard?wallet_pass_id=${serialNumber}`,
```

## Link Types Supported

- **Web URLs**: https://example.com
- **Email**: mailto:support@qwikker.com  
- **Phone**: tel:+441234567890
- **SMS**: sms:+441234567890
- **Maps**: https://maps.google.com/?q=location
