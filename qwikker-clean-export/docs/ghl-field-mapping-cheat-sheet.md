# GHL Field Mapping Cheat Sheet - COPY/PASTE READY

## 🚀 QUICK SETUP: Copy each line exactly as written

### BASIC CONTACT FIELDS
```
First Name → {{inboundWebhookRequest.firstName}}
Last Name → {{inboundWebhookRequest.lastName}}  
Email → {{inboundWebhookRequest.email}}
Phone → {{inboundWebhookRequest.phone}}
```

### BUSINESS INFORMATION
```
Business Name → {{inboundWebhookRequest.businessName}}
Business Category → {{inboundWebhookRequest.businessCategory}}
Business Address → {{inboundWebhookRequest.businessAddress}}
Business Postcode → {{inboundWebhookRequest.businessPostcode}}
Business Website → {{inboundWebhookRequest.website}}
Business Instagram → {{inboundWebhookRequest.instagram}}
Business Facebook → {{inboundWebhookRequest.facebook}}
Business Type → {{inboundWebhookRequest.businessType}}
```

### OFFER INFORMATION
```
Offer Title → {{inboundWebhookRequest.offerName}}
Offer Value → {{inboundWebhookRequest.offerValue}}
Offer Start Date → {{inboundWebhookRequest.offerStartDate}}
Offer End Date → {{inboundWebhookRequest.offerEndDate}}
Offer Terms → {{inboundWebhookRequest.offerTerms}}
```

### ADDITIONAL BUSINESS DATA
```
Business Goals → {{inboundWebhookRequest.goals}}
Notes → {{inboundWebhookRequest.notes}}
Referral Source → {{inboundWebhookRequest.referralSource}}
```

### FILE URLS
```
Logo URL → {{inboundWebhookRequest.logo_url}}
Menu URL → {{inboundWebhookRequest.menu_url}}
Offer Image URL → {{inboundWebhookRequest.offer_image_url}}
```

### FRANCHISE/SYSTEM FIELDS
```
Franchise City → {{inboundWebhookRequest.franchise_city}}
Franchise Owner → {{inboundWebhookRequest.franchise_owner.name}}
Qwikker Contact ID → {{inboundWebhookRequest.qwikkerContactId}}
Signup Source → {{inboundWebhookRequest.updateSource}}
```

---

## 🎯 STEP-BY-STEP SETUP PROCESS

### 1. CREATE THE WORKFLOW
- Name: "Qwikker [CITY] - Business Signups"
- Trigger: Inbound Webhook
- Action: Create Contact

### 2. MAP THE FIELDS (30 seconds each)
For each field in GHL:
1. **Click the field dropdown**
2. **Select "Custom Values"**
3. **Copy/paste the mapping** from above
4. **Click "Save Action"**

### 3. COPY THE WEBHOOK URL
- Go to the webhook trigger
- Copy the webhook URL
- Paste into franchise setup form

---

## 🚀 EVEN FASTER: BULK FIELD CREATION

### Create Custom Fields Once (Do This First)
In GHL Settings → Custom Fields, create:

**Contact Custom Fields:**
- `qwikker_business_name` (Text)
- `qwikker_business_category` (Text)  
- `qwikker_business_address` (Text)
- `qwikker_business_postcode` (Text)
- `qwikker_business_website` (URL)
- `qwikker_business_instagram` (Text)
- `qwikker_business_facebook` (URL)
- `qwikker_business_type` (Text)
- `qwikker_offer_title` (Text)
- `qwikker_offer_value` (Text)
- `qwikker_offer_start_date` (Date)
- `qwikker_offer_end_date` (Date)
- `qwikker_offer_terms` (Text)
- `qwikker_business_goals` (Text)
- `qwikker_notes` (Text)
- `qwikker_referral_source` (Text)
- `qwikker_logo_url` (URL)
- `qwikker_menu_url` (URL)
- `qwikker_offer_image_url` (URL)
- `qwikker_franchise_city` (Text)
- `qwikker_contact_id` (Text)

Then you can just select these custom fields instead of typing the mappings!

---

## 💡 PRO TIPS

### Make It Even Faster:
1. **Create the template once** with all mappings
2. **Export/Import workflows** (if GHL supports it)
3. **Use GHL's duplicate workflow feature**
4. **Just change the webhook URL** for each franchise

### Quality Check:
1. **Send test data** after setup
2. **Verify all fields populate** correctly
3. **Check contact appears** in right pipeline
4. **Test Slack notifications** (if configured)

---

## 🔧 AUTOMATION OPPORTUNITY

### Future Enhancement:
Build a "GHL Setup Generator" that:
1. **Takes franchise details** as input
2. **Generates the complete field mapping JSON**
3. **Creates the workflow via GHL API**
4. **Returns the webhook URL**
5. **Saves everything to database**

This would make franchise setup **COMPLETELY AUTOMATED**!

---

## 📱 MOBILE-FRIENDLY SETUP

### Use This on Your Phone:
Save this document to your phone so you can:
- **Copy/paste mappings** while setting up GHL
- **Reference field names** quickly
- **Check off completed fields** as you go

---

## ⚡ TIME SAVINGS

### Manual Setup: ~30 minutes per franchise
### With This Cheat Sheet: ~5 minutes per franchise
### With Custom Fields: ~2 minutes per franchise  
### With API Automation: ~30 seconds per franchise

**You'll save HOURS when setting up multiple franchises!** 🚀
