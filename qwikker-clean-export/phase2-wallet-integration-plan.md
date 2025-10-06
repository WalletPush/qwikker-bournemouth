# Phase 2 Wallet Pass Integration Plan

## 🎯 OBJECTIVE
- Existing users get Phase 2 demo link added to their pass
- New users go through password gate 
- Offers can be added to Apple/Google Wallet from dashboard

---

## 📱 EXISTING USERS - PASS UPDATE

### WalletPush Update API Call
```javascript
// Update ALL existing passes with Phase 2 demo link
const updateExistingPasses = async () => {
    const updateUrl = `https://app2.walletpush.io/api/v1/templates/${TEMPLATE_ID}/passes/update`;
    
    const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
            'Authorization': MOBILE_WALLET_APP_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            // Add new field to ALL existing passes
            'back_field_5_label': '🚀 QWIKKER PHASE 2 DEMO',
            'back_field_5_value': 'Test our new dashboard (Admin Only)',
            'back_field_5_link': 'https://qwikkerdashboard-theta.vercel.app/phase2-gate'
        })
    });
    
    return response.json();
};
```

### What Existing Users See
```
┌─────────────────────────────────────┐
│  [EXISTING CONTENT UNCHANGED]       │
│  Current offer: Thai Tuesdays       │
│  QR Code for AI companion           │
│                                     │
│  🚀 QWIKKER Phase 2 Demo           │ ← NEW
│  Test our new dashboard (Admin Only)│ ← NEW CLICKABLE
└─────────────────────────────────────┘
```

**NO REINSTALL REQUIRED** - WalletPush pushes update to all devices automatically!

---

## 🆕 NEW USERS - PASSWORD GATE

### New User Flow
```
1. Create pass → Redirect to /phase2-gate
2. Password page with two options:
   - Admin123 → New Dashboard  
   - Current Qwikker → AI Companion
3. Dashboard shows personalized content
4. "Add to Wallet" buttons create offer passes
```

### Password Gate Page (`/phase2-gate`)
```html
<!DOCTYPE html>
<html>
<head>
    <title>Qwikker Phase 2 Demo</title>
    <style>
        body { 
            background: #0a0a0a; 
            color: white; 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            padding: 20px;
            text-align: center;
        }
        .container {
            max-width: 400px;
            margin: 50px auto;
            padding: 30px;
            background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
            border-radius: 20px;
            border: 1px solid #333;
        }
        .logo { font-size: 32px; font-weight: bold; margin-bottom: 20px; }
        input[type="password"] {
            width: 100%;
            padding: 15px;
            margin: 20px 0;
            background: #333;
            border: 1px solid #555;
            border-radius: 10px;
            color: white;
            font-size: 16px;
        }
        .btn {
            width: 100%;
            padding: 15px;
            margin: 10px 0;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
        }
        .btn-primary {
            background: #00d083;
            color: black;
            font-weight: bold;
        }
        .btn-secondary {
            background: transparent;
            color: #00d083;
            border: 1px solid #00d083;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🎫 Qwikker</div>
        <h2>Phase 2 Demo Access</h2>
        <p>We're testing the next version of Qwikker Bournemouth</p>
        
        <input type="password" id="adminPassword" placeholder="Admin Password" />
        <button class="btn btn-primary" onclick="checkPassword()">
            🚀 Access Phase 2 Dashboard
        </button>
        
        <div style="margin: 30px 0; color: #666;">OR</div>
        
        <a href="https://your-current-ai-companion-url.com" class="btn btn-secondary">
            🤖 Use Current Qwikker AI
        </a>
    </div>

    <script>
        function checkPassword() {
            const password = document.getElementById('adminPassword').value;
            const urlParams = new URLSearchParams(window.location.search);
            const walletPassId = urlParams.get('wallet_pass_id');
            
            if (password === 'Admin123') {
                // Redirect to Phase 2 dashboard
                window.location.href = `https://qwikkerdashboard-theta.vercel.app/user/dashboard?wallet_pass_id=${walletPassId}`;
            } else {
                alert('Incorrect password. Contact admin for access.');
            }
        }
    </script>
</body>
</html>
```

---

## 💳 WALLET PASS OFFERS (Like Your Screenshot)

### Add to Wallet Button Component
```javascript
// components/add-to-wallet-button.tsx
import { useState } from 'react';

interface AddToWalletButtonProps {
    offer: {
        id: string;
        title: string;
        description: string;
        business_name: string;
        business_logo: string;
        valid_until: string;
        terms: string;
    };
    userWalletPassId: string;
}

export default function AddToWalletButton({ offer, userWalletPassId }: AddToWalletButtonProps) {
    const [isAdding, setIsAdding] = useState(false);

    const addOfferToWallet = async () => {
        setIsAdding(true);
        
        try {
            // Create offer pass using WalletPush
            const response = await fetch('/api/create-offer-pass', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    offerId: offer.id,
                    userWalletPassId,
                    offerData: {
                        // Front of pass
                        'primary_field_1_label': offer.business_name,
                        'primary_field_1_value': offer.title,
                        
                        'secondary_field_1_label': 'Valid Until',
                        'secondary_field_1_value': offer.valid_until,
                        
                        'auxiliary_field_1_label': 'Offer ID',
                        'auxiliary_field_1_value': offer.id,
                        
                        // Back of pass
                        'back_field_1_label': 'Terms & Conditions',
                        'back_field_1_value': offer.terms,
                        
                        'back_field_2_label': 'Business',
                        'back_field_2_value': offer.business_name,
                        
                        // Styling
                        'logo_text': offer.business_name,
                        'background_color': '#00d083',
                        'foreground_color': '#000000',
                        'label_color': '#333333'
                    }
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Redirect to wallet pass download
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                if (isMobile) {
                    window.location.href = data.passUrl.replace('?t=', '.pkpass?t=');
                } else {
                    window.location.href = data.passUrl;
                }
            }
        } catch (error) {
            console.error('Error adding to wallet:', error);
            alert('Failed to add offer to wallet. Please try again.');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <button 
            onClick={addOfferToWallet}
            disabled={isAdding}
            className="w-full bg-black text-[#00d083] border border-[#00d083] px-4 py-2 rounded-lg font-semibold hover:bg-[#00d083] hover:text-black transition-colors"
        >
            {isAdding ? '📱 Adding to Wallet...' : '📱 Add to Wallet'}
        </button>
    );
}
```

### API Route for Creating Offer Passes
```javascript
// app/api/create-offer-pass/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { offerId, userWalletPassId, offerData } = await request.json();
        
        // Create offer pass using WalletPush
        const response = await fetch(`https://app2.walletpush.io/api/v1/templates/${process.env.OFFER_TEMPLATE_ID}/pass`, {
            method: 'POST',
            headers: {
                'Authorization': process.env.MOBILE_WALLET_APP_KEY!,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...offerData,
                'user_wallet_pass_id': userWalletPassId, // Link to main pass
                'offer_id': offerId
            })
        });
        
        const passData = await response.json();
        
        if (passData.url) {
            return NextResponse.json({ 
                success: true, 
                passUrl: passData.url,
                serialNumber: passData.serialNumber 
            });
        } else {
            throw new Error('Pass creation failed');
        }
    } catch (error) {
        console.error('Offer pass creation error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create offer pass' }, { status: 500 });
    }
}
```

---

## 🚀 IMPLEMENTATION STEPS

### Step 1: Update Existing Passes (5 minutes)
```javascript
// Run this once to update ALL existing passes
updateExistingPasses().then(result => {
    console.log('Updated existing passes:', result);
});
```

### Step 2: Create Password Gate Page (10 minutes)
- Create `/phase2-gate` page
- Style to match your branding
- Handle password validation

### Step 3: Update New User Creation (5 minutes)
- Modify wallet pass creation to redirect new users to `/phase2-gate`
- Keep existing users' experience unchanged

### Step 4: Add "Add to Wallet" Buttons (20 minutes)
- Create offer pass template in WalletPush
- Add buttons to offer cards in dashboard
- Test wallet pass creation for offers

---

## ✅ WHAT USERS WILL EXPERIENCE

### Existing Users
1. **Pass automatically updates** (no action needed)
2. **See new "Phase 2 Demo" link** on pass back
3. **Tap link** → Password gate → Phase 2 dashboard
4. **Everything else works exactly the same**

### New Users  
1. **Create pass** → Redirected to password gate
2. **Enter "Admin123"** → Access Phase 2 dashboard
3. **See offers with "Add to Wallet" buttons**
4. **Tap button** → Offer added as separate wallet pass
5. **Offers appear like your screenshot** - professional business-branded passes

### Wallet Pass Offers
- **Separate passes for each offer** (like your screenshot)
- **Business branding and logos**
- **Terms & conditions on back**
- **Scannable at business location**
- **Expiry dates and offer details**

---

## 🎯 READY TO IMPLEMENT?

This approach gives you:
- **Zero disruption** to existing users
- **Controlled access** to Phase 2 testing  
- **Professional wallet integration** for offers
- **Easy rollback** if needed
- **Scalable for full launch**

**Want me to start building this? I can have the password gate and existing pass updates ready in 30 minutes!** 🚀
