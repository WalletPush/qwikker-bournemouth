# 🔔 Slack Notifications Setup for Qwikker

## Quick Setup (5 minutes)

Your Qwikker platform sends Slack notifications for:
- 🤫 New secret menu items submitted
- 💰 New offers submitted  
- 🏢 New business registrations
- ✅ New claim requests
- 📊 Important system alerts

---

## Step 1: Create Slack Incoming Webhook

1. Go to: **https://api.slack.com/apps**
2. Click **"Create New App"** → **"From scratch"**
3. Name it: **"Qwikker Bournemouth"** (or your city name)
4. Select your Slack workspace
5. Click **"Incoming Webhooks"** in the sidebar
6. Toggle **ON** at the top
7. Click **"Add New Webhook to Workspace"**
8. Choose the channel you want notifications to go to (e.g., `#qwikker-bournemouth` or `#qwikker-admin`)
9. Click **"Allow"**
10. **Copy the webhook URL** (looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

---

## Step 2: Add to Supabase Environment Variables

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Project Settings** (gear icon) → **Edge Functions** → **Environment Variables**
4. Add a new variable:
   - **Name**: `BOURNEMOUTH_SLACK_WEBHOOK_URL` (or `YOUR_CITY_SLACK_WEBHOOK_URL`)
   - **Value**: The webhook URL you copied (e.g., `https://hooks.slack.com/services/...`)
5. Click **"Create"**

**IMPORTANT:** The environment variable name must follow this format:
- For Bournemouth: `BOURNEMOUTH_SLACK_WEBHOOK_URL`
- For other cities: `CITY_NAME_SLACK_WEBHOOK_URL` (all uppercase)

---

## Step 3: Test Your Setup

1. Open your terminal and run:
```bash
curl "http://localhost:3000/api/test-notifications?city=bournemouth"
```

OR visit in your browser:
```
http://localhost:3000/api/test-notifications?city=bournemouth
```

2. You should see:
   - ✅ Success message in the browser
   - 🎉 Test notification in your Slack channel
   - Detailed logs in your terminal showing the notification was sent

If it fails, check:
- Is the webhook URL correct?
- Did you restart your dev server after adding the env variable?
- Is the city name correct (lowercase in URL, uppercase in env var)?

---

## Step 4: Deploy to Production (Vercel)

1. Go to **Vercel Dashboard**: https://vercel.com
2. Select your project → **Settings** → **Environment Variables**
3. Add:
   - **Name**: `BOURNEMOUTH_SLACK_WEBHOOK_URL`
   - **Value**: Your webhook URL
   - **Environment**: Select **Production**, **Preview**, and **Development**
4. Click **"Save"**
5. Redeploy your app

---

## What Notifications Will You Receive?

### 🤫 Secret Menu Items
When a business submits a new secret menu item for approval:
```
🤫 New Secret Menu Item: Truffle Burger
Ember & Oak Bistro has submitted a new secret menu item for admin approval.

**Item Details:**
• Name: Truffle Burger
• Description: Wagyu beef with truffle aioli
• Price: £18.50

🔗 View in admin: https://app.qwikker.com/admin?tab=applications
```

### 💰 Offers
When a business submits a new offer:
```
💰 New Offer Submitted: 20% Off Lunch
David's Grill Shack has submitted a new offer for admin approval.

**Offer Details:**
• Value: 20% Off
• Type: Percentage
• Claims: 50

🔗 View in admin: https://app.qwikker.com/admin?tab=applications
```

### 🏢 Business Registrations
When a new business completes onboarding

### ✅ Claim Requests
When someone claims an unclaimed business listing

---

## Troubleshooting

### ❌ "No Slack webhook configured"
- Check the environment variable name matches: `BOURNEMOUTH_SLACK_WEBHOOK_URL`
- Make sure it's set in Supabase Dashboard (for server-side functions)
- Restart your dev server: `Ctrl+C` then `pnpm dev`

### ❌ "Invalid webhook URL"
- Webhook URL must start with `https://hooks.slack.com/services/`
- Don't include any quotes or extra spaces
- Get a fresh webhook URL from Slack if needed

### ❌ Notifications work locally but not in production
- Add the webhook URL to Vercel environment variables
- Redeploy your app after adding the env var

---

## Multi-City Setup

If you're expanding to multiple cities, just repeat the process:

```bash
# .env.local or Supabase Environment Variables
BOURNEMOUTH_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
BRIGHTON_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
MANCHESTER_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

Each city can have its own Slack channel and webhook!

---

## Need Help?

Run the test endpoint and check your logs:
```bash
# Terminal 1: Watch server logs
pnpm dev

# Terminal 2: Test notifications
curl "http://localhost:3000/api/test-notifications?city=bournemouth"
```

Look for logs starting with:
- `🔍 [SLACK]` - Webhook lookup logs
- `📤 [SLACK]` - Sending notification
- `✅ [SLACK]` - Success!
- `❌ [SLACK]` - Error (with details)

