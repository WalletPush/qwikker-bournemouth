import { NextRequest, NextResponse } from 'next/server'

/**
 * Test Slack integration for Bournemouth franchise
 * GET /api/test-slack-bournemouth
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Bournemouth Slack integration...')

    // Test the existing notification system
    const { sendCitySlackNotification } = await import('@/lib/utils/dynamic-notifications')
    
    const testNotification = {
      title: 'Test Notification - Bournemouth',
      message: 'This is a test notification to verify Slack integration is working for the Bournemouth franchise. If you see this message, the integration is working correctly! 🎉',
      city: 'bournemouth',
      type: 'info' as const,
      data: { 
        test: true,
        timestamp: new Date().toISOString(),
        source: 'manual_test'
      }
    }

    const result = await sendCitySlackNotification(testNotification)

    if (result.success) {
      console.log('✅ Bournemouth Slack test notification sent successfully')
      return NextResponse.json({
        success: true,
        message: 'Slack notification sent successfully to Bournemouth channel',
        result
      })
    } else {
      console.error('❌ Bournemouth Slack test failed:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error || 'Unknown error',
        help: {
          message: 'Slack webhook not configured or invalid',
          steps: [
            '1. Create a Slack channel (e.g., #qwikker-bournemouth)',
            '2. Go to https://api.slack.com/apps',
            '3. Create a new app or use existing',
            '4. Enable "Incoming Webhooks"',
            '5. Add webhook to your channel',
            '6. Copy the webhook URL',
            '7. Add to .env.local: BOURNEMOUTH_SLACK_WEBHOOK_URL="your-webhook-url"'
          ]
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Slack test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      help: {
        message: 'Error testing Slack integration',
        commonIssues: [
          'Webhook URL is invalid or expired',
          'Slack app permissions are insufficient', 
          'Network connectivity issues',
          'Environment variables not loaded'
        ]
      }
    }, { status: 500 })
  }
}

/**
 * Update Slack webhook for Bournemouth (for testing new webhooks)
 * POST /api/test-slack-bournemouth
 */
export async function POST(request: NextRequest) {
  try {
    const { webhookUrl } = await request.json()
    
    if (!webhookUrl) {
      return NextResponse.json({
        success: false,
        error: 'Webhook URL is required'
      }, { status: 400 })
    }

    // Test the provided webhook URL directly
    const testMessage = {
      text: '🧪 Webhook Test - Bournemouth',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*🧪 Webhook Test - Bournemouth*\n\nThis is a direct webhook test. If you see this message, your webhook URL is working correctly!\n\n*Time:* ' + new Date().toLocaleString()
          }
        }
      ]
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook test successful! Check your Slack channel.',
      instructions: {
        nextSteps: [
          'If you saw the test message in Slack, the webhook is working',
          'Add this to your .env.local file:',
          `BOURNEMOUTH_SLACK_WEBHOOK_URL="${webhookUrl}"`,
          'Restart your development server',
          'Test again with GET /api/test-slack-bournemouth'
        ]
      }
    })

  } catch (error) {
    console.error('❌ Direct webhook test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: {
        checkList: [
          'Verify the webhook URL is correct and complete',
          'Ensure the Slack app has permission to post to the channel',
          'Check if the webhook URL has expired',
          'Verify the channel exists and the app is added to it'
        ]
      }
    }, { status: 500 })
  }
}
