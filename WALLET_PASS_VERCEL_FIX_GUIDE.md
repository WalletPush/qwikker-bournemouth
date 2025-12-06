# 🎫 Wallet Pass Issues on Vercel - Complete Fix Guide

## 🔴 **Problems You're Experiencing**

1. **Pass doesn't show user's name** - Shows generic/empty name
2. **Can't add offers to wallet** - Shows "pending" status  
3. **Links on pass redirect to login page** - Should go directly to dashboard/chat

---

## ✅ **Solutions**

### **1. Fix Name Not Showing on Pass**

**Root Cause:** WalletPush template is not configured to use dynamic user data from the webhook.

**Fix Steps:**

1. Go to your WalletPush dashboard: https://app2.walletpush.io
2. Navigate to **Templates** → Select your Qwikker pass template
3. Edit the pass fields to use dynamic variables:

```javascript
// Front of Pass
Primary Field: {{name}}  // User's full name
Secondary Field 1: {{city}}  // User's city
Auxiliary Field 1: Member Since {{created_at}}

// Back of Pass - Contact Info
back_field_1_label: "Member"
back_field_1_value: {{name}}

back_field_2_label: "Email"  
back_field_2_value: {{email}}

back_field_3_label: "Tier"
back_field_3_value: {{tier}}
```

4. **CRITICAL**: Ensure your GHL webhook sends these fields when creating the pass:
   - `name` (from GHL First Name + Last Name)
   - `email`
   - `city` (hardcoded to 'bournemouth' for now)
   - `tier` ('explorer' for new users)

5. Test by creating a new pass - the name should now appear!

---

### **2. Fix "Pending" Status Issue**

**Root Cause:** Either the webhook isn't running, or the database user record isn't being created properly.

**Check:**

1. Go to your diagnostic page (I just created it): 
   ```
   https://qwikkerdashboard-theta.vercel.app/admin/wallet-diagnostic
   ```

2. Look for users with **"Pending"** status badge (yellow)

3. If you see pending users, run this SQL in Supabase SQL Editor:

```sql
-- Fix all pending users to active
UPDATE app_users 
SET wallet_pass_status = 'active',
    updated_at = NOW()
WHERE wallet_pass_status = 'pending';

-- Check the results
SELECT name, email, wallet_pass_status, created_at 
FROM app_users 
ORDER BY created_at DESC 
LIMIT 10;
```

**Prevent Future Issues:**

The webhook at `/app/api/ghl-webhook/user-creation/route.ts` is already set to create users with `wallet_pass_status: 'active'`. 

If new users still show as pending, check:
- GHL workflow is calling the webhook correctly
- Webhook URL is correct: `https://qwikkerdashboard-theta.vercel.app/api/ghl-webhook/user-creation`
- Webhook is receiving all required fields (name, email, wallet_pass_id)

---

### **3. Fix Links Redirecting to Login**

**Root Cause:** Wallet pass links are pointing to wrong URLs (likely `/dashboard` instead of `/user/dashboard`).

**Correct Link Format for WalletPush Template:**

```javascript
// BACK OF PASS - Interactive Links

// Link 1: Dashboard
back_field_4_label: "🏠 My Dashboard"
back_field_4_link: "https://qwikkerdashboard-theta.vercel.app/s/{{last_8_chars_of_wallet_pass_id}}"

// Link 2: AI Chat
back_field_5_label: "💬 AI Companion"
back_field_5_link: "https://qwikkerdashboard-theta.vercel.app/c/{{last_8_chars_of_wallet_pass_id}}"

// Link 3: Discover
back_field_6_label: "🔍 Discover"
back_field_6_link: "https://qwikkerdashboard-theta.vercel.app/s/{{last_8_chars_of_wallet_pass_id}}/discover"
```

**Important Notes:**
- ✅ Use `/s/` (shortlink) or `/c/` (chat shortlink) - these handle authentication automatically
- ❌ DO NOT use `/dashboard` - that's for business owners and requires Supabase auth
- ✅ Use last 8 characters of wallet_pass_id as the shortlink code
- ✅ The shortlink will look up the user and redirect them with proper authentication

**How Shortlinks Work:**

```
User clicks: /s/ABC12345
↓
System looks up wallet_pass_id ending in "ABC12345"
↓
System finds user: "David Williams" (QWIK-BOURNEMOUTH-DAVID-ABC12345)
↓
Redirects to: /user/dashboard?wallet_pass_id=QWIK-BOURNEMOUTH-DAVID-ABC12345
↓
User sees their personalized dashboard ✅
```

---

## 🧪 **Testing Your Fixes**

### **Test 1: Name Shows on Pass**
1. Create a new wallet pass via GHL form
2. Add to Apple/Google Wallet
3. Open pass - name should show (not "New Qwikker User")

### **Test 2: User is Active**
1. Go to: `https://qwikkerdashboard-theta.vercel.app/admin/wallet-diagnostic`
2. Find your test user
3. Status should show green "Active" badge
4. Name should be your actual name

### **Test 3: Links Work Without Login**
1. Open wallet pass
2. Click any link on the back
3. Should go directly to dashboard/chat (NO login page)
4. Should show personalized content with your name

---

## 📋 **Checklist**

- [ ] WalletPush template configured with `{{name}}`, `{{email}}`, etc.
- [ ] All existing pending users updated to active (SQL command above)
- [ ] GHL webhook URL correct and working
- [ ] Pass links use `/s/` or `/c/` shortlink format
- [ ] Pass links use last 8 chars of wallet_pass_id
- [ ] Tested new pass creation end-to-end
- [ ] Confirmed links work without login redirect

---

## 🔍 **Diagnostic Tools**

### **Admin Diagnostic Page**
```
https://qwikkerdashboard-theta.vercel.app/admin/wallet-diagnostic
```

This page shows:
- Total users
- How many are "active" vs "pending"  
- How many have missing names
- Test links for each user
- Issues found for each user

### **Check GHL Webhook Logs**

In GHL → Workflows → Check webhook action logs to see:
- Is webhook being called?
- What data is being sent?
- What response is received?

### **Check Vercel Logs**

1. Go to Vercel dashboard → Your project
2. Click "Logs" tab
3. Filter for `/api/ghl-webhook/user-creation`
4. Look for errors or unexpected behavior

---

## 🎯 **Expected Behavior After Fixes**

1. **New User Flow:**
   ```
   GHL Form Submission
   → Wallet Pass Created in WalletPush
   → Webhook called: /api/ghl-webhook/user-creation
   → User created in Supabase (status: active)
   → Pass added to Apple/Google Wallet
   → Pass shows user's NAME, email, tier
   → User clicks link on pass → Goes to dashboard (NO LOGIN)
   ```

2. **Existing User Fix:**
   ```
   Run SQL to set status to 'active'
   → Update WalletPush template
   → Update pass in WalletPush (triggers push notification)
   → User's pass updates automatically in their wallet
   → Links now work without login redirect
   ```

---

## 🚨 **Still Not Working?**

If issues persist after following this guide:

1. **Check Middleware** - Ensure `/user` paths are in the public routes list (already should be)
2. **Check Browser Console** - Look for errors when clicking pass links
3. **Check Vercel Logs** - See what's happening on the server side
4. **Contact Support** - Share the diagnostic page screenshot showing the issues

---

## 📝 **Quick SQL Queries for Debugging**

```sql
-- Check all users and their status
SELECT 
  name, 
  email, 
  wallet_pass_id, 
  wallet_pass_status, 
  city,
  created_at
FROM app_users
ORDER BY created_at DESC
LIMIT 20;

-- Find users with issues
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN wallet_pass_status = 'active' THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN wallet_pass_status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN name IS NULL OR name = 'New Qwikker User' THEN 1 ELSE 0 END) as missing_name
FROM app_users;

-- Fix specific user
UPDATE app_users
SET 
  wallet_pass_status = 'active',
  name = 'Your Actual Name'  -- if name is wrong
WHERE wallet_pass_id = 'YOUR-WALLET-PASS-ID';
```

---

Need help implementing any of these fixes? Let me know! 🚀

