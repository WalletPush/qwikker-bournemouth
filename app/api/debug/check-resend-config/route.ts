import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Debug endpoint to check Resend configuration for a city
 * GET /api/debug/check-resend-config?city=bournemouth
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city') || 'bournemouth'

    const supabase = createServiceRoleClient()

    const { data: config, error } = await supabase
      .from('franchise_crm_configs')
      .select('city, resend_from_email, resend_from_name, display_name, resend_api_key')
      .eq('city', city)
      .single()

    if (error || !config) {
      return NextResponse.json({
        error: 'Config not found',
        details: error
      }, { status: 404 })
    }

    // Mask the API key for security, but show if it exists
    const apiKeyStatus = config.resend_api_key 
      ? `✅ Configured (${config.resend_api_key.substring(0, 8)}...${config.resend_api_key.substring(config.resend_api_key.length - 4)})` 
      : '❌ Not configured'

    return NextResponse.json({
      city: config.city,
      display_name: config.display_name,
      resend_from_email: config.resend_from_email || '❌ Not configured',
      resend_from_name: config.resend_from_name || '❌ Not configured',
      resend_api_key_status: apiKeyStatus,
      is_ready: !!(config.resend_api_key && config.resend_from_email)
    })

  } catch (error: any) {
    console.error('Debug check error:', error)
    return NextResponse.json({ 
      error: 'Failed to check config',
      details: error.message 
    }, { status: 500 })
  }
}

