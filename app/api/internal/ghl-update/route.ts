import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import { withRateLimit, RATE_LIMIT_PRESETS } from '@/lib/utils/rate-limiting'

/**
 * SECURE SERVER-ONLY GHL UPDATE WEBHOOK SENDER
 * This replaces the client-side sendContactUpdateToGoHighLevel function
 * Credentials are never exposed to the client bundle
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limiting
    const rateLimitResult = await withRateLimit(
      RATE_LIMIT_PRESETS.API_MODERATE,
      'ghl_update'
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
      .select('ghl_webhook_url, ghl_update_webhook_url, owner_name, timezone, display_name')
      .eq('city', targetCity)
      .single()
    
    if (error || !config) {
      console.error(`❌ No CRM config found for ${targetCity}:`, error)
      return NextResponse.json(
        { error: `No CRM configuration found for ${targetCity}` },
        { status: 404 }
      )
    }
    
    // Use update webhook if available, otherwise use main webhook
    const updateWebhookUrl = config.ghl_update_webhook_url || config.ghl_webhook_url
    
    if (!updateWebhookUrl) {
      console.error(`❌ No GHL webhook configured for ${targetCity}`)
      return NextResponse.json(
        { error: `No GHL webhook configured for ${targetCity}` },
        { status: 400 }
      )
    }
    
    // Add franchise metadata and update flags
    const updateData = {
      ...formData,
      isContactUpdate: true,
      updateType: formData.updateType || 'contact_update',
      skipSignupNotification: true,
      franchise_city: targetCity,
      franchise_owner: config.owner_name,
      timezone: config.timezone,
    }
    
    console.log(`🔄 Updating contact in ${config.display_name} GHL:`, updateWebhookUrl)
    
    // Send to GHL webhook
    const response = await fetch(updateWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      throw new Error(`GoHighLevel contact update webhook failed for ${config.display_name}: ${response.statusText}`)
    }
    
    console.log(`✅ Contact updated successfully in ${config.display_name} GHL`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully updated contact in ${config.display_name} GHL` 
    })
    
  } catch (error) {
    console.error('GHL update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update GHL contact' },
      { status: 500 }
    )
  }
}
