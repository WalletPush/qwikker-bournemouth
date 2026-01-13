import { NextRequest, NextResponse } from 'next/server'
import { getCityFromRequest } from '@/lib/utils/city-detection'
import { 
  getSmsConfigForCity, 
  hasRequiredTwilioCredentials,
  markSmsAsVerified,
  markSmsAsError,
  logSmsActivity,
  isValidE164PhoneNumber
} from '@/lib/utils/sms-verification'
import { SMS_TEMPLATES } from '@/lib/utils/sms'
import twilio from 'twilio'

/**
 * POST /api/admin/sms/test?mode=simulated|real
 * 
 * Simulated Mode:
 * - Always available when sms_enabled=true
 * - Logs the message that would be sent
 * - Returns the message body for preview
 * - Does NOT send real SMS
 * 
 * Real Mode:
 * - Requires valid Twilio credentials
 * - Sends actual SMS via Twilio
 * - On success: marks sms_verified=true
 * - On failure: marks sms_last_error
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Derive city from hostname
    const city = await getCityFromRequest(request.headers)
    
    // Get query params
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') || 'simulated'
    
    if (mode !== 'simulated' && mode !== 'real') {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "simulated" or "real"' },
        { status: 400 }
      )
    }
    
    // Get SMS config for this city
    const config = await getSmsConfigForCity(city)
    
    if (!config || !config.sms_enabled) {
      return NextResponse.json(
        { error: 'SMS is not enabled for this franchise' },
        { status: 400 }
      )
    }
    
    // Parse request body (for real mode, we need phone number)
    const body = await request.json()
    const { to_e164 } = body
    
    // Generate test message using centralized template
    const testMessage = SMS_TEMPLATES.TEST(city)
    
    // =============================
    // SIMULATED MODE
    // =============================
    if (mode === 'simulated') {
      // Log simulated send
      await logSmsActivity({
        city,
        mode: 'simulated',
        to_e164: to_e164 || '(simulated)',
        message: testMessage,
        template_name: 'TEST',
        status: 'simulated'
      })
      
      return NextResponse.json({
        success: true,
        mode: 'simulated',
        message: testMessage,
        info: 'Simulated test runs instantly and does not send a real SMS.'
      })
    }
    
    // =============================
    // REAL MODE
    // =============================
    
    // Validate phone number
    if (!to_e164 || !isValidE164PhoneNumber(to_e164)) {
      return NextResponse.json(
        { error: 'Valid phone number (E.164 format) is required for real SMS test. Example: +447700900123' },
        { status: 400 }
      )
    }
    
    // Validate credentials
    if (!hasRequiredTwilioCredentials(config)) {
      return NextResponse.json(
        { error: 'Twilio credentials are incomplete. Ensure Account SID, Auth Token, and either Messaging Service SID or From Number are configured.' },
        { status: 400 }
      )
    }
    
    // Attempt to send via Twilio
    try {
      const client = twilio(
        config.twilio_account_sid!,
        config.twilio_auth_token!
      )
      
      // Determine "from" - prefer Messaging Service
      const messageOptions: any = {
        body: testMessage,
        to: to_e164
      }
      
      if (config.twilio_messaging_service_sid) {
        messageOptions.messagingServiceSid = config.twilio_messaging_service_sid
      } else if (config.twilio_from_number) {
        messageOptions.from = config.twilio_from_number
      } else {
        throw new Error('No Messaging Service SID or From Number configured')
      }
      
      const message = await client.messages.create(messageOptions)
      
      // ✅ SUCCESS: Mark as verified
      await markSmsAsVerified(city)
      
      // Log successful send
      await logSmsActivity({
        city,
        mode: 'real',
        to_e164,
        message: testMessage,
        template_name: 'TEST',
        provider_message_id: message.sid,
        status: 'sent'
      })
      
      return NextResponse.json({
        success: true,
        mode: 'real',
        message: testMessage,
        provider_message_id: message.sid,
        status: message.status,
        info: '✅ Real SMS sent successfully! Your claim form will now show the SMS opt-in checkbox.',
        sms_verified: true
      })
      
    } catch (twilioError: any) {
      // ❌ TWILIO ERROR: Log and mark error
      const errorMessage = twilioError.message || 'Unknown Twilio error'
      
      await markSmsAsError(city, errorMessage)
      
      await logSmsActivity({
        city,
        mode: 'real',
        to_e164,
        message: testMessage,
        template_name: 'TEST',
        status: 'failed',
        error: errorMessage
      })
      
      console.error('❌ Twilio SMS error:', twilioError)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to send SMS via Twilio',
        details: errorMessage,
        troubleshooting: [
          'Verify your Account SID and Auth Token are correct',
          'Ensure your Messaging Service or From Number is approved for sending',
          'Check if your country requires regulatory approval (Compliance Bundle)',
          'Trial accounts can only send to verified numbers',
          'Check Twilio Console for more details: https://console.twilio.com/'
        ]
      }, { status: 500 })
    }
    
  } catch (error: any) {
    console.error('❌ SMS test error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

