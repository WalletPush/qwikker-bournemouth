import { NextRequest, NextResponse } from 'next/server'
import { getStripeAccountDetails, createStripeLoginLink } from '@/lib/stripe/config'
import { cookies } from 'next/headers'

/**
 * GET /api/admin/billing/stripe-status
 * 
 * Gets the current Stripe Connect status for a franchise.
 * Returns account details and a login link if connected.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')
    const accountId = searchParams.get('account_id')
    
    if (!city) {
      return NextResponse.json(
        { success: false, error: 'City is required' },
        { status: 400 }
      )
    }
    
    // Verify the request is from an authenticated admin
    const cookieStore = await cookies()
    const adminCity = cookieStore.get('admin_city')?.value
    
    if (!adminCity || adminCity.toLowerCase() !== city.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // If no account ID, return not connected
    if (!accountId) {
      return NextResponse.json({
        success: true,
        connected: false
      })
    }
    
    // Get account details
    const accountDetails = await getStripeAccountDetails(accountId)
    
    if (!accountDetails.success) {
      return NextResponse.json({
        success: true,
        connected: false,
        error: accountDetails.error
      })
    }
    
    // Create login link for dashboard access
    const loginLink = await createStripeLoginLink(accountId)
    
    return NextResponse.json({
      success: true,
      connected: true,
      account: accountDetails.account,
      dashboardUrl: loginLink.success ? loginLink.url : null
    })
    
  } catch (error) {
    console.error('Error checking Stripe status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check Stripe status' },
      { status: 500 }
    )
  }
}

