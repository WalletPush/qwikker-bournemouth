# GoHighLevel Webhook Separation Guide

## Problem
The current GHL webhook triggers Slack notifications for both:
- ✅ **New signups** (should notify `qwikkerbournemouthsubmissions`)
- ❌ **File updates** (should NOT notify, only update contact data)

## Quick Fix (Currently Active)
File updates are temporarily **not synced to GHL** to prevent false notifications.

## Proper Solution: Separate Webhooks

### Step 1: Create a Second GHL Webhook
1. **Go to GHL Settings** → Automations → Webhooks
2. **Create new webhook** for file updates
3. **Configure it to:**
   - ✅ Update contact information
   - ❌ NOT send Slack notifications
   - ❌ NOT trigger signup workflows

### Step 2: Update Environment Variables
Add the new webhook URL to your `.env.local`:

```bash
# Existing webhook (for signups - keeps current behavior)
NEXT_PUBLIC_GHL_SIGNUP_WEBHOOK_URL=https://services.leadconnectorhq.com/hooks/IkBldqzvQG4XkoSxkCq8/webhook-trigger/582275ed-27fe-4374-808b-9f8403f820e3

# New webhook (for updates - no notifications)
NEXT_PUBLIC_GHL_UPDATE_WEBHOOK_URL=https://services.leadconnectorhq.com/hooks/YOUR_NEW_WEBHOOK_HERE
```

### Step 3: Enable GHL Sync for File Updates
Once you have the separate webhook, uncomment this line in `lib/actions/file-actions.ts`:

```typescript
// Currently disabled:
// syncFileUpdateWithGHL(data, fileType, fileUrl).catch(error => 

// Enable when you have separate webhook:
syncFileUpdateWithGHL(data, fileType, fileUrl).catch(error => 
  console.error('GHL sync failed (non-critical):', error)
),
```

## Webhook Data Structure

### Signup Webhook (Current)
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@example.com",
  "businessName": "Mario's Pizzeria",
  "logo_url": "https://cloudinary.com/...",
  // ... other signup data
}
```

### Update Webhook (New)
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com", 
  "businessName": "Mario's Pizzeria",
  "logo_url": "https://cloudinary.com/NEW_LOGO_URL",
  
  // Special flags for filtering:
  "isFileUpdate": true,
  "updateType": "file_upload", 
  "skipSignupNotification": true,
  "updatedField": "logo"
}
```

## GHL Workflow Configuration

### Signup Workflow (Keep Current)
- **Trigger**: Original webhook
- **Actions**: 
  - Create/update contact
  - Send Slack notification to `qwikkerbournemouthsubmissions`
  - Run signup automation

### Update Workflow (New)
- **Trigger**: New update webhook  
- **Filter**: Only process if `isFileUpdate` is `true`
- **Actions**:
  - Update contact information ONLY
  - NO Slack notifications
  - NO signup automation

## Benefits
- ✅ **File updates sync to GHL** (contact data stays current)
- ✅ **No false signup notifications**
- ✅ **Proper separation of concerns**
- ✅ **Slack notifications only in correct channels**

## Current Status
- 🟡 **Quick fix active**: File updates don't sync to GHL
- 🔴 **Proper solution**: Requires GHL webhook setup
- ✅ **Slack notifications**: Working correctly in `#business-file-management`
