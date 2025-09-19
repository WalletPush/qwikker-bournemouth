#!/bin/bash

# 📱 SLACK CHANNELS SETUP SCRIPT
# Choose between single channel or multi-channel notification strategy

echo "📱 QWIKKER SLACK NOTIFICATIONS SETUP"
echo "====================================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    touch .env.local
fi

echo "NOTIFICATION STRATEGY OPTIONS:"
echo "=============================="
echo ""
echo "🎯 OPTION 1: MULTI-CHANNEL (Recommended for teams)"
echo "   • #qwikker-critical    🚨 Database outages, data loss"
echo "   • #qwikker-operations  ⚙️ Daily backups, performance"  
echo "   • #qwikker-business    📈 New signups, milestones"
echo "   • #qwikker-reports     📊 Weekly summaries"
echo ""
echo "🎯 OPTION 2: SINGLE CHANNEL (Simple for solo/small teams)"
echo "   • #qwikker-admin       🔔 All notifications in one place"
echo ""

read -p "Choose strategy (1 for multi-channel, 2 for single): " strategy

case $strategy in
    1)
        echo ""
        echo "🎯 MULTI-CHANNEL SETUP"
        echo "======================"
        echo ""
        echo "You'll need to create 4 Slack channels and get webhook URLs for each."
        echo ""
        echo "STEP 1: Create Slack Channels"
        echo "=============================="
        echo "1. Go to your Slack workspace"
        echo "2. Create these channels:"
        echo "   • #qwikker-critical (for emergencies only)"
        echo "   • #qwikker-operations (for daily operations)"
        echo "   • #qwikker-business (for growth updates)"
        echo "   • #qwikker-reports (for weekly reports)"
        echo ""
        read -p "Press ENTER when you've created all 4 channels..."
        
        echo ""
        echo "STEP 2: Get Webhook URLs"
        echo "========================"
        echo "For each channel, you need to:"
        echo "1. Go to https://api.slack.com/apps"
        echo "2. Create app or use existing"
        echo "3. Go to 'Incoming Webhooks'"
        echo "4. Create webhook for each channel"
        echo "5. Copy webhook URLs"
        echo ""
        
        # Collect webhook URLs
        echo "Enter webhook URLs for each channel:"
        echo ""
        read -p "🚨 #qwikker-critical webhook URL: " critical_webhook
        read -p "⚙️ #qwikker-operations webhook URL: " operations_webhook
        read -p "📈 #qwikker-business webhook URL: " business_webhook
        read -p "📊 #qwikker-reports webhook URL: " reports_webhook
        
        # Add to .env.local
        echo "" >> .env.local
        echo "# Multi-channel Slack configuration" >> .env.local
        echo "SLACK_MULTI_CHANNEL=true" >> .env.local
        echo "SLACK_CRITICAL_WEBHOOK=\"$critical_webhook\"" >> .env.local
        echo "SLACK_OPERATIONS_WEBHOOK=\"$operations_webhook\"" >> .env.local
        echo "SLACK_BUSINESS_WEBHOOK=\"$business_webhook\"" >> .env.local
        echo "SLACK_REPORTS_WEBHOOK=\"$reports_webhook\"" >> .env.local
        
        echo ""
        echo "✅ Multi-channel setup complete!"
        echo ""
        echo "WHAT GOES WHERE:"
        echo "• 🚨 #qwikker-critical: Database outages, data loss, security breaches"
        echo "• ⚙️ #qwikker-operations: Daily backups, performance alerts, system warnings"  
        echo "• 📈 #qwikker-business: New business signups, growth milestones"
        echo "• 📊 #qwikker-reports: Weekly system reports, uptime achievements"
        ;;
        
    2)
        echo ""
        echo "🎯 SINGLE CHANNEL SETUP"
        echo "======================="
        echo ""
        echo "STEP 1: Create Slack Channel"
        echo "============================"
        echo "1. Go to your Slack workspace"
        echo "2. Create channel: #qwikker-admin"
        echo "3. This will receive ALL notifications"
        echo ""
        read -p "Press ENTER when you've created #qwikker-admin..."
        
        echo ""
        echo "STEP 2: Get Webhook URL"
        echo "======================="
        echo "1. Go to https://api.slack.com/apps"
        echo "2. Create app or use existing"  
        echo "3. Go to 'Incoming Webhooks'"
        echo "4. Create webhook for #qwikker-admin"
        echo "5. Copy webhook URL"
        echo ""
        
        read -p "🔔 #qwikker-admin webhook URL: " admin_webhook
        
        # Add to .env.local
        echo "" >> .env.local
        echo "# Single-channel Slack configuration" >> .env.local
        echo "SLACK_MULTI_CHANNEL=false" >> .env.local
        echo "SLACK_WEBHOOK_URL=\"$admin_webhook\"" >> .env.local
        
        echo ""
        echo "✅ Single channel setup complete!"
        echo ""
        echo "WHAT YOU'LL GET:"
        echo "• 🔔 #qwikker-admin: All system notifications in one place"
        echo "• 🤫 Quiet hours: 11 PM - 7 AM (except critical alerts)"
        echo "• 📊 Organized by severity and type"
        ;;
        
    *)
        echo "Invalid option. Please run the script again."
        exit 1
        ;;
esac

# Create test script
cat > scripts/test-slack-channels.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing Slack channel configuration..."

# Load environment variables
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

if [ "$SLACK_MULTI_CHANNEL" = "true" ]; then
    echo "📱 Testing multi-channel setup..."
    
    echo "🚨 Testing critical channel..."
    if [ ! -z "$SLACK_CRITICAL_WEBHOOK" ]; then
        curl -X POST "$SLACK_CRITICAL_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d '{
                "text": "🧪 CRITICAL CHANNEL TEST",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*🚨 CRITICAL CHANNEL TEST*\n\nThis channel will receive:\n• Database outages\n• Data loss alerts\n• Security breaches\n\n*Time:* '$(date)'"
                        }
                    }
                ]
            }' > /dev/null 2>&1
        echo "✅ Critical channel test sent"
    else
        echo "❌ Critical webhook not configured"
    fi
    
    echo "⚙️ Testing operations channel..."
    if [ ! -z "$SLACK_OPERATIONS_WEBHOOK" ]; then
        curl -X POST "$SLACK_OPERATIONS_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d '{
                "text": "🧪 OPERATIONS CHANNEL TEST",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*⚙️ OPERATIONS CHANNEL TEST*\n\nThis channel will receive:\n• Daily backup status\n• Performance alerts\n• System warnings\n\n*Time:* '$(date)'"
                        }
                    }
                ]
            }' > /dev/null 2>&1
        echo "✅ Operations channel test sent"
    fi
    
    echo "📈 Testing business channel..."
    if [ ! -z "$SLACK_BUSINESS_WEBHOOK" ]; then
        curl -X POST "$SLACK_BUSINESS_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d '{
                "text": "🧪 BUSINESS CHANNEL TEST",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*📈 BUSINESS CHANNEL TEST*\n\nThis channel will receive:\n• New business signups\n• Growth milestones\n• User activity updates\n\n*Time:* '$(date)'"
                        }
                    }
                ]
            }' > /dev/null 2>&1
        echo "✅ Business channel test sent"
    fi
    
    echo "📊 Testing reports channel..."
    if [ ! -z "$SLACK_REPORTS_WEBHOOK" ]; then
        curl -X POST "$SLACK_REPORTS_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d '{
                "text": "🧪 REPORTS CHANNEL TEST",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*📊 REPORTS CHANNEL TEST*\n\nThis channel will receive:\n• Weekly system reports\n• Monthly summaries\n• Uptime achievements\n\n*Time:* '$(date)'"
                        }
                    }
                ]
            }' > /dev/null 2>&1
        echo "✅ Reports channel test sent"
    fi
    
else
    echo "📱 Testing single channel setup..."
    
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d '{
                "text": "🧪 ADMIN CHANNEL TEST",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*🔔 ADMIN CHANNEL TEST*\n\nThis channel will receive ALL notifications:\n• 🚨 Critical alerts\n• ⚙️ Operations updates\n• 📈 Business growth\n• 📊 Weekly reports\n\n*Time:* '$(date)'"
                        }
                    }
                ]
            }' > /dev/null 2>&1
        echo "✅ Admin channel test sent"
    else
        echo "❌ Admin webhook not configured"
    fi
fi

echo ""
echo "🎉 Test complete! Check your Slack channels for test messages."
EOF

chmod +x scripts/test-slack-channels.sh

echo ""
echo "🎉 SLACK SETUP COMPLETE!"
echo "========================"
echo ""
echo "✅ Configuration saved to .env.local"
echo "✅ Test script created: scripts/test-slack-channels.sh"
echo ""
echo "NEXT STEPS:"
echo "1. Run: ./scripts/test-slack-channels.sh"
echo "2. Check your Slack channels for test messages"
echo "3. Notifications are now ready to use!"
echo ""

if [ "$strategy" = "1" ]; then
    echo "MULTI-CHANNEL BENEFITS:"
    echo "• 🎯 Easy to prioritize alerts by channel"
    echo "• 🔇 Reduce notification noise"
    echo "• 👥 Different team members can watch different channels"
    echo "• 📱 Mobile notifications can be customized per channel"
else
    echo "SINGLE CHANNEL BENEFITS:"
    echo "• 🎯 Simple setup and management"
    echo "• 👀 Everything in one place"
    echo "• 🔔 Perfect for solo developers or small teams"
    echo "• 📱 One channel to monitor"
fi

