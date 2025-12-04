import Stripe from 'stripe'

// Lazy-initialized Stripe client (avoids build-time errors when env vars aren't set)
let _stripe: Stripe | null = null

// Get the platform Stripe client (your main account)
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-05-28.basil',
      typescript: true,
    })
  }
  return _stripe
}

// Legacy export for backwards compatibility
export const stripe = {
  get oauth() {
    return getStripe().oauth
  },
  get accounts() {
    return getStripe().accounts
  },
  get accountLinks() {
    return getStripe().accountLinks
  }
}

// Create a Stripe client for a connected account (franchise)
export function getStripeForConnectedAccount(accountId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-05-28.basil',
    typescript: true,
    stripeAccount: accountId,
  })
}

// Stripe Connect OAuth URLs - lazy evaluation
export function getStripeConnectClientId(): string {
  if (!process.env.STRIPE_CONNECT_CLIENT_ID) {
    throw new Error('STRIPE_CONNECT_CLIENT_ID is not configured')
  }
  return process.env.STRIPE_CONNECT_CLIENT_ID
}

export function getStripeConnectRedirectUri(): string {
  return process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/billing/stripe-callback`
    : 'http://localhost:3000/api/admin/billing/stripe-callback'
}

// Generate OAuth URL for connecting a franchise
export function getStripeConnectUrl(state: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: getStripeConnectClientId(),
    scope: 'read_write',
    redirect_uri: getStripeConnectRedirectUri(),
    state: state, // Contains city info for callback
    'stripe_user[business_type]': 'company',
  })
  
  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`
}
