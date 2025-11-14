import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')

    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get current franchise configuration
    const { data, error } = await supabase
      .from('franchise_crm_configs')
      .select(`
        city,
        admin_email,
        admin_name,
        franchise_name,
        contact_phone,
        contact_address,
        walletpush_api_key,
        slack_webhook_url,
        slack_channel,
        timezone,
        business_registration,
        business_address,
        billing_email
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
    const { city, config } = await request.json()

    if (!city || !config) {
      return NextResponse.json(
        { error: 'City and config are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Update or insert franchise configuration
    const { error } = await supabase
      .from('franchise_crm_configs')
      .upsert({
        city,
        admin_email: config.admin_email,
        admin_name: config.admin_name,
        franchise_name: config.franchise_name,
        contact_phone: config.contact_phone,
        contact_address: config.contact_address,
        walletpush_api_key: config.walletpush_api_key,
        slack_webhook_url: config.slack_webhook_url,
        slack_channel: config.slack_channel,
        timezone: config.timezone,
        business_registration: config.business_registration,
        business_address: config.business_address,
        billing_email: config.billing_email,
        updated_at: new Date().toISOString()
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
