import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromRequest } from '@/lib/utils/city-detection'

export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Derive city from hostname (can't be spoofed by client)
    const city = await getCityFromRequest(request.headers)

    const supabase = createAdminClient()

    // Get current franchise configuration for THIS city only
    const { data, error } = await supabase
      .from('franchise_crm_configs')
      .select(`
        city,
        display_name,
        subdomain,
        owner_name,
        owner_email,
        owner_phone,
        contact_address,
        ghl_webhook_url,
        ghl_update_webhook_url,
        ghl_api_key,
        walletpush_api_key,
        walletpush_template_id,
        walletpush_endpoint_url,
        slack_webhook_url,
        slack_channel,
        timezone,
        status,
        stripe_account_id,
        stripe_publishable_key,
        stripe_webhook_secret,
        stripe_onboarding_completed,
        business_registration,
        business_address,
        billing_email,
        resend_api_key,
        resend_from_email,
        resend_from_name,
        openai_api_key,
        anthropic_api_key,
        google_places_api_key
      `)
      .eq('city', city)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error fetching franchise config:', error)
      return NextResponse.json(
        { error: 'Failed to fetch franchise configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      config: data || null
    })

  } catch (error) {
    console.error('❌ Setup API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Derive city from hostname (can't be spoofed by client)
    const city = await getCityFromRequest(request.headers)
    
    const { config } = await request.json()

    if (!config) {
      return NextResponse.json(
        { error: 'Config is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Update or insert franchise configuration for THIS city only
    const { error } = await supabase
      .from('franchise_crm_configs')
      .upsert({
        city, // ✅ Server-derived city (secure)
        display_name: config.display_name,
        subdomain: config.subdomain || city, // Default to city name if not provided
        owner_name: config.owner_name,
        owner_email: config.owner_email,
        owner_phone: config.owner_phone,
        contact_address: config.contact_address,
        ghl_webhook_url: config.ghl_webhook_url,
        ghl_update_webhook_url: config.ghl_update_webhook_url,
        ghl_api_key: config.ghl_api_key,
        walletpush_api_key: config.walletpush_api_key,
        walletpush_template_id: config.walletpush_template_id,
        walletpush_endpoint_url: config.walletpush_endpoint_url,
        slack_webhook_url: config.slack_webhook_url,
        slack_channel: config.slack_channel,
        timezone: config.timezone,
        status: config.status,
        stripe_account_id: config.stripe_account_id,
        stripe_publishable_key: config.stripe_publishable_key,
        stripe_webhook_secret: config.stripe_webhook_secret,
        stripe_onboarding_completed: config.stripe_onboarding_completed,
        business_registration: config.business_registration,
        business_address: config.business_address,
        billing_email: config.billing_email,
        // Franchise-Paid API Services
        resend_api_key: config.resend_api_key,
        resend_from_email: config.resend_from_email,
        resend_from_name: config.resend_from_name,
        openai_api_key: config.openai_api_key,
        anthropic_api_key: config.anthropic_api_key,
        google_places_api_key: config.google_places_api_key,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'city' // Tell Supabase to UPDATE if city already exists
      })

    if (error) {
      console.error('❌ Error updating franchise config:', error)
      return NextResponse.json(
        { error: 'Failed to update franchise configuration' },
        { status: 500 }
      )
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
