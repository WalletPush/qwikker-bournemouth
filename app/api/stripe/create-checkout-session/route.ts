import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getFranchiseStripeConfig,
  getOrCreateStripeCustomer,
  createCheckoutSession,
  getTierPricing,
} from '@/lib/stripe/checkout'

/**
 * POST /api/stripe/create-checkout-session
 *
 * Creates a Stripe Checkout Session for a business to subscribe to a paid tier.
 * The session is created on the franchise's connected Stripe account (direct charge).
 * Returns the Checkout URL for redirect.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, tierName, billingCycle, applyFoundingDiscount } = body

    if (!businessId || !tierName || !billingCycle) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, tierName, billingCycle' },
        { status: 400 }
      )
    }

    if (!['monthly', 'annual'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'billingCycle must be "monthly" or "annual"' },
        { status: 400 }
      )
    }

    if (!['starter', 'featured', 'spotlight'].includes(tierName)) {
      return NextResponse.json(
        { error: 'tierName must be "starter", "featured", or "spotlight"' },
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

    const franchiseConfig = await getFranchiseStripeConfig(business.city)

    if (!franchiseConfig) {
      return NextResponse.json(
        { error: 'Billing is not yet available for your city. Your franchise admin needs to connect Stripe first.' },
        { status: 400 }
      )
    }

    const tierPricing = await getTierPricing(business.city, tierName)

    if (!tierPricing) {
      return NextResponse.json(
        { error: `Pricing not found for tier: ${tierName}` },
        { status: 400 }
      )
    }

    let price = billingCycle === 'annual' && tierPricing.annualPrice
      ? tierPricing.annualPrice
      : tierPricing.monthlyPrice

    // Apply founding member discount server-side if eligible
    // This locks in the discounted price in Stripe — renewals stay at this rate forever
    let isFoundingMemberPrice = false
    if (
      applyFoundingDiscount &&
      billingCycle === 'annual' &&
      tierPricing.foundingMemberEnabled &&
      tierPricing.foundingMemberDiscount > 0
    ) {
      const discountMultiplier = (100 - tierPricing.foundingMemberDiscount) / 100
      price = Math.round(price * discountMultiplier * 100) / 100
      isFoundingMemberPrice = true
    }

    const customerId = await getOrCreateStripeCustomer(
      businessId,
      franchiseConfig.stripe_account_id
    )

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const displayName = isFoundingMemberPrice
      ? `${tierPricing.tierDisplayName} (Founding Member)`
      : tierPricing.tierDisplayName

    const checkoutUrl = await createCheckoutSession({
      businessId,
      tierName,
      tierDisplayName: displayName,
      billingCycle,
      price,
      currency: tierPricing.currency,
      connectedAccountId: franchiseConfig.stripe_account_id,
      customerId,
      city: business.city,
      successUrl: `${origin}/dashboard/settings?payment=success&tier=${tierName}`,
      cancelUrl: `${origin}/dashboard/settings?payment=cancelled`,
    })

    return NextResponse.json({ url: checkoutUrl })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
