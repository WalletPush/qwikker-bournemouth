import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import { withRateLimit, RATE_LIMIT_PRESETS } from '@/lib/utils/rate-limiting'

/**
 * SECURE SERVER-ONLY GHL WEBHOOK SENDER
 * This replaces the client-side sendToGoHighLevel function
 * Credentials are never exposed to the client bundle
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limiting
    const rateLimitResult = withRateLimit(
      RATE_LIMIT_PRESETS.API_MODERATE,
      'ghl_send'
    )(request)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
          }
        }
      )
    }
    
    const { formData, city } = await request.json()
    
    // Detect city from request or use provided city
    const targetCity = city || await getFranchiseCityFromRequest()
    
    // Get secure franchise config from database
    const supabase = createServiceRoleClient()
    const { data: config, error } = await supabase
      .from('franchise_crm_configs')
      .select('ghl_webhook_url, ghl_update_webhook_url, franchise_owner, timezone, display_name')
      .eq('city', targetCity)
      .single()
    
    if (error || !config) {
      console.error(`❌ No CRM config found for ${targetCity}:`, error)
      return NextResponse.json(
        { error: `No CRM configuration found for ${targetCity}` },
        { status: 404 }
      )
    }
    
    if (!config.ghl_webhook_url) {
      console.error(`❌ No GHL webhook URL configured for ${targetCity}`)
      return NextResponse.json(
        { error: `No GHL webhook configured for ${targetCity}` },
        { status: 400 }
      )
    }
    
    // Add franchise metadata
    const franchiseFormData = {
      ...formData,
      franchise_city: targetCity,
      franchise_owner: config.franchise_owner,
      timezone: config.timezone
    }
    
    console.log(`📞 Sending to ${config.display_name} GHL:`, config.ghl_webhook_url)
    
    // Send to GHL webhook
    const response = await fetch(config.ghl_webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(franchiseFormData)
    })

    if (!response.ok) {
      throw new Error(`GoHighLevel webhook failed for ${config.display_name}: ${response.statusText}`)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully sent to ${config.display_name} GHL` 
    })
    
  } catch (error) {
    console.error('GHL send error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send to GHL' },
      { status: 500 }
    )
  }
}
