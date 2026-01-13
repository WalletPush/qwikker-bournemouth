/**
 * SMS Verification & Readiness Helpers
 * 
 * This module determines when SMS is truly ready to be offered
 * to users in the claim form. Uses the "verified by real test" approach.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface SmsCapabilities {
  /** Whether SMS opt-in should be shown in claim form */
  sms_opt_in_available: boolean
  
  /** Diagnostic info (for admin use only) */
  debug?: {
    sms_enabled: boolean
    sms_verified: boolean
    sms_provider: string
    has_credentials: boolean
  }
}

export interface SmsConfig {
  sms_enabled: boolean
  sms_provider: string
  sms_verified: boolean
  sms_test_mode: boolean
  twilio_account_sid: string | null
  twilio_auth_token: string | null
  twilio_messaging_service_sid: string | null
  twilio_from_number: string | null
  sms_country_code: string | null
  sms_last_error: string | null
  sms_last_verified_at: string | null
}

/**
 * Get SMS capabilities for a given city (PUBLIC endpoint use)
 * Returns only what's needed to gate claim form UI
 */
export async function getSmsCapabilitiesForCity(city: string): Promise<SmsCapabilities> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('franchise_crm_configs')
    .select('sms_enabled, sms_verified, sms_provider, sms_test_mode')
    .eq('city', city)
    .single()
  
  if (error || !data) {
    return { sms_opt_in_available: false }
  }
  
  // ✅ CRITICAL RULE: Only show SMS opt-in if truly ready
  // (enabled + verified, unless test_mode forces simulated)
  const available = data.sms_enabled && data.sms_verified && !data.sms_test_mode
  
  return {
    sms_opt_in_available: available
  }
}

/**
 * Get full SMS config for a city (ADMIN use only)
 */
export async function getSmsConfigForCity(city: string): Promise<SmsConfig | null> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('franchise_crm_configs')
    .select(`
      sms_enabled,
      sms_provider,
      sms_verified,
      sms_test_mode,
      twilio_account_sid,
      twilio_auth_token,
      twilio_messaging_service_sid,
      twilio_from_number,
      sms_country_code,
      sms_last_error,
      sms_last_verified_at
    `)
    .eq('city', city)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data as SmsConfig
}

/**
 * Check if Twilio credentials are present (basic validation)
 */
export function hasRequiredTwilioCredentials(config: SmsConfig | null): boolean {
  if (!config) return false
  if (config.sms_provider !== 'twilio') return false
  if (!config.twilio_account_sid || !config.twilio_auth_token) return false
  
  // Require EITHER messaging service SID OR from number
  const hasMessagingService = !!config.twilio_messaging_service_sid
  const hasFromNumber = !!config.twilio_from_number
  
  return hasMessagingService || hasFromNumber
}

/**
 * Validate Twilio Account SID format
 */
export function isValidTwilioAccountSid(sid: string | null | undefined): boolean {
  if (!sid) return false
  return /^AC[a-f0-9]{32}$/i.test(sid)
}

/**
 * Validate Twilio Auth Token format (32-char hex)
 */
export function isValidTwilioAuthToken(token: string | null | undefined): boolean {
  if (!token) return false
  return /^[a-f0-9]{32}$/i.test(token)
}

/**
 * Validate Twilio Messaging Service SID format
 */
export function isValidTwilioMessagingServiceSid(sid: string | null | undefined): boolean {
  if (!sid) return false
  return /^MG[a-f0-9]{32}$/i.test(sid)
}

/**
 * Validate phone number format (E.164)
 */
export function isValidE164PhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false
  return /^\+[1-9]\d{1,14}$/.test(phone)
}

/**
 * Get SMS status summary (for admin UI status pill)
 */
export interface SmsStatus {
  status: 'disabled' | 'not_configured' | 'configured_unverified' | 'verified' | 'error'
  label: string
  color: 'gray' | 'amber' | 'green' | 'red'
  description: string
}

export function getSmsStatusSummary(config: SmsConfig | null): SmsStatus {
  if (!config || !config.sms_enabled) {
    return {
      status: 'disabled',
      label: 'Disabled',
      color: 'gray',
      description: 'SMS is optional. Enable if you want transactional claim updates by text.'
    }
  }
  
  if (config.sms_last_error) {
    return {
      status: 'error',
      label: 'Error',
      color: 'red',
      description: `Fix the fields above to enable SMS. Last error: ${config.sms_last_error}`
    }
  }
  
  if (!hasRequiredTwilioCredentials(config)) {
    return {
      status: 'not_configured',
      label: 'Not Configured',
      color: 'amber',
      description: 'Enter your Twilio credentials to enable SMS.'
    }
  }
  
  if (!config.sms_verified) {
    return {
      status: 'configured_unverified',
      label: 'Not Verified',
      color: 'amber',
      description: 'Setup saved, but SMS may require carrier/regulatory approval. Use Simulated Test now, and Real Test when ready.'
    }
  }
  
  return {
    status: 'verified',
    label: 'Verified',
    color: 'green',
    description: 'SMS is ready. Your claim form will show the SMS opt-in checkbox.'
  }
}

/**
 * Update SMS verification status (call after successful real test)
 */
export async function markSmsAsVerified(city: string): Promise<void> {
  const supabase = createAdminClient()
  
  await supabase
    .from('franchise_crm_configs')
    .update({
      sms_verified: true,
      sms_last_verified_at: new Date().toISOString(),
      sms_last_error: null, // Clear any previous error
      sms_updated_at: new Date().toISOString()
    })
    .eq('city', city)
}

/**
 * Update SMS error state (call after failed real test)
 */
export async function markSmsAsError(city: string, error: string): Promise<void> {
  const supabase = createAdminClient()
  
  await supabase
    .from('franchise_crm_configs')
    .update({
      sms_last_error: error,
      sms_updated_at: new Date().toISOString()
    })
    .eq('city', city)
}

/**
 * Log SMS activity (both simulated and real)
 */
export interface SmsLogEntry {
  city: string
  mode: 'simulated' | 'real'
  to_e164?: string
  message: string
  template_name?: string
  provider_message_id?: string
  status: 'simulated' | 'sent' | 'failed'
  error?: string
}

export async function logSmsActivity(entry: SmsLogEntry): Promise<void> {
  const supabase = createAdminClient()
  
  await supabase
    .from('sms_logs')
    .insert({
      city: entry.city,
      mode: entry.mode,
      to_e164: entry.to_e164 || null,
      message: entry.message,
      template_name: entry.template_name || null,
      provider_message_id: entry.provider_message_id || null,
      status: entry.status,
      error: entry.error || null,
      created_at: new Date().toISOString()
    })
}

