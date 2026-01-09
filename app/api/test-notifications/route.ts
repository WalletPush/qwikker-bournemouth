import { NextRequest, NextResponse } from 'next/server'
import { sendCitySlackNotification } from '@/lib/utils/dynamic-notifications'

/**
 * Test endpoint for Slack notifications
 * Usage: GET /api/test-notifications?city=bournemouth
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city') || 'bournemouth'

    console.log(`\n🧪 ===== TESTING SLACK NOTIFICATIONS FOR ${city.toUpperCase()} =====\n`)

    const result = await sendCitySlackNotification({
      title: '🧪 Test Notification',
      message: `This is a test notification from Qwikker.\n\nIf you're seeing this in Slack, your notifications are working! 🎉\n\n**Test Details:**\n• City: ${city}\n• Timestamp: ${new Date().toLocaleString()}\n• Source: Test API`,
      city: city,
      type: 'info',
      data: { test: true }
    })

    console.log(`\n🧪 ===== TEST RESULT =====`)
    console.log(JSON.stringify(result, null, 2))
    console.log(`========================\n`)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `✅ Slack notification sent successfully to ${city}!`,
        details: result
      })
    } else {
      return NextResponse.json({
        success: false,
        message: `❌ Slack notification failed for ${city}`,
        error: result.error,
        troubleshooting: {
          step1: `Check if ${city.toUpperCase()}_SLACK_WEBHOOK_URL is set in your environment`,
          step2: `Or set BOURNEMOUTH_SLACK_WEBHOOK_URL in Supabase dashboard`,
          step3: `Environment variable format: BOURNEMOUTH_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL`
        }
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('❌ Test notification error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

