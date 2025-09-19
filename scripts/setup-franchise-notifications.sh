#!/bin/bash

# 🏢 FRANCHISE-SCALE NOTIFICATION SETUP
# Multi-channel system designed for 26+ franchises

echo "🏢 QWIKKER FRANCHISE NOTIFICATION SETUP"
echo "======================================="
echo ""
echo "🚀 Setting up enterprise-grade notifications for franchise scale"
echo "📊 Designed for 26 franchises with 1,000+ businesses"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    touch .env.local
fi

echo "🎯 FRANCHISE CHANNEL STRATEGY"
echo "============================="
echo ""
echo "We'll create 6 specialized channels for different audiences:"
echo ""
echo "📱 TECHNICAL TEAM CHANNELS:"
echo "  🚨 #qwikker-critical     → Database outages, data loss, security breaches"
echo "  ⚙️ #qwikker-operations   → Daily backups, performance, system maintenance"  
echo "  🔒 #qwikker-security     → Security alerts, suspicious activity, compliance"
echo ""
echo "📱 BUSINESS TEAM CHANNELS:"
echo "  📈 #qwikker-growth       → New signups, city performance, conversion metrics"
echo "  🎉 #qwikker-milestones   → Major achievements, franchise launches, celebrations"
echo "  📊 #qwikker-reports      → Weekly summaries, monthly reports, executive updates"
echo ""

read -p "Ready to set up franchise-scale notifications? (y/N): " confirm

if [[ $confirm != [Yy] ]]; then
    echo "Setup cancelled."
    exit 0
fi

echo ""
echo "🏗️ STEP 1: CREATE SLACK CHANNELS"
echo "================================="
echo ""
echo "Please create these 6 channels in your Slack workspace:"
echo ""
echo "TECHNICAL CHANNELS (for your dev team):"
echo "1. Create: #qwikker-critical"
echo "   Purpose: CRITICAL ALERTS ONLY - wake up the team"
echo "   Members: CTO, Lead Developer, DevOps team"
echo ""
echo "2. Create: #qwikker-operations"  
echo "   Purpose: Daily system operations and maintenance"
echo "   Members: Development team, system administrators"
echo ""
echo "3. Create: #qwikker-security"
echo "   Purpose: Security monitoring and compliance alerts"
echo "   Members: Security team, senior developers"
echo ""
echo "BUSINESS CHANNELS (for franchise/executive team):"
echo "4. Create: #qwikker-growth"
echo "   Purpose: Business growth tracking and metrics"
echo "   Members: CEO, CMO, franchise managers, growth team"
echo ""
echo "5. Create: #qwikker-milestones"
echo "   Purpose: Celebrate achievements and major milestones"
echo "   Members: Executive team, all franchise owners"
echo ""
echo "6. Create: #qwikker-reports"
echo "   Purpose: Weekly/monthly executive reporting"
echo "   Members: C-suite, board members, senior management"
echo ""

read -p "Press ENTER when you've created all 6 channels..."

echo ""
echo "🔗 STEP 2: CONFIGURE WEBHOOK URLS"
echo "=================================="
echo ""
echo "For each channel, you need to create a webhook:"
echo "1. Go to https://api.slack.com/apps"
echo "2. Create new app or use existing Qwikker app"
echo "3. Go to 'Incoming Webhooks'"
echo "4. Click 'Add New Webhook to Workspace'"
echo "5. Select the channel and authorize"
echo "6. Copy the webhook URL"
echo ""
echo "Repeat this process for all 6 channels."
echo ""

read -p "Press ENTER when you're ready to enter webhook URLs..."

echo ""
echo "Enter webhook URLs for each channel:"
echo ""

# Technical channels
echo "TECHNICAL TEAM CHANNELS:"
read -p "🚨 #qwikker-critical webhook URL: " critical_webhook
read -p "⚙️ #qwikker-operations webhook URL: " operations_webhook
read -p "🔒 #qwikker-security webhook URL: " security_webhook

echo ""
echo "BUSINESS TEAM CHANNELS:"
read -p "📈 #qwikker-growth webhook URL: " growth_webhook
read -p "🎉 #qwikker-milestones webhook URL: " milestones_webhook
read -p "📊 #qwikker-reports webhook URL: " reports_webhook

# Add to .env.local
echo "" >> .env.local
echo "# Franchise-scale Slack notification configuration" >> .env.local
echo "# Generated on $(date)" >> .env.local
echo "" >> .env.local
echo "# Enable franchise notification system" >> .env.local
echo "FRANCHISE_NOTIFICATIONS_ENABLED=true" >> .env.local
echo "" >> .env.local
echo "# Technical team channels" >> .env.local
echo "SLACK_CRITICAL_WEBHOOK=\"$critical_webhook\"" >> .env.local
echo "SLACK_OPERATIONS_WEBHOOK=\"$operations_webhook\"" >> .env.local
echo "SLACK_SECURITY_WEBHOOK=\"$security_webhook\"" >> .env.local
echo "" >> .env.local
echo "# Business team channels" >> .env.local
echo "SLACK_GROWTH_WEBHOOK=\"$growth_webhook\"" >> .env.local
echo "SLACK_MILESTONES_WEBHOOK=\"$milestones_webhook\"" >> .env.local
echo "SLACK_REPORTS_WEBHOOK=\"$reports_webhook\"" >> .env.local

# Create comprehensive test script
cat > scripts/test-franchise-notifications.sh << 'EOF'
#!/bin/bash

echo "🧪 TESTING FRANCHISE NOTIFICATION SYSTEM"
echo "========================================"
echo ""

# Load environment variables
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

if [ "$FRANCHISE_NOTIFICATIONS_ENABLED" != "true" ]; then
    echo "❌ Franchise notifications not enabled in .env.local"
    exit 1
fi

echo "Testing all 6 franchise channels..."
echo ""

# Test critical channel
echo "🚨 Testing CRITICAL channel..."
if [ ! -z "$SLACK_CRITICAL_WEBHOOK" ]; then
    curl -X POST "$SLACK_CRITICAL_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d '{
            "text": "🧪 CRITICAL CHANNEL TEST - FRANCHISE SCALE",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*🚨 CRITICAL CHANNEL TEST*\n\n*Audience:* Technical Team (CTO, Lead Dev, DevOps)\n*Purpose:* EMERGENCY ALERTS ONLY\n\n*This channel receives:*\n• Database outages affecting all franchises\n• Massive data loss incidents\n• Security breaches\n• System-wide failures\n\n*Response:* Immediate action required\n*Time:* '$(date)'"
                    }
                }
            ]
        }' > /dev/null 2>&1
    echo "✅ Critical channel test sent"
else
    echo "❌ Critical webhook not configured"
fi

sleep 2

# Test operations channel
echo "⚙️ Testing OPERATIONS channel..."
if [ ! -z "$SLACK_OPERATIONS_WEBHOOK" ]; then
    curl -X POST "$SLACK_OPERATIONS_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d '{
            "text": "🧪 OPERATIONS CHANNEL TEST - FRANCHISE SCALE",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*⚙️ OPERATIONS CHANNEL TEST*\n\n*Audience:* Development Team\n*Purpose:* Daily system operations\n\n*This channel receives:*\n• Daily backup status (26 cities)\n• Performance alerts\n• System maintenance notifications\n• Database health checks\n\n*Quiet Hours:* 10 PM - 8 AM\n*Time:* '$(date)'"
                    }
                }
            ]
        }' > /dev/null 2>&1
    echo "✅ Operations channel test sent"
fi

sleep 2

# Test security channel
echo "🔒 Testing SECURITY channel..."
if [ ! -z "$SLACK_SECURITY_WEBHOOK" ]; then
    curl -X POST "$SLACK_SECURITY_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d '{
            "text": "🧪 SECURITY CHANNEL TEST - FRANCHISE SCALE",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*🔒 SECURITY CHANNEL TEST*\n\n*Audience:* Security Team\n*Purpose:* Security monitoring across all franchises\n\n*This channel receives:*\n• Suspicious login attempts\n• Unauthorized access attempts\n• Security scan results\n• Compliance alerts\n\n*Coverage:* All 26 franchise cities\n*Time:* '$(date)'"
                    }
                }
            ]
        }' > /dev/null 2>&1
    echo "✅ Security channel test sent"
fi

sleep 2

# Test growth channel
echo "📈 Testing GROWTH channel..."
if [ ! -z "$SLACK_GROWTH_WEBHOOK" ]; then
    curl -X POST "$SLACK_GROWTH_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d '{
            "text": "🧪 GROWTH CHANNEL TEST - FRANCHISE SCALE",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*📈 GROWTH CHANNEL TEST*\n\n*Audience:* Business Team (CEO, CMO, Franchise Managers)\n*Purpose:* Track business growth across all franchises\n\n*This channel receives:*\n• New business signups by city\n• Daily/weekly signup summaries\n• City performance comparisons\n• Conversion rate changes\n• User engagement spikes\n\n*Scale:* 26 franchises, 1000+ businesses\n*Time:* '$(date)'"
                    }
                }
            ]
        }' > /dev/null 2>&1
    echo "✅ Growth channel test sent"
fi

sleep 2

# Test milestones channel
echo "🎉 Testing MILESTONES channel..."
if [ ! -z "$SLACK_MILESTONES_WEBHOOK" ]; then
    curl -X POST "$SLACK_MILESTONES_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d '{
            "text": "🧪 MILESTONES CHANNEL TEST - FRANCHISE SCALE",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*🎉 MILESTONES CHANNEL TEST*\n\n*Audience:* Executive Team & Franchise Owners\n*Purpose:* Celebrate major achievements\n\n*This channel receives:*\n• New franchise city launches\n• Major business milestones (100, 250, 500, 1000+ businesses)\n• Platform achievements\n• Team accomplishments\n• Uptime records\n\n*Franchise Coverage:* All 26 cities\n*Time:* '$(date)'"
                    }
                }
            ]
        }' > /dev/null 2>&1
    echo "✅ Milestones channel test sent"
fi

sleep 2

# Test reports channel
echo "📊 Testing REPORTS channel..."
if [ ! -z "$SLACK_REPORTS_WEBHOOK" ]; then
    curl -X POST "$SLACK_REPORTS_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d '{
            "text": "🧪 REPORTS CHANNEL TEST - FRANCHISE SCALE",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*📊 REPORTS CHANNEL TEST*\n\n*Audience:* C-Suite & Board Members\n*Purpose:* Executive reporting and analytics\n\n*This channel receives:*\n• Weekly system health reports\n• Monthly franchise performance summaries\n• Quarterly business reviews\n• Financial performance updates\n• Strategic milestone tracking\n\n*Reporting Scope:* All 26 franchises consolidated\n*Time:* '$(date)'"
                    }
                }
            ]
        }' > /dev/null 2>&1
    echo "✅ Reports channel test sent"
fi

echo ""
echo "🎉 FRANCHISE NOTIFICATION TEST COMPLETE!"
echo "========================================"
echo ""
echo "Check all 6 Slack channels for test messages:"
echo "🚨 #qwikker-critical"
echo "⚙️ #qwikker-operations"  
echo "🔒 #qwikker-security"
echo "📈 #qwikker-growth"
echo "🎉 #qwikker-milestones"
echo "📊 #qwikker-reports"
echo ""
echo "If all messages arrived, your franchise notification system is ready! 🚀"
EOF

chmod +x scripts/test-franchise-notifications.sh

# Create notification volume estimate script
cat > scripts/estimate-notification-volume.sh << 'EOF'
#!/bin/bash

echo "📊 FRANCHISE NOTIFICATION VOLUME ESTIMATE"
echo "========================================="
echo ""
echo "Based on 26 franchises with average 40 businesses each (1,040 total):"
echo ""

echo "📱 DAILY NOTIFICATION VOLUME BY CHANNEL:"
echo "========================================="
echo ""
echo "🚨 #qwikker-critical: 0-1 notifications/day"
echo "   • Hopefully zero!"
echo "   • Only true emergencies affecting all franchises"
echo ""
echo "⚙️ #qwikker-operations: 2-4 notifications/day"
echo "   • 1x daily backup status (success/failure)"
echo "   • 0-2x performance alerts"
echo "   • 0-1x maintenance notifications"
echo ""
echo "🔒 #qwikker-security: 1-3 notifications/day"
echo "   • Security scan results"
echo "   • Suspicious activity alerts (if any)"
echo "   • Compliance updates"
echo ""
echo "📈 #qwikker-growth: 5-15 notifications/day"
echo "   • ~10 new business signups/day across all franchises"
echo "   • 1x daily growth summary"
echo "   • Milestone celebrations (when reached)"
echo ""
echo "🎉 #qwikker-milestones: 1-2 notifications/week"
echo "   • Major milestones (every 25-50 businesses)"
echo "   • New franchise launches"
echo "   • Platform achievements"
echo ""
echo "📊 #qwikker-reports: 1 notification/week"
echo "   • Weekly executive summary (Sundays)"
echo "   • Monthly reports (1st of month)"
echo ""

echo "📊 TOTAL ESTIMATED VOLUME:"
echo "========================="
echo "• Normal day: 8-25 notifications across all channels"
echo "• Busy day: 15-35 notifications"
echo "• Crisis day: 25-50 notifications"
echo ""
echo "📱 PER CHANNEL SUBSCRIPTION RECOMMENDATIONS:"
echo "============================================"
echo "🚨 Critical: All senior team members (immediate push notifications)"
echo "⚙️ Operations: Development team only"
echo "🔒 Security: Security team + senior developers"
echo "📈 Growth: Business team + franchise managers"
echo "🎉 Milestones: Everyone (celebrate wins!)"
echo "📊 Reports: Executives + board members only"
EOF

chmod +x scripts/estimate-notification-volume.sh

echo ""
echo "🎉 FRANCHISE NOTIFICATION SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "✅ Configuration saved to .env.local"
echo "✅ Test script created: scripts/test-franchise-notifications.sh"
echo "✅ Volume estimator: scripts/estimate-notification-volume.sh"
echo ""
echo "🚀 NEXT STEPS:"
echo "1. Run: ./scripts/test-franchise-notifications.sh"
echo "2. Check all 6 Slack channels for test messages"
echo "3. Run: ./scripts/estimate-notification-volume.sh (see expected volume)"
echo ""
echo "📊 FRANCHISE-SCALE BENEFITS:"
echo "• 🎯 Targeted notifications for different teams"
echo "• 🔇 Reduced noise - only relevant alerts per channel"
echo "• 📱 Customizable mobile notifications per channel"
echo "• 👥 Scalable team management as you grow"
echo "• 📈 Executive visibility without operational noise"
echo "• 🏢 Ready for 26 franchises from day one"
echo ""
echo "Your notification system is now enterprise-ready! 🏢🚀"

