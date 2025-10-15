import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { city, config } = await request.json()

    if (!city || !config) {
      return NextResponse.json(
        { error: 'Missing city or config data' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Update the franchise_crm_configs table with new pricing cards and settings
    const { error } = await supabase
      .from('franchise_crm_configs')
      .update({
        currency: config.currency,
        currency_symbol: config.currency_symbol,
        tax_rate: config.tax_rate,
        tax_name: config.tax_name,
        founding_member_enabled: config.founding_member_enabled,
        founding_member_discount: config.founding_member_discount,
        founding_member_title: config.founding_member_title,
        founding_member_description: config.founding_member_description,
        pricing_cards: config.pricing_cards,
        updated_at: new Date().toISOString()
      })
      .eq('city', city)

    if (error) {
      console.error('❌ Error updating pricing cards:', error)
      return NextResponse.json(
        { error: 'Failed to update pricing cards' },
        { status: 500 }
      )
    }

    console.log(`✅ Pricing cards updated for ${city}`)
    
    return NextResponse.json({ 
      success: true,
      message: 'Pricing cards updated successfully'
    })

  } catch (error) {
    console.error('❌ Pricing cards API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')

    if (!city) {
      return NextResponse.json(
        { error: 'Missing city parameter' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Get current pricing cards and config for the city
    const { data, error } = await supabase
      .from('franchise_crm_configs')
      .select(`
        city,
        currency,
        currency_symbol,
        tax_rate,
        tax_name,
        founding_member_enabled,
        founding_member_discount,
        founding_member_title,
        founding_member_description,
        pricing_cards
      `)
      .eq('city', city)
      .single()

    if (error) {
      console.error('❌ Error fetching pricing cards:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pricing cards' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      config: data
    })

  } catch (error) {
    console.error('❌ Pricing cards fetch API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
