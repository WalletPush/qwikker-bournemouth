# 🔐 Franchise Admin Password System

## 📋 **Current State Analysis**

### **What We Have:**
1. ❌ OLD API endpoint (`/api/hq/franchises`) that generates random passwords
2. ❌ Testing credentials showing on login page (username=city, password=Admin123)
3. ✅ New HQ Admin create franchise UI with comprehensive fields
4. ❌ No email invitation system
5. ❌ No forced password reset on first login

---

## 🎯 **Recommended Approach**

### **Option 1: Secure Auto-Generated Password (RECOMMENDED)** ⭐

**How it works:**
1. HQ Admin creates franchise via `/hqadmin/franchises/create`
2. System generates a SECURE random password (16+ characters, complex)
3. System sends email to franchise owner with:
   - Welcome message
   - Temporary login credentials
   - Link to set password: `https://{city}.qwikker.com/admin/set-password?token={secure-token}`
4. First login FORCES password change
5. Old temp password is invalidated

**Benefits:**
- ✅ Most secure (no predictable passwords)
- ✅ Professional onboarding experience
- ✅ Audit trail (email sent timestamp)
- ✅ Can resend if owner doesn't receive email
- ✅ Industry standard practice

**Drawbacks:**
- ⚠️ Requires email infrastructure (Resend API - already have it!)
- ⚠️ Owner must have access to email (acceptable for business owners)

---

### **Option 2: Standardized Temp Password (LESS SECURE)**

**How it works:**
1. HQ Admin creates franchise
2. System sets: `username = {city}`, `password = Admin123`
3. HQ Admin manually tells franchise owner the credentials (phone/in-person)
4. First login FORCES password change

**Benefits:**
- ✅ Simple for HQ Admin to communicate
- ✅ Works without email (for owners without email access)
- ✅ Predictable pattern

**Drawbacks:**
- ❌ SECURITY RISK: All new franchises have same password temporarily
- ❌ If someone knows the pattern, they can try `calgary/Admin123`, `london/Admin123`, etc.
- ❌ No audit trail
- ❌ Unprofessional
- ❌ Risk if password reset doesn't work

---

## ✅ **FINAL RECOMMENDATION**

**Use Option 1 (Secure Auto-Generated)** for production.

**Why:**
- You already have Resend API configured per franchise
- Email is standard for business owners
- Security > convenience for admin dashboards
- Can still manually communicate credentials if email fails

---

## 🔧 **Implementation Plan**

### **Step 1: Update `/api/hq/franchises` POST endpoint**

```typescript
export async function POST(request: NextRequest) {
  // ... HQ admin auth ...
  
  const {
    city_name,
    subdomain,
    country,
    timezone,
    owner_first_name,
    owner_last_name,
    owner_email,
    owner_phone,
    send_invite,
    force_password_reset,
    // Atlas fields...
  } = await request.json()
  
  // 1. Generate secure temporary password
  const tempPassword = generateSecurePassword() // 16+ chars
  
  // 2. Create auth user with temp password
  const { data: authUser } = await supabase.auth.admin.createUser({
    email: owner_email,
    password: tempPassword,
    email_confirm: false, // They'll confirm via password reset link
    user_metadata: {
      first_name: owner_first_name,
      last_name: owner_last_name,
      city: city_name.toLowerCase(),
      role: 'city_admin',
      force_password_reset: true // ⚠️ Flag for middleware
    }
  })
  
  // 3. Create franchise_crm_configs entry
  // 4. Create city_admins entry
  // 5. Create atlas_config if enabled
  
  // 6. Send invite email (if send_invite = true)
  if (send_invite) {
    await sendFranchiseInviteEmail({
      to: owner_email,
      franchiseName: city_name,
      ownerName: `${owner_first_name} ${owner_last_name}`,
      tempPassword: tempPassword, // Only sent once, in email
      loginUrl: `https://${subdomain}.qwikker.com/admin-login`,
      setPasswordUrl: `https://${subdomain}.qwikker.com/admin/set-password?email=${owner_email}`
    })
  }
  
  // 7. Return success (DO NOT return password in response!)
  return NextResponse.json({
    success: true,
    franchise: { city: city_name, subdomain },
    message: send_invite 
      ? `Franchise created. Invite email sent to ${owner_email}` 
      : `Franchise created. Manually share credentials with owner.`
  })
}
```

---

### **Step 2: Create Password Reset Flow**

**File: `app/admin/set-password/page.tsx`**

```typescript
'use client'

export default function SetPasswordPage() {
  // 1. Get email from URL query param
  // 2. Show form to enter new password (2x for confirmation)
  // 3. Validate: 12+ chars, uppercase, lowercase, number, symbol
  // 4. Call Supabase updateUser() to set new password
  // 5. Clear force_password_reset flag in user_metadata
  // 6. Redirect to /admin with success message
}
```

---

### **Step 3: Add Middleware Check for Forced Password Reset**

**File: `middleware.ts`** (admin routes)

```typescript
// After successful auth, check if password reset required
if (session.user.user_metadata?.force_password_reset) {
  return NextResponse.redirect(new URL('/admin/set-password', request.url))
}
```

---

### **Step 4: Create Resend Email Template**

**File: `lib/email/templates/franchise-invite.tsx`**

```tsx
Subject: Welcome to Qwikker - Your {city} Franchise is Ready!

Hi {ownerName},

Your Qwikker franchise for {city} has been created! 

🎉 Your Dashboard is Ready
📍 Login URL: {loginUrl}
👤 Username: {email}
🔑 Temporary Password: {tempPassword}

⚠️ IMPORTANT: You must set a new password on first login.

Click here to set your password now: {setPasswordUrl}

Questions? Reply to this email or contact HQ support.

Welcome to the Qwikker family! 🚀

---
The Qwikker HQ Team
```

---

## 🔒 **Security Checklist**

- [ ] Temp passwords are 16+ characters, random, complex
- [ ] Temp passwords are NEVER logged or stored after email is sent
- [ ] Temp passwords expire after 7 days if not used
- [ ] Force password reset middleware prevents dashboard access
- [ ] New passwords must meet complexity requirements
- [ ] Failed login attempts are rate-limited
- [ ] Password reset links are single-use tokens (expire after 1 hour)
- [ ] Audit log records: franchise created, invite sent, password changed

---

## 📧 **Email Template System**

Use Resend API (already configured per franchise):

```typescript
// lib/email/franchise-invite.ts
export async function sendFranchiseInviteEmail({
  to,
  franchiseName,
  ownerName,
  tempPassword,
  loginUrl,
  setPasswordUrl
}: FranchiseInviteParams) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  
  await resend.emails.send({
    from: 'Qwikker HQ <hq@qwikker.com>',
    to: to,
    subject: `Welcome to Qwikker - Your ${franchiseName} Franchise is Ready!`,
    html: renderFranchiseInviteTemplate({
      franchiseName,
      ownerName,
      tempPassword,
      loginUrl,
      setPasswordUrl
    })
  })
}
```

---

## 🧪 **Testing Plan**

### **Test 1: Happy Path**
1. HQ Admin creates franchise for "Calgary"
2. Owner receives email with temp password
3. Owner clicks "Set Password" link
4. Owner sets new password: `Calgary2026!Strong`
5. Owner logs in with new password
6. Dashboard loads successfully

### **Test 2: No Email Sent (Manual Mode)**
1. HQ Admin creates franchise with `send_invite = false`
2. System creates user but doesn't send email
3. HQ Admin manually calls owner and shares:
   - Username: `owner@example.com`
   - Temp password: `{generated-password}`
   - Login URL: `https://calgary.qwikker.com/admin-login`
4. Owner logs in, forced to set password

### **Test 3: Email Bounce/Not Received**
1. Email bounces or owner doesn't receive it
2. HQ Admin can "Resend Invite" from franchise list
3. New temp password generated and sent
4. Old temp password invalidated

### **Test 4: Security - Forced Reset**
1. Owner tries to access `/admin` without setting password
2. Middleware redirects to `/admin/set-password`
3. Owner cannot bypass this

---

## 🚀 **Migration Path (If Using Testing Credentials)**

**If you've already created franchises with `bournemouth/Admin123`:**

1. Run SQL script to flag all existing admins for password reset:
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"force_password_reset": true}'::jsonb
WHERE id IN (
  SELECT user_id FROM city_admins
);
```

2. Send bulk "Set Your Password" emails to all existing franchise owners

3. Existing admins will be forced to set strong passwords on next login

---

## 📝 **Next Steps**

Want me to implement Option 1 (Secure Auto-Generated) now? I'll:

1. ✅ Update `/api/hq/franchises` POST endpoint
2. ✅ Create secure password generator
3. ✅ Create email template
4. ✅ Create `/admin/set-password` page
5. ✅ Add middleware check
6. ✅ Add "Resend Invite" button to franchise list

**Total implementation time: ~2 hours**

**Blocks removal of testing credentials: YES - don't remove until new system is live**

---

**END OF DOCUMENT**
