# 📱 Get Slack Notifications on Your Lock Screen

## Step 1: Create New Webhook (Fresh Start)

1. Go to: **https://api.slack.com/apps**
2. Click **"Create New App"** → **"From scratch"**
3. Name: **"Qwikker Bournemouth Alerts"**
4. Select your workspace
5. Click **"Incoming Webhooks"** → Toggle **ON**
6. Click **"Add New Webhook to Workspace"**
7. **IMPORTANT:** Choose your `#all-qwikker-bournemouth` channel
8. Click **"Allow"**
9. **Copy the new webhook URL**

---

## Step 2: Configure Slack Mobile Notifications

### On Your iPhone/Android:

1. Open **Slack app** → Go to your workspace
2. Find `#all-qwikker-bournemouth` channel
3. Tap the **channel name** at the top
4. Scroll down to **"Notifications"**
5. Set to: **"All new messages"**
6. Make sure **"Mobile push notifications"** is enabled
7. Turn OFF **"Mute"** if it's on

### On Desktop Slack (to verify):

1. Right-click `#all-qwikker-bournemouth` channel
2. Click **"Change notifications"**
3. Select **"All new messages"**
4. Click **"Done"**

---

## Step 3: Update Webhook in Supabase

1. Go to: **https://supabase.com/dashboard**
2. Select your project
3. **Settings** → **Edge Functions** → **Environment Variables**
4. Find `BOURNEMOUTH_SLACK_WEBHOOK_URL`
5. **Update** with your new webhook URL
6. Click **"Save"**

---

## Step 4: Test It!

```bash
# In your terminal:
curl "http://localhost:3001/api/test-notifications?city=bournemouth"
```

You should see:
- ✅ Success message in terminal
- 🎉 Notification in Slack desktop
- 📱 **PUSH NOTIFICATION ON YOUR PHONE!**

If no push notification:
- Check your phone's **Slack app notification settings** (in iOS/Android Settings → Notifications → Slack)
- Make sure Slack has **permission to send notifications**
- Make sure Slack is **logged in** on your phone
- Try sending a regular message in the channel to test if ANY notifications work

---

## Step 5: Test with Real Secret Menu Item

1. Log into **Ember & Oak** dashboard: http://localhost:3001/dashboard
2. Go to **Secret Menu**
3. Create a new item
4. **Watch your phone** for the notification! 📱🔔

Expected notification:
```
🚨 BOURNEMOUTH - 🤫 New Secret Menu Item: [Item Name]

🏙️ Bournemouth Alert
🤫 New Secret Menu Item: [Item Name]
Ember & Oak Bistro has submitted a new secret menu item for admin approval.

**Item Details:**
• Name: [Item Name]
• Description: ...
• Price: ...

🔗 View in admin: https://app.qwikker.com/admin?tab=applications
```

---

## Troubleshooting

### "Still no push notification on my phone"

**Check these:**

1. **Slack app is installed** and logged in on your phone
2. **Phone notification permissions:**
   - iOS: Settings → Notifications → Slack → Allow Notifications
   - Android: Settings → Apps → Slack → Notifications → Allowed
3. **Do Not Disturb is OFF**
4. **Slack workspace notifications:**
   - Tap your **profile picture** in Slack
   - Go to **Notifications**
   - Make sure **"Notify me about"** includes **"All new messages"** or at least **"Direct messages, mentions & keywords"**
5. **Channel-specific settings:**
   - In `#all-qwikker-bournemouth`, tap channel name
   - Notifications should be **"All new messages"** not "Nothing"

### "Notifications work on desktop but not phone"

- Force close and reopen Slack app
- Make sure you're connected to internet (WiFi or cellular)
- Try logging out and back in to Slack on your phone

### "I want @mention notifications"

If you want guaranteed push notifications, I can add `@here` or `@channel` to the messages. Let me know and I'll update the code!

---

## What Notifications You'll Get

### 🤫 Secret Menu Items
When a business submits a secret menu item

### 💰 Offers  
When a business submits a new offer

### 🏢 Business Registrations
When a new business completes onboarding (coming soon)

### ✅ Claim Requests
When someone claims a business listing (coming soon)

---

## Pro Tips

- **Create a separate channel** just for critical alerts if #all-qwikker-bournemouth gets too noisy
- **Use Slack notification schedules** to only get notified during business hours
- **Slack threads** keep conversations organized without spamming notifications

Let me know if you still don't get push notifications and I'll add `@here` mentions to guarantee them!

