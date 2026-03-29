import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeForConnectedAccount } from '@/lib/stripe/config'
import { getFranchiseStripeConfig } from '@/lib/stripe/checkout'

/**
 * POST /api/stripe/cancel-subscription
 *
 * Cancels a Stripe subscription at the end of the current billing period.
 * The business keeps access until the period ends, then Stripe fires
 * customer.subscription.deleted and the webhook locks features.
 * No refund is issued.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId } = body

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing required field: businessId' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: business, error: bizError } = await supabase
      .from('business_profiles')
      .select('id, city, business_name')
      .eq('id', businessId)
      .single()

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: existingSub, error: subError } = await supabase
      .from('business_subscriptions')
      .select('id, stripe_subscription_id, status')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError || !existingSub?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found.' },
        { status: 400 }
      )
    }

    const franchiseConfig = await getFranchiseStripeConfig(business.city)
    if (!franchiseConfig) {
      return NextResponse.json(
        { error: 'Billing configuration not found for your city.' },
        { status: 400 }
      )
    }

    const stripe = getStripeForConnectedAccount(franchiseConfig.stripe_account_id)

    // Cancel at period end — business keeps access until the billing cycle finishes
    const cancelled = await stripe.subscriptions.update(existingSub.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    // Since basil API (2025-03-31), period dates live on items, not the subscription
    const itemPeriodEnd = cancelled.items?.data?.[0]?.current_period_end
    const periodEnd = typeof itemPeriodEnd === 'number'
      ? new Date(itemPeriodEnd * 1000).toISOString()
      : null

    console.log(`Subscription cancellation scheduled: business=${businessId}, city=${business.city}, access_until=${periodEnd}`)

    return NextResponse.json({
      success: true,
      accessUntil: periodEnd,
    })
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
