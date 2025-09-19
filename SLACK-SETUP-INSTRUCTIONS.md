# 🚨 QWIKKER SLACK SETUP - COMPLETE INSTRUCTIONS

## **CURRENT STATUS: NEEDS IMMEDIATE SETUP**

Your old Slack webhook won't work because you deleted the channels. Here's exactly what you need to do:

---

## **📱 STEP 1: CREATE 4 SLACK CHANNELS**

Create these channels in your Slack workspace:

```
#qwikker-critical     - 🚨 Critical alerts (database outages, security breaches)
#qwikker-operations   - ⚙️ Daily operations (backups, performance warnings)  
#qwikker-business     - 📈 Business growth (new signups, milestones)
#qwikker-reports      - 📊 Weekly/monthly reports and analytics
```

---

## **🔗 STEP 2: CREATE SLACK APP & WEBHOOKS**

1. **Go to**: [api.slack.com/apps](https://api.slack.com/apps)
2. **Click**: "Create New App" → "From scratch"
3. **Name**: "QWIKKER Notifications"
4. **Select**: Your workspace
5. **Go to**: "Incoming Webhooks" → Toggle **ON**
6. **Create 4 webhooks** (one for each channel):
   - Click "Add New Webhook to Workspace"
   - Select channel (#qwikker-critical)
   - Copy the webhook URL
   - Repeat for all 4 channels

---

## **🔧 STEP 3: UPDATE ENVIRONMENT VARIABLES**

Replace the content in your `.env.local` file:

```bash
# 🚨 SLACK NOTIFICATION WEBHOOKS (Replace with your actual webhook URLs)
# Critical alerts - database outages, security breaches, data loss
SLACK_CRITICAL_WEBHOOK=https://hooks.slack.com/services/YOUR_CRITICAL_WEBHOOK_HERE

# Operations - backups, performance, maintenance alerts  
SLACK_OPERATIONS_WEBHOOK=https://hooks.slack.com/services/YOUR_OPERATIONS_WEBHOOK_HERE

# Business growth - signups, milestones, user activity
SLACK_BUSINESS_WEBHOOK=https://hooks.slack.com/services/YOUR_BUSINESS_WEBHOOK_HERE

# Reports - weekly/monthly summaries and analytics
SLACK_REPORTS_WEBHOOK=https://hooks.slack.com/services/YOUR_REPORTS_WEBHOOK_HERE

# Legacy webhook (can be removed once new ones are set up)
NEXT_PUBLIC_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/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
```

---

## **☁️ STEP 4: VERCEL ENVIRONMENT VARIABLES**

**YES - Vercel needs these variables!** Add these 4 variables to your Vercel project:

1. **Go to**: Vercel Dashboard → Your Project → Settings → Environment Variables
2. **Add these 4 variables**:
   ```
   SLACK_CRITICAL_WEBHOOK     = https://hooks.slack.com/services/...
   SLACK_OPERATIONS_WEBHOOK   = https://hooks.slack.com/services/...
   SLACK_BUSINESS_WEBHOOK     = https://hooks.slack.com/services/...
   SLACK_REPORTS_WEBHOOK      = https://hooks.slack.com/services/...
   ```
3. **Set for**: Production, Preview, Development (all environments)

---

## **🧪 STEP 5: TEST THE SETUP**

After updating `.env.local`, restart your dev server:

```bash
# Stop server (Ctrl+C), then restart
pnpm dev
```

**Test URLs:**
- Business signup: `http://localhost:3000/onboarding`
- Admin dashboard: `http://localhost:3000/admin`
- File uploads: `http://localhost:3000/dashboard/files`

---

## **📋 WHAT EACH CHANNEL WILL RECEIVE**

### **🚨 #qwikker-critical**
- Database outages
- Data loss/corruption
- Security breaches
- Backup system failures
- Disaster recovery needs

### **⚙️ #qwikker-operations**  
- Daily backup status
- Performance warnings
- Storage alerts
- System maintenance
- Database slow queries

### **📈 #qwikker-business**
- New business signups
- Business milestones
- User activity spikes
- Revenue milestones
- Feature usage stats

### **📊 #qwikker-reports**
- Weekly summaries
- Monthly reports
- Uptime achievements
- Performance reports
- Security audit results

---

## **✅ COMPLETION CHECKLIST**

- [ ] Created 4 Slack channels
- [ ] Created Slack app "QWIKKER Notifications"  
- [ ] Generated 4 webhook URLs
- [ ] Updated `.env.local` with new webhooks
- [ ] Added webhooks to Vercel environment variables
- [ ] Restarted development server
- [ ] Tested notifications with business signup

**Once complete, all Qwikker notifications will be properly organized and working in production! 🎉**
