#!/bin/bash

# 📧 NOTIFICATION SETUP SCRIPT
# Configure Slack/email notifications for database monitoring

echo "📧 Setting up notifications for database monitoring..."
echo ""

# Check if .env exists
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local for notification settings..."
    touch .env.local
fi

echo "NOTIFICATION SETUP OPTIONS:"
echo "=========================="
echo "1. Slack notifications (recommended)"
echo "2. Email notifications"
echo "3. Both Slack and email"
echo "4. Skip notifications (logs only)"
echo ""

read -p "Choose option (1-4): " choice

case $choice in
    1|3)
        echo ""
        echo "SLACK WEBHOOK SETUP:"
        echo "==================="
        echo "1. Go to https://api.slack.com/apps"
        echo "2. Create new app or use existing"
        echo "3. Go to 'Incoming Webhooks'"
        echo "4. Create webhook for your channel (e.g., #database-alerts)"
        echo "5. Copy the webhook URL"
        echo ""
        read -p "Enter Slack webhook URL: " slack_webhook
        
        # Add to .env.local
        echo "" >> .env.local
        echo "# Database notification settings" >> .env.local
        echo "SLACK_WEBHOOK_URL=\"$slack_webhook\"" >> .env.local
        echo "NOTIFICATION_CHANNEL=\"#database-alerts\"" >> .env.local
        
        echo "✅ Slack webhook configured!"
        ;;
esac

case $choice in
    2|3)
        echo ""
        echo "EMAIL NOTIFICATION SETUP:"
        echo "========================"
        echo "Enter email addresses to notify (comma-separated):"
        read -p "Admin emails: " admin_emails
        
        # Add to .env.local
        echo "ADMIN_EMAILS=\"$admin_emails\"" >> .env.local
        echo "EMAIL_FROM=\"database-monitor@qwikker.com\"" >> .env.local
        
        echo "✅ Email notifications configured!"
        echo "⚠️  Note: You'll need to configure an email service (Resend, SendGrid, etc.)"
        ;;
esac

# Create notification test script
cat > scripts/test-notifications.sh << 'EOF'
#!/bin/bash

# Test notification system
echo "🧪 Testing notification system..."

# Load environment variables
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Test Slack notification
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    echo "📱 Testing Slack notification..."
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d '{
            "text": "🧪 Database Monitoring Test",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*🧪 Database Monitoring System Test*\n\nThis is a test notification from your Qwikker database monitoring system.\n\n*Time:* '$(date)'\n*Status:* ✅ System operational\n*Next backup:* Tonight at 2 AM"
                    }
                }
            ]
        }'
    
    if [ $? -eq 0 ]; then
        echo "✅ Slack notification sent successfully!"
    else
        echo "❌ Slack notification failed"
    fi
fi

# Test email notification (placeholder)
if [ ! -z "$ADMIN_EMAILS" ]; then
    echo "📧 Email notification configured for: $ADMIN_EMAILS"
    echo "⚠️  Email testing requires email service setup"
fi

echo ""
echo "🎉 Notification test completed!"
echo "Check your Slack channel for the test message."
EOF

chmod +x scripts/test-notifications.sh

echo ""
echo "🎉 NOTIFICATION SETUP COMPLETE!"
echo "==============================="
echo ""
echo "✅ Configuration saved to .env.local"
echo "✅ Test script created: scripts/test-notifications.sh"
echo ""
echo "NEXT STEPS:"
echo "1. Run: ./scripts/test-notifications.sh"
echo "2. Check your Slack channel for test message"
echo "3. Notifications will now work with backup/monitoring scripts"
echo ""
echo "WHAT YOU'LL GET NOTIFIED ABOUT:"
echo "• ✅ Daily backup success/failure"
echo "• 🚨 Database health alerts"
echo "• ⚠️  Performance issues"
echo "• 🔒 Security concerns"
echo "• 📊 Weekly summary reports"

