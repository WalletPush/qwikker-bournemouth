# 📱 SMS Notifications - Ready to Implement

**Date:** 2026-01-13  
**Status:** ✅ All files created, ready to implement  
**Estimated Time:** ~3.5 hours total

---

## **📦 WHAT'S BEEN CREATED:**

### **1. Core Files:**
- ✅ `supabase/migrations/20260113000000_add_sms_notifications.sql` - Database schema
- ✅ `lib/utils/sms.ts` - SMS helper functions (Twilio integration)
- ✅ `app/api/admin/test-sms/route.ts` - Test SMS endpoint for setup wizard

### **2. Documentation:**
- ✅ `SMS_IMPLEMENTATION_GUIDE.md` - Complete step-by-step guide with exact code insertions
- ✅ `CLAIM_FLOW_FIX.md` - UX fix for claim flow order (email → verify → details)
- ✅ `SMS_IMPLEMENTATION_SUMMARY.md` - This file (overview)

### **3. What's Tracked:**
- ✅ 9 TODOs created in your task list
- ✅ Files referenced with exact line numbers
- ✅ Testing checklists included

---

## **🎯 NEXT STEPS (In Order):**

### **Step 1: Run SQL Migration** (5 mins)
```bash
# In Supabase SQL Editor, run:
supabase/migrations/20260113000000_add_sms_notifications.sql
```

This adds:
- `sms_enabled`, `twilio_account_sid`, `twilio_auth_token`, `twilio_messaging_service_sid` to `franchise_crm_configs`
- `sms_opt_in`, `phone_e164`, `sms_opt_in_at`, `sms_consent_text_version` to `claim_requests`

---

### **Step 2: Install Twilio** (1 min)
```bash
cd /Users/qwikker/qwikkerdashboard
pnpm install twilio
```

> **Note:** If you get a pnpm store error, run:
> ```bash
> pnpm install --force
> ```

---

### **Step 3: Fix Claim Flow UX** (1-2 hours)

**Critical UX Issue:** Business details form shows BEFORE email verification.

**Fix:** Split into 3 steps:
1. Email + Send Code
2. Verify Code → ✅ Verified!
3. Confirm Details (with SMS opt-in)

See `CLAIM_FLOW_FIX.md` for detailed implementation.

---

### **Step 4: Update Backend APIs** (45 mins)

#### **A) Claim Submit API** (30 mins)
**File:** `app/api/claim/submit/route.ts`

**Changes:**
1. Extract SMS fields from FormData (line 33)
2. Add SMS fields to claim_requests insert (line 195-210)
3. Send SMS after claim submitted (line 382)

See `SMS_IMPLEMENTATION_GUIDE.md` Section "STEP 2" for exact code.

#### **B) Claim Approve API** (15 mins)
**File:** `app/api/admin/approve-claim/route.ts`

**Changes:**
1. Send SMS after approval email (line 289)

See `SMS_IMPLEMENTATION_GUIDE.md` Section "STEP 3" for exact code.

---

### **Step 5: Add SMS Opt-In UI** (1 hour)

**File:** `app/claim/page.tsx`

Add SMS opt-in section to Step 3 (Confirm Details):
- Checkbox (unchecked by default)
- Phone number input (E.164 format)
- Clear messaging (transactional only, no marketing)

See `SMS_IMPLEMENTATION_GUIDE.md` Section "STEP 4" for full component code.

---

### **Step 6: Update Franchise Setup** (45 mins)

#### **A) Setup Form** (30 mins)
**File:** `components/admin/franchise-setup-form.tsx`

Add SMS configuration section:
- Enable SMS toggle
- Twilio Account SID
- Twilio Auth Token
- Twilio Messaging Service SID
- "Send Test SMS" button

See `SMS_IMPLEMENTATION_GUIDE.md` Section "STEP 5" for exact code.

#### **B) Setup API** (15 mins)
**File:** `app/api/admin/setup/route.ts`

Add SMS fields to the `.upsert()` call.

See `SMS_IMPLEMENTATION_GUIDE.md` Section "STEP 7" for exact code.

---

### **Step 7: Test End-to-End** (30 mins)

1. ✅ SQL migration successful
2. ✅ Twilio package installed
3. ✅ Franchise setup: add Twilio credentials
4. ✅ Send test SMS → receive message
5. ✅ Claim flow: opt-in to SMS
6. ✅ Submit claim → receive "Claim submitted" SMS
7. ✅ Admin approves → receive "Claim approved" SMS

---

## **📋 TESTING CHECKLIST:**

### **Franchise Setup:**
- [ ] Enable SMS toggle works
- [ ] Can enter Twilio credentials
- [ ] "Send Test SMS" button works
- [ ] Receive test message on phone
- [ ] Credentials saved to database

### **Claim Flow:**
- [ ] Claim flow order fixed (email → verify → details)
- [ ] SMS opt-in checkbox shows in Step 3
- [ ] Phone number field shows when checked
- [ ] Can submit claim with SMS opt-in
- [ ] Can submit claim without SMS opt-in
- [ ] Receive "Claim submitted" SMS (if opted in)

### **Approval:**
- [ ] Admin approves claim
- [ ] User receives "Claim approved" SMS (if opted in)
- [ ] SMS includes login link
- [ ] No SMS sent if user didn't opt in

### **Edge Cases:**
- [ ] Invalid phone number rejected
- [ ] Missing Twilio credentials handled gracefully
- [ ] SMS disabled for city → no SMS sent
- [ ] SMS send failure doesn't block claim submission
- [ ] SMS send failure doesn't block claim approval

---

## **📚 TWILIO SETUP (For Franchises):**

### **Quick Start:**
1. Go to https://www.twilio.com/try-twilio
2. Sign up (free trial: £15 credit)
3. Create Messaging Service:
   - Console → Messaging → Services
   - Create new service
   - Add phone number
   - Copy Messaging Service SID (starts with MG...)
4. Get credentials:
   - Dashboard → Account Info
   - Copy Account SID (AC...)
   - Copy Auth Token (click to reveal)
5. Add to QWIKKER:
   - Admin → Franchise Setup
   - Enable SMS
   - Paste credentials
   - Send test SMS

### **Costs:**
- Phone number: ~£1-2/month
- Per SMS: ~£0.04
- Estimated monthly: £10-20 (for 200-500 messages)

---

## **🔐 SECURITY & COMPLIANCE:**

### **Opt-In:**
- ✅ Checkbox unchecked by default
- ✅ Clear consent language
- ✅ Consent version tracked in DB

### **Transactional Only:**
- ✅ Only 2 messages sent:
  1. Claim submitted (confirmation)
  2. Claim approved (with login link)
- ✅ No marketing messages
- ✅ Users can reply STOP to unsubscribe (Twilio handles automatically)

### **Data Security:**
- ✅ Auth tokens never displayed after save
- ✅ Only service_role can read tokens
- ✅ Per-city credentials (multi-tenant)
- ✅ Phone numbers stored in E.164 format

---

## **❓ TROUBLESHOOTING:**

### **pnpm install fails:**
```bash
pnpm install --force twilio
# or
pnpm config set store-dir ~/.pnpm-store --global
pnpm install twilio
```

### **Test SMS fails:**
- Check Twilio credentials (Account SID, Auth Token)
- Verify Messaging Service SID is correct
- Ensure phone number is E.164 format (+447123456789)
- Check Twilio console for error logs

### **SMS not sending in production:**
- Verify `sms_enabled = true` in franchise_crm_configs
- Check Twilio credentials are set for that city
- Verify phone number in claim_requests.phone_e164
- Check server logs for errors

---

## **🚀 READY TO START?**

1. Open `SMS_IMPLEMENTATION_GUIDE.md`
2. Follow steps in order
3. Mark TODOs as completed
4. Test at each step

**Estimated completion time:** ~3.5 hours

**Questions? Check:**
- `SMS_IMPLEMENTATION_GUIDE.md` - Detailed step-by-step
- `CLAIM_FLOW_FIX.md` - UX flow explanation
- `lib/utils/sms.ts` - SMS helper functions
- `app/api/admin/test-sms/route.ts` - Test endpoint

---

**Let's build this! 🚀**

