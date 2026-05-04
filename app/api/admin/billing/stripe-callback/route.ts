import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/billing/stripe-callback
 * Handles the OAuth callback from Stripe Connect
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  
  // Base URL for redirects -- will be overridden with city subdomain once state is decoded
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  // Handle errors from Stripe
  if (error) {
    console.error('Stripe Connect OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${baseUrl}/admin?stripe_error=${encodeURIComponent(errorDescription || error)}&tab=pricing`
    )
  }
  
  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/admin?stripe_error=Missing authorization code&tab=pricing`
    )
  }
  
  try {
    // Decode the state to get the city
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    const { city } = stateData
    
    if (!city) {
      return NextResponse.redirect(
        `${baseUrl}/admin?stripe_error=Invalid state parameter&tab=pricing`
      )
    }
    
    // Redirect back to the correct city subdomain after OAuth completes
    const isProduction = process.env.NODE_ENV === 'production'
    if (isProduction) {
      baseUrl = `https://${city}.qwikker.com`
    }
    
    // Exchange the authorization code for access token and account ID
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    })
    
    const connectedAccountId = response.stripe_user_id
    
    if (!connectedAccountId) {
      return NextResponse.redirect(
        `${baseUrl}/admin?stripe_error=Failed to get Stripe account ID&tab=pricing`
      )
    }
    
    // Get account details to verify it's properly set up
    const account = await stripe.accounts.retrieve(connectedAccountId)
    
    // Update the franchise config with the connected account info
    const supabase = createAdminClient()
    const { error: updateError } = await supabase
      .from('franchise_crm_configs')
      .update({
        stripe_account_id: connectedAccountId,
        stripe_onboarding_completed: account.charges_enabled && account.payouts_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('city', city.toLowerCase())
    
    if (updateError) {
      console.error('Failed to update franchise config:', updateError)
      return NextResponse.redirect(
        `${baseUrl}/admin?stripe_error=Failed to save Stripe connection&tab=pricing`
      )
    }
    
    console.log(`✅ Stripe Connected for ${city}: ${connectedAccountId}`)
    
    // Check if onboarding is complete
    if (!account.charges_enabled || !account.payouts_enabled) {
      // Account needs more onboarding - create an account link
      const accountLink = await stripe.accountLinks.create({
        account: connectedAccountId,
        refresh_url: `${baseUrl}/api/admin/billing/stripe-callback?retry=true&city=${city}`,
        return_url: `${baseUrl}/admin?stripe_success=true&tab=pricing`,
        type: 'account_onboarding',
      })
      
      return NextResponse.redirect(accountLink.url)
    }
    
    // Success! Redirect back to admin setup at step 4 (integrations)
    return NextResponse.redirect(
      `${baseUrl}/admin?stripe_success=true&tab=pricing`
    )
    
  } catch (err) {
    console.error('Stripe Connect callback error:', err)
    return NextResponse.redirect(
      `${baseUrl}/admin?stripe_error=${encodeURIComponent('Failed to connect Stripe account')}&tab=pricing`
    )
  }
}
