import { NextRequest, NextResponse } from 'next/server'
import { getStripeConnectUrl } from '@/lib/stripe/config'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/admin/billing/stripe-connect
 * Initiates Stripe Connect OAuth flow for a franchise
 */
export async function POST(request: NextRequest) {
  try {
    // Check for required environment variables first
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured')
      return NextResponse.json(
        { success: false, error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to environment variables.' },
        { status: 500 }
      )
    }
    
    if (!process.env.STRIPE_CONNECT_CLIENT_ID) {
      console.error('STRIPE_CONNECT_CLIENT_ID is not configured')
      return NextResponse.json(
        { success: false, error: 'Stripe Connect is not configured. Add STRIPE_CONNECT_CLIENT_ID to environment variables.' },
        { status: 500 }
      )
    }
    
    const { city } = await request.json()
    
    if (!city) {
      return NextResponse.json(
        { success: false, error: 'City is required' },
        { status: 400 }
      )
    }
    
    // Verify the city exists in franchise_crm_configs
    const supabase = createAdminClient()
    const { data: franchise, error } = await supabase
      .from('franchise_crm_configs')
      .select('city, display_name')
      .eq('city', city.toLowerCase())
      .single()
    
    if (error || !franchise) {
      return NextResponse.json(
        { success: false, error: 'Franchise not found' },
        { status: 404 }
      )
    }
    
    // Create a state parameter with the city (used in callback)
    // In production, you'd want to use a more secure state (signed JWT or encrypted)
    const state = Buffer.from(JSON.stringify({ 
      city: city.toLowerCase(),
      timestamp: Date.now()
    })).toString('base64')
    
    // Generate the Stripe Connect OAuth URL
    const connectUrl = getStripeConnectUrl(state)
    
    return NextResponse.json({
      success: true,
      url: connectUrl
    })
    
  } catch (error) {
    console.error('Stripe Connect error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to initiate Stripe Connect'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
