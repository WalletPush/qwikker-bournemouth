# 📱 SMS NOTIFICATIONS - COMPLETE IMPLEMENTATION GUIDE

**Date:** 2026-01-13  
**Status:** Ready to implement  
**Provider:** Twilio (Messaging Service SID)

---

## **✅ WHAT'S DONE:**

1. ✅ SQL migration created (`supabase/migrations/20260113000000_add_sms_notifications.sql`)
2. ✅ SMS helper functions created (`lib/utils/sms.ts`)
3. ✅ This implementation guide

---

## **📋 STEP 1: RUN SQL MIGRATION (5 mins)**

```bash
# In Supabase SQL Editor:
# Run: supabase/migrations/20260113000000_add_sms_notifications.sql

# Or manually:
```

```sql
-- Add SMS to franchise_crm_configs
ALTER TABLE franchise_crm_configs
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_provider TEXT DEFAULT 'twilio',
  ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT,
  ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT,
  ADD COLUMN IF NOT EXISTS twilio_messaging_service_sid TEXT;

-- Add SMS to claim_requests
ALTER TABLE claim_requests
  ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS sms_opt_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_consent_text_version TEXT;

-- Verify
SELECT city, sms_enabled FROM franchise_crm_configs;
```

---

## **🔧 STEP 2: UPDATE CLAIM SUBMIT API (30 mins)**

### **File:** `app/api/claim/submit/route.ts`

### **Change 1: Add SMS fields to FormData extraction**

**Location:** After line 33 (after `editedHours`)

```typescript
// 📱 ADD THESE LINES:
// Extract SMS opt-in fields
const smsOptIn = formData.get('smsOptIn') === 'true'
const phoneNumber = formData.get('phoneNumber') as string
```

### **Change 2: Add SMS fields to claim_requests insert**

**Location:** Around line 195-210 (in the claim_requests insert)

**Find this:**
```typescript
.insert({
  user_id: userId,
  business_id: businessId,
  business_email: email.toLowerCase(),
  website_url: website || null,
  first_name: firstName,
  last_name: lastName,
  status: 'pending',
  verification_method: 'email',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  // ... edited fields
  data_edited: !!(editedBusinessName || editedAddress || editedPhone || editedWebsite || editedCategory || editedType || editedDescription || editedHours)
})
```

**Add these fields BEFORE `data_edited`:**
```typescript
  // 📱 ADD THESE LINES:
  // SMS opt-in fields
  sms_opt_in: smsOptIn,
  phone_e164: smsOptIn && phoneNumber ? phoneNumber : null,
  sms_opt_in_at: smsOptIn ? new Date().toISOString() : null,
  sms_consent_text_version: smsOptIn ? 'v1_2026-01-13' : null,
  data_edited: !!(editedBusinessName || editedAddress || editedPhone || editedWebsite || editedCategory || editedType || editedDescription || editedHours)
})
```

### **Change 3: Send SMS after claim submitted**

**Location:** After line 382 (after the email sending block ends, before the final return)

**Add this new section:**
```typescript
    // 9. Send SMS notification if opted in
    if (smsOptIn && phoneNumber) {
      try {
        const { sendClaimSubmittedSMS } = await import('@/lib/utils/sms')
        
        const smsResult = await sendClaimSubmittedSMS(
          phoneNumber,
          business.business_name,
          business.city || 'bournemouth'
        )
        
        if (smsResult.success) {
          console.log(`✅ Claim submitted SMS sent to ${phoneNumber}`)
        } else {
          console.log(`⚠️ SMS not sent: ${smsResult.reason || smsResult.error}`)
        }
      } catch (smsError) {
        console.error('SMS send failed (non-critical):', smsError)
        // Don't fail the request if SMS fails
      }
    }

    // 10. Return success
    return NextResponse.json({
```

---

## **🔧 STEP 3: UPDATE CLAIM APPROVE API (15 mins)**

### **File:** `app/api/admin/approve-claim/route.ts`

### **Change 1: Fetch SMS fields in claim query**

**Location:** Line 55-65 (the claim_requests SELECT)

**Already includes `*` so SMS fields will be fetched automatically. ✅**

### **Change 2: Send SMS after approval email**

**Location:** After line 289 (after approval email block, before Slack notification)

**Add this new section:**
```typescript
      // 6. Send SMS notification if user opted in
      if (claim.sms_opt_in && claim.phone_e164) {
        try {
          const { sendClaimApprovedSMS } = await import('@/lib/utils/sms')
          
          const smsResult = await sendClaimApprovedSMS(
            claim.phone_e164,
            claim.first_name,
            claim.business.business_name,
            claim.business.city
          )
          
          if (smsResult.success) {
            console.log(`✅ Claim approved SMS sent to ${claim.phone_e164}`)
          } else {
            console.log(`⚠️ SMS not sent: ${smsResult.reason || smsResult.error}`)
          }
        } catch (smsError) {
          console.error('SMS send failed (non-critical):', smsError)
          // Don't fail the approval if SMS fails
        }
      }

      // 7. Send Slack notification (renumber from 6)
```

**Then renumber the Slack notification from `// 6.` to `// 7.`**

---

## **📱 STEP 4: ADD SMS OPT-IN UI TO CLAIM FORM (1 hour)**

### **File:** `app/claim/page.tsx` (or wherever your confirm details section is)

### **Add this component in the confirm business details section:**

```typescript
{/* SMS Notifications Section - Add this AFTER the business details form */}
<div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mt-6">
  <div className="flex items-start gap-3 mb-4">
    <div className="flex-shrink-0 w-10 h-10 bg-[#00d083]/10 rounded-lg flex items-center justify-center">
      <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-semibold text-white mb-1">
        SMS Notifications (Optional)
      </h3>
      <p className="text-sm text-slate-400">
        Get instant updates about your claim status via text message
      </p>
    </div>
  </div>
  
  {/* Opt-in Checkbox */}
  <label className="flex items-start gap-3 cursor-pointer group">
    <input
      type="checkbox"
      checked={smsOptIn}
      onChange={(e) => setSmsOptIn(e.target.checked)}
      className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-[#00d083] focus:ring-[#00d083] focus:ring-offset-0 cursor-pointer"
    />
    <div className="flex-1">
      <span className="text-white font-medium group-hover:text-[#00d083] transition-colors">
        Yes, text me when my claim is reviewed
      </span>
      <div className="mt-2 space-y-1">
        <p className="text-xs text-slate-400 flex items-center gap-2">
          <span className="text-green-400">✓</span>
          Claim approved / action needed notifications only
        </p>
        <p className="text-xs text-slate-400 flex items-center gap-2">
          <span className="text-red-400">✗</span>
          We will never send marketing messages
        </p>
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <span>ℹ️</span>
          Standard message rates may apply. Reply STOP to unsubscribe.
        </p>
      </div>
    </div>
  </label>
  
  {/* Phone Number Field (only if opted in) */}
  {smsOptIn && (
    <div className="mt-4 pl-7">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Mobile Number *
      </label>
      <input
        type="tel"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        placeholder="+447123456789"
        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#00d083] focus:ring-1 focus:ring-[#00d083]"
        required={smsOptIn}
      />
      <p className="text-xs text-slate-500 mt-1.5">
        Enter your UK mobile number in E.164 format (e.g., +447123456789)
      </p>
    </div>
  )}
</div>
```

### **Add state variables at the top of your component:**

```typescript
const [smsOptIn, setSmsOptIn] = useState(false)
const [phoneNumber, setPhoneNumber] = useState('')
```

### **Include in FormData when submitting:**

```typescript
formData.append('smsOptIn', smsOptIn.toString())
if (smsOptIn && phoneNumber) {
  formData.append('phoneNumber', phoneNumber)
}
```

---

## **🔧 STEP 5: UPDATE FRANCHISE SETUP FORM (45 mins)**

### **File:** `components/admin/franchise-setup-form.tsx`

### **Change 1: Add SMS fields to state**

**Location:** In the `FranchiseFormData` interface and initial state

```typescript
interface FranchiseFormData {
  // ... existing fields
  
  // 📱 ADD THESE:
  sms_enabled: boolean
  twilio_account_sid: string
  twilio_auth_token: string
  twilio_messaging_service_sid: string
}

// In useState initial state:
const [formData, setFormData] = useState<FranchiseFormData>({
  // ... existing fields
  
  // 📱 ADD THESE:
  sms_enabled: false,
  twilio_account_sid: '',
  twilio_auth_token: '',
  twilio_messaging_service_sid: ''
})
```

### **Change 2: Add SMS section to the form**

**Location:** After the Resend Email section

```typescript
{/* SMS Notifications Section */}
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-lg font-semibold text-white">SMS Notifications (Optional)</h3>
      <p className="text-sm text-slate-400 mt-1">
        Send transactional SMS via Twilio (claim submitted, claim approved)
      </p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={formData.sms_enabled}
        onChange={(e) => handleInputChange('sms_enabled', e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00d083]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00d083]"></div>
    </label>
  </div>
  
  {formData.sms_enabled && (
    <div className="space-y-4 pl-4 border-l-2 border-[#00d083]/30">
      {/* Twilio Account SID */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Twilio Account SID *
        </label>
        <input
          type="text"
          value={formData.twilio_account_sid}
          onChange={(e) => handleInputChange('twilio_account_sid', e.target.value)}
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
        />
        <p className="text-xs text-slate-500 mt-1">
          From Twilio Console → Account Info
        </p>
      </div>
      
      {/* Twilio Auth Token */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Twilio Auth Token *
        </label>
        <input
          type="password"
          value={formData.twilio_auth_token}
          onChange={(e) => handleInputChange('twilio_auth_token', e.target.value)}
          placeholder="********************************"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
        />
        <p className="text-xs text-slate-500 mt-1">
          From Twilio Console → Account Info (click to reveal)
        </p>
      </div>
      
      {/* Twilio Messaging Service SID */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Messaging Service SID *
        </label>
        <input
          type="text"
          value={formData.twilio_messaging_service_sid}
          onChange={(e) => handleInputChange('twilio_messaging_service_sid', e.target.value)}
          placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
        />
        <p className="text-xs text-slate-500 mt-1">
          From Twilio Console → Messaging → Services
        </p>
      </div>
      
      {/* Test SMS Button */}
      <button
        type="button"
        onClick={() => testSMS()}
        disabled={!formData.twilio_account_sid || !formData.twilio_auth_token || !formData.twilio_messaging_service_sid}
        className="px-4 py-2 bg-[#00d083] text-white rounded-lg hover:bg-[#00b870] disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
      >
        Send Test SMS
      </button>
    </div>
  )}
</div>
```

### **Change 3: Add test SMS function**

```typescript
const testSMS = async () => {
  if (!formData.twilio_account_sid || !formData.twilio_auth_token || !formData.twilio_messaging_service_sid) {
    showError('Missing Credentials', 'Please fill in all Twilio fields first')
    return
  }
  
  // Prompt for phone number
  const phoneNumber = prompt('Enter a test phone number (E.164 format, e.g., +447123456789):')
  if (!phoneNumber) return
  
  try {
    const response = await fetch('/api/admin/test-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: formData.city,
        phoneNumber,
        twilioAccountSid: formData.twilio_account_sid,
        twilioAuthToken: formData.twilio_auth_token,
        twilioMessagingServiceSid: formData.twilio_messaging_service_sid
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      showSuccess('Test SMS Sent!', `Message sent to ${phoneNumber}. Check your phone!`)
    } else {
      showError('Test Failed', result.error || 'Failed to send test SMS')
    }
  } catch (error) {
    showError('Test Error', 'Failed to send test SMS. Check your credentials.')
  }
}
```

---

## **🧪 STEP 6: CREATE TEST SMS ENDPOINT (15 mins)**

### **File:** `app/api/admin/test-sms/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { city, phoneNumber, twilioAccountSid, twilioAuthToken, twilioMessagingServiceSid } = await request.json()
    
    if (!twilioAccountSid || !twilioAuthToken || !twilioMessagingServiceSid || !phoneNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 })
    }
    
    // Test send using provided credentials
    const twilio = await import('twilio')
    const client = twilio.default(twilioAccountSid, twilioAuthToken)
    
    const message = await client.messages.create({
      messagingServiceSid: twilioMessagingServiceSid,
      to: phoneNumber,
      body: `Test message from QWIKKER ${city}. Your SMS notifications are configured correctly! Reply STOP to unsubscribe.`
    })
    
    return NextResponse.json({
      success: true,
      messageSid: message.sid
    })
  } catch (error: any) {
    console.error('Test SMS error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send test SMS'
    }, { status: 500 })
  }
}
```

---

## **📋 STEP 7: UPDATE SETUP API (10 mins)**

### **File:** `app/api/admin/setup/route.ts`

### **Add SMS fields to the upsert**

**Location:** In the POST handler, in the `.upsert()` call

```typescript
.upsert({
  city,
  // ... existing fields ...
  
  // 📱 ADD THESE:
  sms_enabled: config.sms_enabled,
  twilio_account_sid: config.twilio_account_sid,
  twilio_auth_token: config.twilio_auth_token,
  twilio_messaging_service_sid: config.twilio_messaging_service_sid,
  
  updated_at: new Date().toISOString()
}, {
  onConflict: 'city'
})
```

---

## **🎯 TESTING CHECKLIST:**

### **Test 1: SQL Migration**
```sql
-- Verify columns exist
\d franchise_crm_configs
\d claim_requests

-- Check Bournemouth config
SELECT city, sms_enabled FROM franchise_crm_configs WHERE city = 'bournemouth';
```

### **Test 2: Franchise Setup**
1. Go to franchise setup form
2. Enable SMS toggle
3. Fill in Twilio credentials
4. Click "Send Test SMS"
5. Verify you receive SMS

### **Test 3: Claim Flow**
1. Visit claim page
2. Fill in business details
3. Check "Text me updates" box
4. Enter phone number
5. Submit claim
6. Verify you receive "Claim submitted" SMS

### **Test 4: Approval**
1. Admin approves claim
2. Verify user receives "Claim approved" SMS with login link

---

## **📚 DOCUMENTATION FOR FRANCHISES:**

Create: `docs/SMS_SETUP_FOR_FRANCHISES.md`

```markdown
# How to Set Up SMS Notifications

## 1. Create Twilio Account
1. Go to https://www.twilio.com/try-twilio
2. Sign up (free trial: £15 credit)
3. Verify your email and phone

## 2. Create Messaging Service
1. Twilio Console → Messaging → Services
2. Click "Create Messaging Service"
3. Name: "QWIKKER [Your City]"
4. Use case: "Notify my users"
5. Click "Create"
6. Copy the **Messaging Service SID** (starts with MG...)

## 3. Add Phone Number
1. In your Messaging Service
2. Click "Add Senders"
3. Buy a phone number for your country
4. UK: ~£1/month + £0.04/SMS

## 4. Get Credentials
1. Dashboard → Account Info
2. Copy:
   - **Account SID** (starts with AC...)
   - **Auth Token** (click to reveal)

## 5. Add to QWIKKER
1. Admin Dashboard → Franchise Setup
2. SMS Notifications section:
   - Enable SMS: ✓
   - Account SID: [paste]
   - Auth Token: [paste]
   - Messaging Service SID: [paste]
3. Click "Send Test SMS"
4. Enter your phone number
5. Verify you receive test message

## Costs
- Phone number: ~£1-2/month
- SMS sent: ~£0.04 per message
- Estimated: £10-20/month for 200-500 messages

## Compliance
- Only transactional messages sent
- Users must opt-in
- Users can reply STOP to unsubscribe
- Twilio handles STOP/HELP automatically
```

---

## **🚀 IMPLEMENTATION ORDER:**

1. ✅ Run SQL migration (5 mins)
2. ✅ Install Twilio package: `pnpm add twilio` (1 min)
3. ✅ Update claim submit API (30 mins)
4. ✅ Update claim approve API (15 mins)
5. ✅ Add SMS opt-in UI to claim form (1 hour)
6. ✅ Update franchise setup form (45 mins)
7. ✅ Create test SMS endpoint (15 mins)
8. ✅ Update setup API (10 mins)
9. ✅ Test end-to-end (30 mins)

**Total Time:** ~3.5 hours

---

**Ready to implement? Start with Step 1 (SQL migration) and work through in order!** 🚀

