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
  
  // Base URL for redirects
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  // Handle errors from Stripe
  if (error) {
    console.error('Stripe Connect OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${baseUrl}/admin?tab=setup&stripe_error=${encodeURIComponent(errorDescription || error)}`
    )
  }
  
  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/admin?tab=setup&stripe_error=Missing authorization code`
    )
  }
  
  try {
    // Decode the state to get the city
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    const { city } = stateData
    
    if (!city) {
      return NextResponse.redirect(
        `${baseUrl}/admin?tab=setup&stripe_error=Invalid state parameter`
      )
    }
    
    // Exchange the authorization code for access token and account ID
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    })
    
    const connectedAccountId = response.stripe_user_id
    
    if (!connectedAccountId) {
      return NextResponse.redirect(
        `${baseUrl}/admin?tab=setup&stripe_error=Failed to get Stripe account ID`
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
        `${baseUrl}/admin?tab=setup&stripe_error=Failed to save Stripe connection`
      )
    }
    
    console.log(`✅ Stripe Connected for ${city}: ${connectedAccountId}`)
    
    // Check if onboarding is complete
    if (!account.charges_enabled || !account.payouts_enabled) {
      // Account needs more onboarding - create an account link
      const accountLink = await stripe.accountLinks.create({
        account: connectedAccountId,
        refresh_url: `${baseUrl}/api/admin/billing/stripe-callback?retry=true&city=${city}`,
        return_url: `${baseUrl}/admin?tab=setup&stripe_success=true`,
        type: 'account_onboarding',
      })
      
      return NextResponse.redirect(accountLink.url)
    }
    
    // Success! Redirect back to admin setup
    return NextResponse.redirect(
      `${baseUrl}/admin?tab=setup&stripe_success=true`
    )
    
  } catch (err) {
    console.error('Stripe Connect callback error:', err)
    return NextResponse.redirect(
      `${baseUrl}/admin?tab=setup&stripe_error=${encodeURIComponent('Failed to connect Stripe account')}`
    )
  }
}
