import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Pricing update request received')
    
    const body = await request.json()
    console.log('📦 Request body:', { city: body.city, hasConfig: !!body.config })
    
    const { city, config } = body

    if (!city || !config) {
      console.error('❌ Missing required fields:', { city, hasConfig: !!config })
      return NextResponse.json({
        success: false,
        error: 'Invalid request data - missing city or config'
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    console.log(`💰 Updating pricing for city: ${city}`)
    console.log(`📋 Config keys:`, Object.keys(config))

    // Update pricing_cards in franchise_crm_configs
    // This is the SINGLE SOURCE OF TRUTH for pricing
    const { data, error: configError } = await supabase
      .from('franchise_crm_configs')
      .update({
        currency: config.currency,
        currency_symbol: config.currency_symbol,
        tax_rate: config.tax_rate,
        tax_name: config.tax_name,
        pricing_cards: config.pricing_cards,
        updated_at: new Date().toISOString()
      })
      .eq('city', city)
      .select()

    if (configError) {
      console.error(`❌ Database error for ${city}:`, configError)
      return NextResponse.json({
        success: false,
        error: `Database error: ${configError.message}`
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.error(`❌ No franchise found for city: ${city}`)
      return NextResponse.json({
        success: false,
        error: `No franchise configuration found for city: ${city}`
      }, { status: 404 })
    }

    console.log(`✅ Successfully updated pricing for ${city}`)

    return NextResponse.json({
      success: true,
      message: `Pricing updated successfully for ${city}`
    })

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

