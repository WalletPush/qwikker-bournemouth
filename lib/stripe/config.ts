import Stripe from 'stripe'

// Platform Stripe client (your main account)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
  typescript: true,
})

// Create a Stripe client for a connected account (franchise)
export function getStripeForConnectedAccount(accountId: string) {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-05-28.basil',
    typescript: true,
    stripeAccount: accountId,
  })
}

// Stripe Connect OAuth URLs
export const STRIPE_CONNECT_CLIENT_ID = process.env.STRIPE_CONNECT_CLIENT_ID!
export const STRIPE_CONNECT_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/billing/stripe-callback`
  : 'http://localhost:3000/api/admin/billing/stripe-callback'

// Generate OAuth URL for connecting a franchise
export function getStripeConnectUrl(state: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: STRIPE_CONNECT_CLIENT_ID,
    scope: 'read_write',
    redirect_uri: STRIPE_CONNECT_REDIRECT_URI,
    state: state, // Contains city info for callback
    'stripe_user[business_type]': 'company',
  })
  
  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`
}
