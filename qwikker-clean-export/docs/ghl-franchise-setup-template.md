# GHL Franchise Setup Template

## 🎯 AUTOMATED FRANCHISE CRM SETUP

### STEP 1: Create Template Workflow (Do Once)
1. **Go to GHL** → Automations → Workflows
2. **Create "Qwikker Franchise Template"**
3. **Configure all field mappings** (see below)
4. **Save as template**

### STEP 2: For Each New Franchise (2 minutes)
1. **Duplicate template workflow**
2. **Rename**: "Qwikker [City Name] - Business Signups"
3. **Copy webhook URL**
4. **Add to franchise setup form**
5. **Done!**

---

## 📋 EXACT FIELD MAPPINGS FOR GHL

### Contact Fields (Copy/Paste This)
```
First Name → {{inboundWebhookRequest.firstName}}
Last Name → {{inboundWebhookRequest.lastName}}
Email → {{inboundWebhookRequest.email}}
Phone → {{inboundWebhookRequest.phone}}
```

### Business Information (Copy/Paste This)
```
Business Name → {{inboundWebhookRequest.businessName}}
Business Category → {{inboundWebhookRequest.businessCategory}}
Business Address → {{inboundWebhookRequest.businessAddress}}
Business Postcode → {{inboundWebhookRequest.businessPostcode}}
Business Website → {{inboundWebhookRequest.website}}
Business Instagram → {{inboundWebhookRequest.instagram}}
Business Facebook → {{inboundWebhookRequest.facebook}}
```

### Offer Information (Copy/Paste This)
```
Offer Title → {{inboundWebhookRequest.offerName}}
Offer Value → {{inboundWebhookRequest.offerValue}}
Offer Start Date → {{inboundWebhookRequest.offerStartDate}}
Offer End Date → {{inboundWebhookRequest.offerEndDate}}
Offer Terms → {{inboundWebhookRequest.offerTerms}}
```

### Additional Fields (Copy/Paste This)
```
Business Goals → {{inboundWebhookRequest.goals}}
Notes → {{inboundWebhookRequest.notes}}
Business Type → {{inboundWebhookRequest.businessType}}
Referral Source → {{inboundWebhookRequest.referralSource}}
```

### File URLs (Copy/Paste This)
```
Logo URL → {{inboundWebhookRequest.logo_url}}
Menu URL → {{inboundWebhookRequest.menu_url}}
Offer Image URL → {{inboundWebhookRequest.offer_image_url}}
```

### System Fields (Copy/Paste This)
```
Franchise City → {{inboundWebhookRequest.franchise_city}}
Franchise Owner → {{inboundWebhookRequest.franchise_owner.name}}
Signup Source → {{inboundWebhookRequest.updateSource}}
Qwikker Contact ID → {{inboundWebhookRequest.qwikkerContactId}}
```

---

## 🚀 EVEN BETTER: AUTO-WEBHOOK CREATION API

We can build an API that creates GHL webhooks automatically!

### How It Would Work:
1. **Franchise owner gives you GHL API key**
2. **You enter their info in franchise setup**
3. **System automatically creates webhook in their GHL**
4. **Returns webhook URL**
5. **Saves everything to database**

### GHL API Integration:
```typescript
// Create webhook automatically in their GHL account
const createGHLWebhook = async (ghlApiKey: string, franchiseCity: string) => {
  const response = await fetch('https://services.leadconnectorhq.com/workflows/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ghlApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `Qwikker ${franchiseCity} - Business Signups`,
      trigger: {
        type: 'webhook',
        name: 'Inbound Webhook'
      },
      actions: [{
        type: 'create_contact',
        fields: {
          // All the field mappings above
        }
      }]
    })
  })
  
  const webhook = await response.json()
  return webhook.webhookUrl
}
```

---

## 📱 FRANCHISE ONBOARDING FLOW

### Current Process:
1. **Franchise owner applies**
2. **You manually create GHL workflow**
3. **You copy webhook URL**
4. **You add to franchise setup**

### Automated Process:
1. **Franchise owner provides GHL API key**
2. **You click "Setup Franchise"**
3. **System auto-creates GHL workflow**
4. **System auto-configures all field mappings**
5. **System auto-saves webhook URL**
6. **Done in 30 seconds!**

---

## 🎯 IMMEDIATE SOLUTION (Manual but Fast)

### For Right Now:
1. **Create the template workflow once** (30 minutes)
2. **For each franchise**: Duplicate → Rename → Copy URL (2 minutes)
3. **Use franchise setup form** to save the URL

### Template Workflow Settings:
- **Name**: "Qwikker Franchise Template"
- **Trigger**: Inbound Webhook
- **Action**: Create Contact
- **Field Mappings**: Copy/paste from above
- **Notifications**: Optional Slack integration

---

## 💡 PRO TIPS

### Make It Even Easier:
1. **Create custom fields** in GHL for Qwikker-specific data
2. **Set up tags** like "Qwikker-[City]" automatically
3. **Create pipelines** for each franchise city
4. **Add automated follow-ups** for incomplete signups

### Quality Control:
1. **Test webhook** before going live
2. **Send test data** to verify field mappings
3. **Check contact creation** works properly
4. **Verify Slack notifications** (if used)

---

## 🚀 NEXT LEVEL: WHITE-LABEL CRM SETUP

### Ultimate Solution:
Instead of franchise owners needing their own GHL:
1. **You provide them with a CRM login**
2. **Each franchise gets their own GHL sub-account**
3. **You manage all the technical setup**
4. **They just focus on running their business**

This way you control EVERYTHING and can standardize the entire process!
