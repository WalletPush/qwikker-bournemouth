import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromRequest } from '@/lib/utils/city-detection'

/**
 * Mask a secret value for safe client display
 * Returns: null if empty, masked string if present
 */
function maskSecret(value: string | null | undefined): string | null {
  if (!value || value.trim() === '') return null
  
  // Show first 2-4 chars + last 4 chars for recognizability
  if (value.length <= 12) return '••••••••'
  
  const prefix = value.slice(0, Math.min(4, value.length - 8))
  const suffix = value.slice(-4)
  return `${prefix}••••${suffix}`
}

/**
 * Prepare config for client: mask all secrets
 */
function sanitizeConfigForClient(data: any) {
  if (!data) return null
  
  return {
    // ✅ Public/safe fields (no masking needed)
    city: data.city,
    display_name: data.display_name,
    subdomain: data.subdomain,
    owner_name: data.owner_name,
    owner_email: data.owner_email,
    owner_phone: data.owner_phone,
    contact_address: data.contact_address,
    timezone: data.timezone,
    status: data.status,
    business_registration: data.business_registration,
    business_address: data.business_address,
    billing_email: data.billing_email,
    
    // ✅ Stripe Connect (publishable key is safe, others are secrets)
    stripe_account_id: data.stripe_account_id,
    stripe_publishable_key: data.stripe_publishable_key,
    stripe_onboarding_completed: data.stripe_onboarding_completed,
    
    // ✅ Non-secret metadata
    resend_from_email: data.resend_from_email,
    resend_from_name: data.resend_from_name,
    walletpush_template_id: data.walletpush_template_id,
    walletpush_endpoint_url: data.walletpush_endpoint_url,
    slack_channel: data.slack_channel,
    
    // 🔒 SECRETS: Return masked values + "has_*" flags
    ghl_webhook_url: maskSecret(data.ghl_webhook_url),
    has_ghl_webhook_url: !!data.ghl_webhook_url,
    
    ghl_pass_creation_webhook_url: maskSecret(data.ghl_pass_creation_webhook_url),
    has_ghl_pass_creation_webhook_url: !!data.ghl_pass_creation_webhook_url,
    
    ghl_update_webhook_url: maskSecret(data.ghl_update_webhook_url),
    has_ghl_update_webhook_url: !!data.ghl_update_webhook_url,
    
    ghl_api_key: maskSecret(data.ghl_api_key),
    has_ghl_api_key: !!data.ghl_api_key,
    
    walletpush_api_key: maskSecret(data.walletpush_api_key),
    has_walletpush_api_key: !!data.walletpush_api_key,
    
    slack_webhook_url: maskSecret(data.slack_webhook_url),
    has_slack_webhook_url: !!data.slack_webhook_url,
    
    stripe_webhook_secret: maskSecret(data.stripe_webhook_secret),
    has_stripe_webhook_secret: !!data.stripe_webhook_secret,
    
    resend_api_key: maskSecret(data.resend_api_key),
    has_resend_api_key: !!data.resend_api_key,
    
    openai_api_key: maskSecret(data.openai_api_key),
    has_openai_api_key: !!data.openai_api_key,
    
    anthropic_api_key: maskSecret(data.anthropic_api_key),
    has_anthropic_api_key: !!data.anthropic_api_key,
    
    google_places_api_key: maskSecret(data.google_places_api_key),
    has_google_places_api_key: !!data.google_places_api_key,
    
    // 📱 SMS Configuration
    sms_enabled: data.sms_enabled,
    sms_provider: data.sms_provider,
    sms_verified: data.sms_verified,
    sms_test_mode: data.sms_test_mode,
    sms_country_code: data.sms_country_code,
    sms_default_calling_code: data.sms_default_calling_code,
    sms_last_verified_at: data.sms_last_verified_at,
    sms_last_error: data.sms_last_error,
    
    // 🔒 SMS Secrets (masked)
    twilio_account_sid: maskSecret(data.twilio_account_sid),
    has_twilio_account_sid: !!data.twilio_account_sid,
    
    twilio_auth_token: maskSecret(data.twilio_auth_token),
    has_twilio_auth_token: !!data.twilio_auth_token,
    
    twilio_messaging_service_sid: maskSecret(data.twilio_messaging_service_sid),
    has_twilio_messaging_service_sid: !!data.twilio_messaging_service_sid,
    
    twilio_from_number: data.twilio_from_number, // Phone numbers are not secrets
    has_twilio_from_number: !!data.twilio_from_number,
  }
}

export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Derive city from hostname (can't be spoofed by client)
    const city = await getCityFromRequest(request.headers)

    const supabase = createAdminClient()

    // Get current franchise configuration for THIS city only
    const { data, error } = await supabase
      .from('franchise_crm_configs')
      .select('*') // Get all fields, we'll sanitize before returning
      .eq('city', city)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error fetching franchise config:', error)
      return NextResponse.json(
        { error: 'Failed to fetch franchise configuration' },
        { status: 500 }
      )
    }

    // 🔒 CRITICAL: Sanitize secrets before returning to client
    const sanitizedConfig = sanitizeConfigForClient(data)

    return NextResponse.json({
      success: true,
      config: sanitizedConfig
    })

  } catch (error) {
    console.error('❌ Setup API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH-style update: only modify fields that are explicitly provided and non-empty
 * For secrets: if masked value is sent back, ignore it (don't overwrite)
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Derive city from hostname (can't be spoofed by client)
    const city = await getCityFromRequest(request.headers)
    
    const { config } = await request.json()

    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { error: 'Config object is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Build update object: only include fields that are provided
    const updates: Record<string, any> = {
      city, // ✅ Always server-derived
      updated_at: new Date().toISOString()
    }

    // Helper: Add field only if provided and not a masked placeholder
    const addIfPresent = (key: string, value: any) => {
      if (value === undefined || value === null) return
      
      // If it's a string and looks like a masked value, skip it
      if (typeof value === 'string') {
        if (value.includes('••••') || value.trim() === '') return
      }
      
      updates[key] = value
    }

    // ✅ Non-secret fields (always safe to update)
    if (config.display_name !== undefined) updates.display_name = config.display_name
    if (config.subdomain !== undefined) updates.subdomain = config.subdomain || city
    if (config.owner_name !== undefined) updates.owner_name = config.owner_name
    if (config.owner_email !== undefined) updates.owner_email = config.owner_email
    if (config.owner_phone !== undefined) updates.owner_phone = config.owner_phone
    if (config.contact_address !== undefined) updates.contact_address = config.contact_address
    if (config.timezone !== undefined) updates.timezone = config.timezone
    if (config.status !== undefined) updates.status = config.status
    if (config.business_registration !== undefined) updates.business_registration = config.business_registration
    if (config.business_address !== undefined) updates.business_address = config.business_address
    if (config.billing_email !== undefined) updates.billing_email = config.billing_email
    if (config.stripe_account_id !== undefined) updates.stripe_account_id = config.stripe_account_id
    if (config.stripe_publishable_key !== undefined) updates.stripe_publishable_key = config.stripe_publishable_key
    if (config.stripe_onboarding_completed !== undefined) updates.stripe_onboarding_completed = config.stripe_onboarding_completed
    if (config.resend_from_email !== undefined) updates.resend_from_email = config.resend_from_email
    if (config.resend_from_name !== undefined) updates.resend_from_name = config.resend_from_name
    if (config.walletpush_template_id !== undefined) updates.walletpush_template_id = config.walletpush_template_id
    if (config.walletpush_endpoint_url !== undefined) updates.walletpush_endpoint_url = config.walletpush_endpoint_url
    if (config.slack_channel !== undefined) updates.slack_channel = config.slack_channel

    // 🔒 SECRET fields: only update if value is real (not masked, not empty)
    addIfPresent('ghl_webhook_url', config.ghl_webhook_url)
    addIfPresent('ghl_pass_creation_webhook_url', config.ghl_pass_creation_webhook_url)
    addIfPresent('ghl_update_webhook_url', config.ghl_update_webhook_url)
    addIfPresent('ghl_api_key', config.ghl_api_key)
    addIfPresent('walletpush_api_key', config.walletpush_api_key)
    addIfPresent('slack_webhook_url', config.slack_webhook_url)
    addIfPresent('stripe_webhook_secret', config.stripe_webhook_secret)
    addIfPresent('resend_api_key', config.resend_api_key)
    addIfPresent('openai_api_key', config.openai_api_key)
    addIfPresent('anthropic_api_key', config.anthropic_api_key)
    addIfPresent('google_places_api_key', config.google_places_api_key)

    // 📱 SMS Configuration (non-secret fields)
    if (config.sms_enabled !== undefined) updates.sms_enabled = config.sms_enabled
    if (config.sms_provider !== undefined) updates.sms_provider = config.sms_provider
    if (config.sms_test_mode !== undefined) updates.sms_test_mode = config.sms_test_mode
    if (config.sms_country_code !== undefined) updates.sms_country_code = config.sms_country_code
    if (config.sms_default_calling_code !== undefined) updates.sms_default_calling_code = config.sms_default_calling_code
    if (config.twilio_from_number !== undefined) updates.twilio_from_number = config.twilio_from_number
    
    // 🔒 SMS Secrets (only update if not masked)
    addIfPresent('twilio_account_sid', config.twilio_account_sid)
    addIfPresent('twilio_auth_token', config.twilio_auth_token)
    addIfPresent('twilio_messaging_service_sid', config.twilio_messaging_service_sid)
    
    // IMPORTANT: When SMS config changes, reset verification status
    // (User must re-verify after changing credentials)
    if (
      config.twilio_account_sid !== undefined ||
      config.twilio_auth_token !== undefined ||
      config.twilio_messaging_service_sid !== undefined ||
      config.twilio_from_number !== undefined
    ) {
      updates.sms_verified = false // Require re-verification
      updates.sms_last_error = null // Clear old errors
    }

    // Perform upsert with only the fields we want to update
    const { data: updatedConfig, error } = await supabase
      .from('franchise_crm_configs')
      .upsert(updates, {
        onConflict: 'city' // Update if city exists, insert if new
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating franchise config:', error)
      return NextResponse.json(
        { error: 'Failed to update franchise configuration' },
        { status: 500 }
      )
    }

    // 🚀 AUTO-ACTIVATION LOGIC
    // If franchise is 'pending_setup' and has minimum required fields configured,
    // automatically transition to 'active' status
    if (updatedConfig.status === 'pending_setup') {
      const hasMinimumRequirements = (
        updatedConfig.ghl_pass_creation_webhook_url && // CRITICAL: Users must be able to install passes
        !updatedConfig.ghl_pass_creation_webhook_url.includes('PLACEHOLDER') &&
        updatedConfig.resend_api_key && // Required for emails
        updatedConfig.resend_from_email &&
        updatedConfig.walletpush_api_key && // Required for pass creation
        updatedConfig.walletpush_template_id
      )

      if (hasMinimumRequirements) {
        console.log(`✅ [AUTO-ACTIVATE] ${city} has minimum requirements, transitioning to 'active'`)
        
        const { error: activateError } = await supabase
          .from('franchise_crm_configs')
          .update({ 
            status: 'active',
            activated_at: new Date().toISOString()
          })
          .eq('city', city)

        if (activateError) {
          console.error('❌ Error auto-activating franchise:', activateError)
          // Don't fail the request, just log the error
        } else {
          console.log(`🎉 [AUTO-ACTIVATE] ${city} is now ACTIVE!`)
          return NextResponse.json({
            success: true,
            message: 'Franchise configuration saved and city activated! Your city is now live.',
            activated: true
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Franchise configuration updated successfully'
    })

  } catch (error) {
    console.error('❌ Setup API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
