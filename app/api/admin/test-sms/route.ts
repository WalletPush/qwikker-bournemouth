import { NextRequest, NextResponse } from 'next/server'

/**
 * Test SMS endpoint for franchise setup wizard
 * POST /api/admin/test-sms
 * Body: { city, phoneNumber, twilioAccountSid, twilioAuthToken, twilioMessagingServiceSid }
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      city, 
      phoneNumber, 
      twilioAccountSid, 
      twilioAuthToken, 
      twilioMessagingServiceSid 
    } = await request.json()
    
    // Validate required fields
    if (!twilioAccountSid || !twilioAuthToken || !twilioMessagingServiceSid || !phoneNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields. Please provide all Twilio credentials and a phone number.' 
      }, { status: 400 })
    }
    
    // Validate phone number format (E.164)
    if (!phoneNumber.startsWith('+')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number must be in E.164 format (e.g., +447123456789)' 
      }, { status: 400 })
    }
    
    // Test send using provided credentials
    const twilio = await import('twilio')
    const client = twilio.default(twilioAccountSid, twilioAuthToken)
    
    const testMessage = `Test message from QWIKKER ${city || 'Admin'}. Your SMS notifications are configured correctly! Reply STOP to unsubscribe.`
    
    const message = await client.messages.create({
      messagingServiceSid: twilioMessagingServiceSid,
      to: phoneNumber,
      body: testMessage
    })
    
    console.log(`✅ Test SMS sent to ${phoneNumber}: SID ${message.sid}`)
    
    return NextResponse.json({
      success: true,
      messageSid: message.sid,
      to: phoneNumber,
      status: message.status
    })
  } catch (error: any) {
    console.error('❌ Test SMS error:', error)
    
    // Provide helpful error messages
    let errorMessage = 'Failed to send test SMS'
    
    if (error.code === 20003) {
      errorMessage = 'Invalid Twilio credentials. Please check your Account SID and Auth Token.'
    } else if (error.code === 21211) {
      errorMessage = 'Invalid phone number. Please use E.164 format (e.g., +447123456789)'
    } else if (error.code === 21608) {
      errorMessage = 'Messaging Service SID not found. Please check your Messaging Service SID.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      code: error.code || null
    }, { status: 500 })
  }
}

