# Slack Webhook Setup Guide

## Quick Setup for QWIKKER Notifications

### Step 1: Create Slack App
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Name your app (e.g., "QWIKKER Notifications")
5. Select your workspace

### Step 2: Create Business Updates Channel
1. **Create a dedicated channel** in Slack called `#business-file-management` (or your preferred name)
2. Set the channel topic to: "QWIKKER business updates and file uploads that may require knowledge base updates"

### Step 3: Enable Incoming Webhooks
1. In your app settings, go to **"Incoming Webhooks"**
2. Toggle **"Activate Incoming Webhooks"** to **On**
3. Click **"Add New Webhook to Workspace"**
4. Choose your `#business-file-management` channel
5. Click **"Allow"**

### Step 4: Copy Webhook URL
1. Copy the webhook URL (starts with `https://hooks.slack.com/services/...`)
2. Add it to your `.env.local` file:

```bash
NEXT_PUBLIC_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Step 5: Restart Development Server
```bash
# Stop the current server (Ctrl+C)
# Then restart
pnpm dev
```

### Step 6: Test the Integration
1. Go to `http://localhost:3001/dashboard/files`
2. Upload a test file (logo, menu, or offer image)
3. Check your Slack channel for the notification

## Expected Notification Format

You should see a clean, concise message like this:

```
🏢 John Doe (Mario's Pizzeria) uploaded a new business logo
View File • Knowledge base may need updating
```

Or for other actions:
```
🤫 Sarah Johnson (The Coffee House) added a secret menu item: Lavender Latte
"A unique blend with locally sourced lavender" • Knowledge base update recommended
```

```
🎯 Mike Wilson (Wilson's Gym) created a new offer: New Member Special
Value: 50% off first month • Knowledge base update recommended
```

## Troubleshooting

### No Notifications Received
- Check that `NEXT_PUBLIC_SLACK_WEBHOOK_URL` is set correctly
- Verify the webhook URL is active in Slack
- Check browser console for any errors
- Restart the development server after adding the env var

### Webhook URL Not Working
- Regenerate the webhook URL in Slack
- Make sure the Slack app has permissions for the channel
- Test the webhook URL directly with curl:

```bash
curl -X POST -H 'Content-type: application/json' \
--data '{"text":"Test message"}' \
YOUR_WEBHOOK_URL
```

### Notifications Missing Information
- Check that user profiles have complete business information
- Verify file uploads are completing successfully
- Check server logs for any errors in the notification function

## Channel Recommendations

### Recommended Channel:
- `#business-file-management` - Focused on knowledge base updates (recommended)

### Alternative Channel Names:
- `#qwikker-knowledge-base` - Content requiring KB updates  
- `#business-updates` - All business-related notifications
- `#kb-alerts` - Knowledge base update alerts

### Channel Settings:
- **Public channel** - So team members can join
- **Notifications enabled** - Don't miss important updates
- **Pin webhook info** - Easy reference for team

## Security Notes

- Keep webhook URLs private - they allow posting to your Slack
- Use environment variables, never commit webhook URLs to code
- Consider using separate webhooks for dev/staging/production
- Regularly rotate webhook URLs for security

## Testing Commands

Test the webhook directly:
```bash
# Test basic connectivity
curl -X POST -H 'Content-type: application/json' \
--data '{"text":"QWIKKER webhook test"}' \
$NEXT_PUBLIC_SLACK_WEBHOOK_URL

# Test rich message format
curl -X POST -H 'Content-type: application/json' \
--data '{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn", 
        "text": "🏢 *Test notification* from QWIKKER setup"
      }
    }
  ]
}' \
$NEXT_PUBLIC_SLACK_WEBHOOK_URL
```

## Next Steps

Once Slack notifications are working:
1. **Monitor notifications** during testing
2. **Adjust channel settings** as needed
3. **Add team members** to the notification channel
4. **Set up mobile notifications** in Slack app
5. **Create notification workflow** for responding to updates

The system is now ready to keep you informed about all file uploads and business updates that may require knowledge base maintenance! 🎉
