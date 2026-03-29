import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeForConnectedAccount } from '@/lib/stripe/config'
import { getFranchiseStripeConfig, getTierPricing } from '@/lib/stripe/checkout'

/**
 * POST /api/stripe/update-subscription
 *
 * Updates an existing Stripe subscription to a new tier (upgrade or downgrade).
 * Uses Stripe's subscription update API with proration so the customer is only
 * charged the prorated difference (upgrade) or given credit (downgrade).
 *
 * This prevents the critical bug of creating duplicate subscriptions.
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

    // Look up the existing active subscription
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
        { error: 'No active subscription found. Use checkout for first-time purchases.' },
        { status: 400 }
      )
    }

    const franchiseConfig = await getFranchiseStripeConfig(business.city)
    if (!franchiseConfig) {
      return NextResponse.json(
        { error: 'Billing is not yet available for your city.' },
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

    const stripe = getStripeForConnectedAccount(franchiseConfig.stripe_account_id)

    // Retrieve the current subscription to get the subscription item ID
    const currentSub = await stripe.subscriptions.retrieve(existingSub.stripe_subscription_id)

    if (!currentSub || currentSub.items.data.length === 0) {
      return NextResponse.json(
        { error: 'Could not retrieve current subscription from Stripe' },
        { status: 500 }
      )
    }

    const subscriptionItemId = currentSub.items.data[0].id
    const unitAmount = Math.round(price * 100)

    const displayName = isFoundingMemberPrice
      ? `${tierPricing.tierDisplayName} (Founding Member)`
      : tierPricing.tierDisplayName

    // Find or create a Stripe Product for this tier on the connected account.
    // Checkout-created products are immutable, so we maintain our own per tier+city.
    const products = await stripe.products.list({ limit: 100, active: true })
    const matchingProduct = products.data.find(
      p => p.metadata?.tier_name === tierName && p.metadata?.city === business.city
    )

    let productId: string
    if (matchingProduct) {
      productId = matchingProduct.id
    } else {
      const product = await stripe.products.create({
        name: displayName,
        metadata: {
          tier_name: tierName,
          city: business.city,
          platform: 'qwikker',
        },
      })
      productId = product.id
      console.log(`Created Stripe Product ${product.id} for tier=${tierName}, city=${business.city}`)
    }

    // Update the subscription in-place — Stripe handles proration automatically
    await stripe.subscriptions.update(existingSub.stripe_subscription_id, {
      items: [
        {
          id: subscriptionItemId,
          price_data: {
            currency: tierPricing.currency.toLowerCase(),
            product: productId,
            unit_amount: unitAmount,
            recurring: {
              interval: billingCycle === 'annual' ? 'year' : 'month',
            },
          },
        },
      ],
      metadata: {
        business_id: businessId,
        tier_name: tierName,
        city: business.city,
        billing_cycle: billingCycle,
      },
      proration_behavior: 'create_prorations',
    })

    // Update our DB immediately (webhook will also fire, but this gives instant UI feedback)
    const getFeaturesForTier = (tier: string): Record<string, boolean> => {
      const locked = {
        analytics: false,
        loyalty_cards: false,
        social_wizard: false,
        push_notifications: false,
      }
      if (tier === 'spotlight') {
        return { analytics: true, loyalty_cards: true, social_wizard: true, push_notifications: true }
      }
      return locked
    }

    let tierId: string | null = null
    const { data: tier } = await supabase
      .from('subscription_tiers')
      .select('id')
      .eq('tier_name', tierName)
      .single()
    tierId = tier?.id || null

    await supabase
      .from('business_subscriptions')
      .update({
        tier_id: tierId,
        billing_cycle: billingCycle,
      })
      .eq('id', existingSub.id)

    await supabase
      .from('business_profiles')
      .update({
        plan: tierName,
        features: getFeaturesForTier(tierName),
      })
      .eq('id', businessId)

    console.log(`Subscription updated: business=${businessId}, newTier=${tierName}, cycle=${billingCycle}, prorated=true`)

    return NextResponse.json({ success: true, tierName, billingCycle })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update subscription' },
      { status: 500 }
    )
  }
}
