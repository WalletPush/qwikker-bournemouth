import Stripe from 'stripe'
import { getStripeForConnectedAccount } from './config'
import { createAdminClient } from '@/lib/supabase/admin'

interface FranchiseStripeConfig {
  stripe_account_id: string
  currency: string
  currency_symbol: string
  tax_rate: number
  tax_name: string
}

/**
 * Look up the franchise's Stripe Connect account and billing config.
 * Returns null if the franchise hasn't connected Stripe yet.
 */
export async function getFranchiseStripeConfig(city: string): Promise<FranchiseStripeConfig | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('franchise_crm_configs')
    .select('stripe_account_id, currency, currency_symbol, tax_rate, tax_name')
    .eq('city', city)
    .single()

  if (error || !data?.stripe_account_id) {
    return null
  }

  return {
    stripe_account_id: data.stripe_account_id,
    currency: data.currency || 'GBP',
    currency_symbol: data.currency_symbol || '£',
    tax_rate: data.tax_rate || 0,
    tax_name: data.tax_name || 'VAT',
  }
}

/**
 * Get or create a Stripe Customer on the franchise's connected account.
 * Stores stripe_customer_id on business_profiles for reuse.
 */
export async function getOrCreateStripeCustomer(
  businessId: string,
  connectedAccountId: string
): Promise<string> {
  const supabase = createAdminClient()

  const { data: business, error } = await supabase
    .from('business_profiles')
    .select('stripe_customer_id, business_name, email, city')
    .eq('id', businessId)
    .single()

  if (error || !business) {
    throw new Error(`Business not found: ${businessId}`)
  }

  if (business.stripe_customer_id) {
    return business.stripe_customer_id
  }

  const stripe = getStripeForConnectedAccount(connectedAccountId)

  const customer = await stripe.customers.create({
    name: business.business_name || undefined,
    email: business.email || undefined,
    metadata: {
      business_id: businessId,
      city: business.city,
      platform: 'qwikker',
    },
  })

  await supabase
    .from('business_profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', businessId)

  return customer.id
}

interface CheckoutSessionParams {
  businessId: string
  tierName: string
  tierDisplayName: string
  billingCycle: 'monthly' | 'annual'
  price: number
  currency: string
  connectedAccountId: string
  customerId: string
  city: string
  successUrl: string
  cancelUrl: string
}

/**
 * Create a Stripe Checkout Session on the franchise's connected account.
 * Uses inline price_data (no pre-created Price objects needed).
 * Returns the Checkout Session URL.
 */
export async function createCheckoutSession(params: CheckoutSessionParams): Promise<string> {
  const stripe = getStripeForConnectedAccount(params.connectedAccountId)

  const unitAmount = Math.round(params.price * 100)

  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          product_data: {
            name: params.tierDisplayName,
            metadata: {
              tier_name: params.tierName,
              city: params.city,
            },
          },
          unit_amount: unitAmount,
          recurring: {
            interval: params.billingCycle === 'annual' ? 'year' : 'month',
          },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        business_id: params.businessId,
        tier_name: params.tierName,
        city: params.city,
        billing_cycle: params.billingCycle,
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      business_id: params.businessId,
      tier_name: params.tierName,
      city: params.city,
    },
  })

  if (!session.url) {
    throw new Error('Stripe Checkout Session created but no URL returned')
  }

  return session.url
}

/**
 * Create a Stripe Customer Portal session on the franchise's connected account.
 * Lets the business manage payment methods, view invoices, cancel subscription.
 */
export async function createPortalSession(
  businessId: string,
  connectedAccountId: string,
  returnUrl: string
): Promise<string> {
  const supabase = createAdminClient()

  const { data: business, error } = await supabase
    .from('business_profiles')
    .select('stripe_customer_id')
    .eq('id', businessId)
    .single()

  if (error || !business?.stripe_customer_id) {
    throw new Error('Business has no Stripe customer ID. They must subscribe first.')
  }

  const stripe = getStripeForConnectedAccount(connectedAccountId)

  const session = await stripe.billingPortal.sessions.create({
    customer: business.stripe_customer_id,
    return_url: returnUrl,
  })

  return session.url
}

/**
 * Look up pricing for a tier from franchise_crm_configs.pricing_cards (JSONB).
 * This is the SAME source the pricing cards UI reads from, ensuring display = charged.
 * Falls back to subscription_tiers if no pricing_cards are configured.
 */
export async function getTierPricing(city: string, tierName: string): Promise<{
  tierDisplayName: string
  monthlyPrice: number
  annualPrice: number | null
  currency: string
  foundingMemberEnabled: boolean
  foundingMemberDiscount: number
} | null> {
  const supabase = createAdminClient()

  const { data: config } = await supabase
    .from('franchise_crm_configs')
    .select('pricing_cards, currency, founding_member_enabled, founding_member_discount')
    .eq('city', city)
    .single()

  if (config?.pricing_cards) {
    const cards = config.pricing_cards as Record<string, any>
    const tierCard = cards[tierName]

    if (tierCard) {
      return {
        tierDisplayName: tierCard.title || tierName.charAt(0).toUpperCase() + tierName.slice(1),
        monthlyPrice: Number(tierCard.price || 0),
        annualPrice: tierCard.annual_price ? Number(tierCard.annual_price) : null,
        currency: config.currency || 'GBP',
        foundingMemberEnabled: config.founding_member_enabled ?? false,
        foundingMemberDiscount: config.founding_member_discount ?? 0,
      }
    }
  }

  const { data: globalTier } = await supabase
    .from('subscription_tiers')
    .select('tier_display_name, monthly_price, yearly_price')
    .eq('tier_name', tierName)
    .eq('is_active', true)
    .single()

  if (globalTier) {
    return {
      tierDisplayName: globalTier.tier_display_name,
      monthlyPrice: Number(globalTier.monthly_price),
      annualPrice: Number(globalTier.yearly_price),
      currency: 'GBP',
      foundingMemberEnabled: false,
      foundingMemberDiscount: 0,
    }
  }

  return null
}
