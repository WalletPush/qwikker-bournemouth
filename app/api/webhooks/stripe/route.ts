import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe, getStripeForConnectedAccount } from '@/lib/stripe/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFeaturesForTier } from '@/lib/utils/features-for-tier'

/**
 * POST /api/webhooks/stripe
 *
 * Receives Connect webhook events from Stripe for all connected franchise accounts.
 * Registered in Stripe Dashboard as "Events on Connected accounts".
 * Each event includes event.account identifying which franchise triggered it.
 *
 * CRITICAL: Must use request.text() for raw body (not request.json()),
 * otherwise signature verification fails.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const supabase = createAdminClient()

  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown verification error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
  }

  const connectedAccountId = event.account
  if (!connectedAccountId) {
    console.warn('Webhook event has no account field — not a Connect event, skipping')
    return NextResponse.json({ received: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.paid':
        await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice, connectedAccountId)
        break

      case 'invoice.payment_failed':
        await handleInvoiceFailed(supabase, event.data.object as Stripe.Invoice, connectedAccountId)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`Error handling webhook event ${event.type}:`, err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}


/**
 * checkout.session.completed — Business just completed payment via Checkout.
 * Update business_subscriptions with Stripe IDs, end free trial if applicable.
 * Safety: cancels any previous Stripe subscription to prevent orphaned billing.
 */
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  const businessId = session.metadata?.business_id
  const tierName = session.metadata?.tier_name
  const city = session.metadata?.city
  const billingCycle = session.metadata?.billing_cycle

  if (!businessId) {
    console.error('checkout.session.completed: missing business_id in metadata')
    return
  }

  const stripeSubscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id

  if (!stripeSubscriptionId) {
    console.error('checkout.session.completed: no subscription ID on session')
    return
  }

  console.log(`Checkout completed: business=${businessId}, tier=${tierName}, city=${city}`)

  // Look up the subscription_tiers row to get the tier_id
  let tierId: string | null = null
  if (tierName) {
    const { data: tier } = await supabase
      .from('subscription_tiers')
      .select('id')
      .eq('tier_name', tierName)
      .single()
    tierId = tier?.id || null
  }

  // Update business_subscriptions — find the existing row for this business
  const { data: existingSub } = await supabase
    .from('business_subscriptions')
    .select('id, is_in_free_trial, stripe_subscription_id')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Safety: cancel the old Stripe subscription if it differs from the new one
  if (
    existingSub?.stripe_subscription_id &&
    existingSub.stripe_subscription_id !== stripeSubscriptionId
  ) {
    try {
      const { data: business } = await supabase
        .from('business_profiles')
        .select('city')
        .eq('id', businessId)
        .single()

      if (business?.city) {
        const { data: config } = await supabase
          .from('franchise_crm_configs')
          .select('stripe_account_id')
          .eq('city', business.city)
          .single()

        if (config?.stripe_account_id) {
          const stripe = getStripeForConnectedAccount(config.stripe_account_id)
          await stripe.subscriptions.cancel(existingSub.stripe_subscription_id)
          console.log(`Safety: cancelled old subscription ${existingSub.stripe_subscription_id} for business=${businessId}`)
        }
      }
    } catch (cancelErr) {
      console.warn(`Failed to cancel old subscription ${existingSub.stripe_subscription_id}:`, cancelErr)
    }
  }

  const wasInTrial = existingSub?.is_in_free_trial === true
  const now = new Date().toISOString()

  if (existingSub) {
    await supabase
      .from('business_subscriptions')
      .update({
        stripe_subscription_id: stripeSubscriptionId,
        tier_id: tierId || existingSub.id,
        status: 'active',
        is_in_free_trial: false,
        upgraded_during_trial: wasInTrial,
        billing_cycle: billingCycle || 'monthly',
        subscription_start_date: now,
      })
      .eq('id', existingSub.id)
  } else {
    await supabase
      .from('business_subscriptions')
      .insert({
        business_id: businessId,
        stripe_subscription_id: stripeSubscriptionId,
        tier_id: tierId,
        status: 'active',
        is_in_free_trial: false,
        billing_cycle: billingCycle || 'monthly',
        subscription_start_date: now,
      })
  }

  // Update business_profiles plan + features to match the new tier
  if (tierName) {
    await supabase
      .from('business_profiles')
      .update({
        plan: tierName,
        features: getFeaturesForTier(tierName),
      })
      .eq('id', businessId)
  }

  console.log(`Subscription activated: business=${businessId}, tier=${tierName}, stripe_sub=${stripeSubscriptionId}, was_trial=${wasInTrial}`)
}

/**
 * invoice.paid — Recurring payment succeeded.
 * Record in billing_history and franchise_billing_transactions.
 */
async function handleInvoicePaid(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice,
  connectedAccountId: string
) {
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id

  if (!subscriptionId) return

  // Find the business by stripe_subscription_id
  const { data: sub } = await supabase
    .from('business_subscriptions')
    .select('id, business_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!sub) {
    console.warn(`invoice.paid: no subscription found for stripe_sub=${subscriptionId}`)
    return
  }

  // Find the city for franchise_billing_transactions
  const { data: business } = await supabase
    .from('business_profiles')
    .select('city')
    .eq('id', sub.business_id)
    .single()

  const amount = (invoice.amount_paid || 0) / 100
  const currency = (invoice.currency || 'gbp').toUpperCase()
  const now = new Date().toISOString()

  // Record in billing_history
  await supabase.from('billing_history').insert({
    business_id: sub.business_id,
    subscription_id: sub.id,
    amount,
    currency,
    payment_method: 'card',
    status: 'paid',
    payment_date: now,
    external_payment_id: invoice.payment_intent as string || invoice.id,
    invoice_url: invoice.hosted_invoice_url || null,
    billing_period_start: typeof invoice.period_start === 'number'
      ? new Date(invoice.period_start * 1000).toISOString()
      : null,
    billing_period_end: typeof invoice.period_end === 'number'
      ? new Date(invoice.period_end * 1000).toISOString()
      : null,
  })

  // Record in franchise_billing_transactions
  if (business?.city) {
    await supabase.from('franchise_billing_transactions').insert({
      franchise_city: business.city,
      business_id: sub.business_id,
      transaction_type: 'subscription',
      amount,
      currency,
      tax_amount: (invoice.tax || 0) / 100,
      total_amount: amount,
      stripe_payment_intent_id: invoice.payment_intent as string || null,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null,
      status: 'completed',
      payment_method: 'card',
      invoice_url: invoice.hosted_invoice_url || null,
      processed_at: now,
    })
  }

  // Update subscription period dates (guard type — may be number or absent)
  const invPeriodStart = typeof invoice.period_start === 'number' ? invoice.period_start : null
  const invPeriodEnd = typeof invoice.period_end === 'number' ? invoice.period_end : null

  if (invPeriodStart && invPeriodEnd) {
    await supabase
      .from('business_subscriptions')
      .update({
        current_period_start: new Date(invPeriodStart * 1000).toISOString(),
        current_period_end: new Date(invPeriodEnd * 1000).toISOString(),
      })
      .eq('id', sub.id)

    await supabase
      .from('business_profiles')
      .update({
        last_payment_date: now,
        next_billing_date: new Date(invPeriodEnd * 1000).toISOString(),
      })
      .eq('id', sub.business_id)
  }

  console.log(`Invoice paid: business=${sub.business_id}, amount=${amount} ${currency}`)
}

/**
 * invoice.payment_failed — Payment attempt failed.
 * Record the failure for tracking.
 */
async function handleInvoiceFailed(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice,
  connectedAccountId: string
) {
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id

  if (!subscriptionId) return

  const { data: sub } = await supabase
    .from('business_subscriptions')
    .select('id, business_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!sub) return

  const amount = (invoice.amount_due || 0) / 100
  const currency = (invoice.currency || 'gbp').toUpperCase()

  await supabase.from('billing_history').insert({
    business_id: sub.business_id,
    subscription_id: sub.id,
    amount,
    currency,
    payment_method: 'card',
    status: 'failed',
    payment_date: new Date().toISOString(),
    external_payment_id: invoice.payment_intent as string || invoice.id,
    failure_reason: 'Payment failed — card declined or expired',
  })

  console.warn(`Invoice payment failed: business=${sub.business_id}, amount=${amount} ${currency}`)
}

/**
 * customer.subscription.updated — Plan change, status change, etc.
 * Syncs tier, features, and status changes made via update-subscription API,
 * Stripe Portal, or Stripe Dashboard edits.
 */
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const { data: sub } = await supabase
    .from('business_subscriptions')
    .select('id, business_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!sub) return

  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'active',
    canceled: 'cancelled',
    unpaid: 'paused',
    paused: 'paused',
    trialing: 'trial',
  }

  const mappedStatus = statusMap[subscription.status] || subscription.status

  // Since basil API (2025-03-31), period dates live on items, not the subscription
  const item = subscription.items?.data?.[0]
  const periodStart = item?.current_period_start
  const periodEnd = item?.current_period_end

  const updatePayload: Record<string, unknown> = {
    status: mappedStatus,
    ...(typeof periodStart === 'number' && {
      current_period_start: new Date(periodStart * 1000).toISOString(),
    }),
    ...(typeof periodEnd === 'number' && {
      current_period_end: new Date(periodEnd * 1000).toISOString(),
    }),
  }

  // Sync tier if metadata contains a tier_name (set by update-subscription or checkout)
  const tierName = subscription.metadata?.tier_name
  if (tierName) {
    const { data: tier } = await supabase
      .from('subscription_tiers')
      .select('id')
      .eq('tier_name', tierName)
      .single()

    if (tier) {
      updatePayload.tier_id = tier.id
    }

    const billingCycle = subscription.metadata?.billing_cycle
    if (billingCycle) {
      updatePayload.billing_cycle = billingCycle
    }
  }

  await supabase
    .from('business_subscriptions')
    .update(updatePayload)
    .eq('id', sub.id)

  // Sync plan + features on business_profiles if tier changed
  if (tierName) {
    await supabase
      .from('business_profiles')
      .update({
        plan: tierName,
        features: getFeaturesForTier(tierName),
      })
      .eq('id', sub.business_id)
  }

  console.log(`Subscription updated: business=${sub.business_id}, status=${mappedStatus}, tier=${tierName || 'unchanged'}`)
}

/**
 * customer.subscription.deleted — Subscription cancelled (end of billing period or immediate).
 * Mark as cancelled so entitlement engine returns PAID_LAPSED.
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const { data: sub } = await supabase
    .from('business_subscriptions')
    .select('id, business_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!sub) return

  await supabase
    .from('business_subscriptions')
    .update({ status: 'cancelled' })
    .eq('id', sub.id)

  // Lock all premium features on cancellation
  await supabase
    .from('business_profiles')
    .update({ features: getFeaturesForTier('free') })
    .eq('id', sub.business_id)

  console.log(`Subscription deleted: business=${sub.business_id}, stripe_sub=${subscription.id}`)
}
