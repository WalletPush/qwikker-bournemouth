# 🔗 GHL WEBHOOK WORKFLOW SETUP

## 🎯 CRITICAL: You Need to Create Webhook Workflows in GHL!

### **PROBLEM IDENTIFIED:**
We're sending data TO GHL, but GHL needs **WORKFLOWS** to process that data and update contacts.

---

## **🔧 REQUIRED GHL WORKFLOWS:**

### **1. 📝 NEW BUSINESS SIGNUP WORKFLOW**
**Trigger:** Webhook receives new business data from Qwikker onboarding
**Webhook URL:** `https://your-ghl-webhook-url.com/qwikker-signup`

**Actions:**
1. **Create Contact** with all business info
2. **Add Tags:** `qwikker-business`, `{city}`, `{business_type}`
3. **Set Custom Fields:**
   - Business Name
   - Business Type
   - Business Category
   - Address
   - Phone
   - Email
   - City
   - Status: `incomplete`
4. **Send Welcome Email/SMS**
5. **Add to Pipeline:** "Qwikker Businesses"

---

### **2. 🔄 CONTACT UPDATE WORKFLOW**
**Trigger:** Webhook receives contact update from Qwikker admin/business
**Webhook URL:** `https://your-ghl-webhook-url.com/qwikker-update`

**Actions:**
1. **Find Contact** by `qwikkerContactId` or email
2. **Update Contact Fields:**
   - First Name
   - Last Name
   - Email
   - Phone
   - Business Name
   - Business Address
   - Any other changed fields
3. **Add Note:** "Updated from Qwikker Dashboard"
4. **Update Last Sync Date**

---

### **3. ✅ BUSINESS APPROVAL WORKFLOW**
**Trigger:** Webhook receives business approval from Qwikker admin
**Webhook URL:** `https://your-ghl-webhook-url.com/qwikker-approval`

**Actions:**
1. **Find Contact** by `qwikkerContactId`
2. **Update Status** to `approved`
3. **Add Tags:** `approved`, `live`
4. **Move in Pipeline** to "Active Businesses"
5. **Send Approval Email/SMS**
6. **Start Billing Sequence** (if applicable)

---

## **🛠️ WEBHOOK DATA STRUCTURE:**

### **Signup Data:**
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@business.com",
  "phone": "+1234567890",
  "businessName": "John's Restaurant",
  "businessType": "Restaurant",
  "businessCategory": "Fast Food",
  "businessAddress": "123 Main St",
  "town": "Bournemouth",
  "postcode": "BH1 1AA",
  "city": "bournemouth",
  "qwikkerContactId": "uuid-here",
  "status": "incomplete",
  "syncType": "new_signup"
}
```

### **Update Data:**
```json
{
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "email": "john.updated@business.com", 
  "phone": "+1234567890",
  "businessName": "John's Updated Restaurant",
  "qwikkerContactId": "uuid-here",
  "updatedFields": ["firstName", "lastName", "businessName"],
  "syncType": "contact_update",
  "updateSource": "admin",
  "isUpdate": true
}
```

---

## **🔗 WEBHOOK URLS NEEDED:**

You need to provide these webhook URLs in your GHL account:

1. **Main Signup Webhook:** `NEXT_PUBLIC_GHL_WEBHOOK_URL`
2. **Contact Update Webhook:** `NEXT_PUBLIC_GHL_UPDATE_WEBHOOK_URL` 
3. **Approval Webhook:** `NEXT_PUBLIC_GHL_APPROVAL_WEBHOOK_URL`

---

## **⚙️ GHL WORKFLOW SETUP STEPS:**

### **Step 1: Create Webhooks in GHL**
1. Go to **Settings → Integrations → Webhooks**
2. Click **"Add Webhook"**
3. Set **Method:** POST
4. Set **URL:** Your webhook URL
5. **Save** and copy the webhook URL

### **Step 2: Create Workflows**
1. Go to **Automation → Workflows**
2. Click **"Create Workflow"**
3. **Trigger:** Webhook
4. **Select:** Your created webhook
5. **Add Actions:** As described above
6. **Test** with sample data
7. **Activate** workflow

### **Step 3: Test Integration**
1. **Test Signup:** Complete onboarding form
2. **Check GHL:** Verify contact created
3. **Test Update:** Change contact in admin
4. **Check GHL:** Verify contact updated
5. **Test Approval:** Approve business in admin
6. **Check GHL:** Verify status updated

---

## **🚨 CURRENT ISSUE:**

**Without these GHL workflows, the webhook calls are being sent but GHL doesn't know what to do with them!**

**This is why contact updates appear to "work" (they update Supabase) but don't actually update GHL contacts.**

---

## **🎯 IMMEDIATE ACTION REQUIRED:**

1. **Create the 3 workflows in GHL**
2. **Get the webhook URLs**
3. **Update environment variables:**
   ```env
   NEXT_PUBLIC_GHL_WEBHOOK_URL=your-signup-webhook-url
   NEXT_PUBLIC_GHL_UPDATE_WEBHOOK_URL=your-update-webhook-url
   NEXT_PUBLIC_GHL_APPROVAL_WEBHOOK_URL=your-approval-webhook-url
   ```
4. **Test the complete flow**

**ONLY THEN will the seamless update system work end-to-end!** 🔥
