# QWIKKER Slack Notifications System

## Overview

QWIKKER automatically sends Slack notifications to keep you informed about business updates that may require knowledge base updates. This ensures you can maintain accurate and up-to-date information about businesses using the platform.

## Notification Types

### 🎉 **New Business Registration** (Onboarding)
- **Trigger**: User completes the onboarding form
- **Purpose**: Alert about new businesses joining QWIKKER
- **Information Includes**:
  - Business name and owner details
  - Contact information (email, phone)
  - Business type and location
  - Files uploaded during onboarding (logo, menu, offers)
  - Referral source

### 📁 **File Upload Notifications** (Dashboard)
- **Trigger**: User uploads files through Files Management page
- **Purpose**: Alert about new content that may need knowledge base updates
- **Information Includes**:
  - Business name and owner details
  - File type uploaded (Business Logo 🏢, Menu/Price List 📋, Offer Image 🎯)
  - Direct link to view the uploaded file
  - Business context (type, location)
  - Upload timestamp

### 📝 **Profile Update Notifications** (Future)
- **Trigger**: User updates business information through dashboard
- **Purpose**: Alert about changes to business details
- **Information Includes**:
  - Business name and owner details
  - List of updated fields
  - Business context
  - Update timestamp

## File Upload Notifications Detail

When a business uploads a file through the dashboard, you'll receive a structured Slack message:

### **Message Format:**
```
🏢 Knowledge Base Update Required

[Business Name] has uploaded a new [file type]. You may need to update your QWIKKER knowledge base.

Business: [Business Name]
Owner: [First Last]
Email: [email@example.com]
File Type: [Business Logo/Menu/Price List/Offer Image]
Business Type: [restaurant/cafe/etc]
Location: [Town, Postcode]

File URL: [Direct link to view the file]

⏰ Uploaded: [Timestamp] | 📊 Update Type: Dashboard File Upload
```

### **File Type Categories:**

| File Type | Emoji | Knowledge Base Impact |
|-----------|-------|----------------------|
| **Business Logo** | 🏢 | Brand recognition, visual identity |
| **Menu/Price List** | 📋 | Service offerings, pricing, AI recommendations |
| **Offer Images** | 🎯 | Promotional content, special deals |

## Configuration

### **Environment Variables**
The Slack integration requires the following environment variable:

```bash
# .env.local
NEXT_PUBLIC_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### **Slack Webhook Setup**
1. Go to your Slack workspace
2. Create a new Slack App or use existing one
3. Enable Incoming Webhooks
4. Create a webhook for your desired channel
5. Copy the webhook URL to your environment variables

## Technical Implementation

### **Non-Blocking Design**
- Slack notifications are **non-blocking** - they won't fail file uploads if Slack is down
- Notifications run in parallel with GHL sync for optimal performance
- Error handling ensures user experience isn't affected by notification failures

### **Integration Points**

```typescript
// File upload flow with notifications
export async function updateProfileFile(userId, fileType, fileUrl) {
  // 1. Update Supabase profile
  await supabaseAdmin.from('profiles').update(...)
  
  // 2. Parallel external integrations (non-blocking)
  Promise.all([
    syncFileUpdateWithGHL(data, fileType, fileUrl),
    sendFileUploadSlackNotification(data, fileType, fileUrl) // ← New!
  ])
  
  return { success: true }
}
```

### **Message Structure**
Slack notifications use rich Block Kit formatting for better readability:
- **Header Block**: Clear notification type with emoji
- **Section Blocks**: Organized business information
- **Context Block**: Timestamp and metadata
- **Links**: Direct access to uploaded files

## Use Cases

### **Knowledge Base Maintenance**
- **New Menus**: Update AI training data with latest menu items
- **Logo Changes**: Update brand recognition systems
- **Offer Updates**: Keep promotional content current
- **Business Info**: Maintain accurate business profiles

### **Quality Control**
- **File Review**: Check uploaded content for accuracy
- **Data Validation**: Ensure business information is complete
- **Content Moderation**: Review files for appropriateness

### **Customer Support**
- **Proactive Updates**: Update knowledge base before customers notice issues
- **Query Preparation**: Prepare for customer questions about new offerings
- **Accuracy Monitoring**: Track when businesses update their information

## Notification Examples

### **Logo Upload Example:**
```
🏢 Knowledge Base Update Required

The Coffee House has uploaded a new business logo. You may need to update your QWIKKER knowledge base.

Business: The Coffee House
Owner: Sarah Johnson
Email: sarah@coffeehouse.com
File Type: Business Logo
Business Type: cafe
Location: bournemouth, BH1 2AB

File URL: View Business Logo

⏰ Uploaded: 12/15/2025, 2:30:45 PM | 📊 Update Type: Dashboard File Upload
```

### **Menu Upload Example:**
```
📋 Knowledge Base Update Required

Mario's Pizzeria has uploaded a new menu/price list. You may need to update your QWIKKER knowledge base.

Business: Mario's Pizzeria
Owner: Mario Rossi
Email: mario@mariospizza.com
File Type: Menu/Price List
Business Type: restaurant
Location: poole, BH15 3CD

File URL: View Menu/Price List

⏰ Uploaded: 12/15/2025, 3:15:22 PM | 📊 Update Type: Dashboard File Upload
```

## Benefits

### **For QWIKKER Platform**
- **Accurate AI Responses**: Stay current with business offerings
- **Improved Recommendations**: Updated data leads to better customer matches
- **Quality Assurance**: Monitor content quality and completeness

### **For Business Owners**
- **Transparent Process**: Know that updates are being tracked
- **Quality Service**: Confidence that AI has latest information
- **Support Readiness**: QWIKKER team is aware of their updates

### **For Operations Team**
- **Proactive Management**: Address updates before issues arise
- **Efficient Workflow**: Structured notifications with all needed context
- **Audit Trail**: Track when and what businesses update

## Testing

To test the Slack notification system:

1. **Configure Slack webhook** in environment variables
2. **Upload a file** through the Files Management page
3. **Check Slack channel** for notification
4. **Verify file link** works correctly
5. **Confirm business information** is accurate

## Future Enhancements

- **Notification Preferences**: Choose which updates to receive
- **Batch Notifications**: Group multiple updates from same business
- **Integration Metrics**: Track notification delivery and engagement
- **Smart Filtering**: Only notify for significant changes
- **Mobile Notifications**: Push notifications for urgent updates
