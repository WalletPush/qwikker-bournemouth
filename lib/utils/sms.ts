/**
 * SMS Notifications via Twilio
 * Transactional only (claim submitted, claim approved)
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface SMSResult {
  success: boolean
  messageSid?: string
  error?: string
  reason?: string
}

/**
 * Send SMS notification (only if SMS enabled for city and user opted in)
 */
async function sendSMS(
  phoneE164: string,
  message: string,
  city: string
): Promise<SMSResult> {
  try {
    const supabase = createServiceRoleClient()
    
    // Get franchise SMS config
    const { data: config, error: configError } = await supabase
      .from('franchise_crm_configs')
      .select('sms_enabled, twilio_account_sid, twilio_auth_token, twilio_messaging_service_sid, display_name')
      .eq('city', city)
      .single()
    
    if (configError || !config) {
      console.log(`SMS: No config found for city ${city}`)
      return { success: false, reason: 'No franchise config' }
    }
    
    if (!config.sms_enabled) {
      console.log(`SMS: Not enabled for ${city}`)
      return { success: false, reason: 'SMS not enabled' }
    }
    
    if (!config.twilio_account_sid || !config.twilio_auth_token || !config.twilio_messaging_service_sid) {
      console.log(`SMS: Twilio credentials missing for ${city}`)
      return { success: false, reason: 'Twilio credentials missing' }
    }
    
    // Initialize Twilio client
    const twilio = await import('twilio')
    const client = twilio.default(config.twilio_account_sid, config.twilio_auth_token)
    
    // Send SMS using Messaging Service SID
    const twilioMessage = await client.messages.create({
      messagingServiceSid: config.twilio_messaging_service_sid,
      to: phoneE164,
      body: message
    })
    
    console.log(`✅ SMS sent to ${phoneE164} (${city}): SID ${twilioMessage.sid}`)
    
    return {
      success: true,
      messageSid: twilioMessage.sid
    }
  } catch (error: any) {
    console.error('SMS send error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    }
  }
}

/**
 * Send "Claim Submitted" SMS
 */
export async function sendClaimSubmittedSMS(
  phoneE164: string,
  businessName: string,
  city: string
): Promise<SMSResult> {
  const message = `Thanks for claiming ${businessName} on QWIKKER! We'll review your submission and text you when it's approved (usually within 48 hours).`
  
  return sendSMS(phoneE164, message, city)
}

/**
 * Send "Claim Approved" SMS
 */
export async function sendClaimApprovedSMS(
  phoneE164: string,
  firstName: string | null,
  businessName: string,
  city: string
): Promise<SMSResult> {
  const greeting = firstName ? `Hi ${firstName}! ` : ''
  const loginUrl = `https://${city}.qwikker.com/auth/login`
  
  const message = `${greeting}Great news! Your claim for ${businessName} has been approved. Log in to access your dashboard: ${loginUrl}`
  
  return sendSMS(phoneE164, message, city)
}

/**
 * Test SMS (for franchise setup)
 */
export async function sendTestSMS(
  phoneE164: string,
  city: string
): Promise<SMSResult> {
  const message = `Test message from QWIKKER ${city}. Your SMS notifications are working! Reply STOP to unsubscribe.`
  
  return sendSMS(phoneE164, message, city)
}

