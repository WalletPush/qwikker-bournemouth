import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/admin/upgrade-spotlight - Upgrade a business to Spotlight tier
 * For testing analytics access
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId } = await request.json()

    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get Spotlight tier ID
    const { data: spotlightTier, error: tierError } = await supabase
      .from('subscription_tiers')
      .select('id')
      .eq('tier_name', 'spotlight')
      .single()

    if (tierError || !spotlightTier) {
      return NextResponse.json({
        success: false,
        error: 'Spotlight tier not found'
      }, { status: 500 })
    }

    // Create or update subscription
    const { data: subscription, error: subError } = await supabase
      .from('business_subscriptions')
      .upsert({
        business_id: businessId,
        tier_id: spotlightTier.id,
        status: 'active',
        subscription_start_date: new Date().toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        base_price: 89.00,
        billing_cycle: 'monthly',
        is_in_free_trial: false
      })
      .select()

    if (subError) {
      console.error('Error creating subscription:', subError)
      return NextResponse.json({
        success: false,
        error: subError.message
      }, { status: 500 })
    }

    // Also update the old plan field for backward compatibility
    const { error: profileError } = await supabase
      .from('business_profiles')
      .update({ plan: 'spotlight' })
      .eq('id', businessId)

    if (profileError) {
      console.warn('Error updating profile plan:', profileError)
    }

    return NextResponse.json({
      success: true,
      message: 'Business upgraded to Spotlight tier',
      subscription
    })

  } catch (error) {
    console.error('Upgrade API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
