import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFranchiseStripeConfig, createPortalSession } from '@/lib/stripe/checkout'

/**
 * POST /api/stripe/create-portal-session
 *
 * Creates a Stripe Customer Portal session on the franchise's connected account.
 * Lets the business manage payment methods, view invoices, cancel subscription.
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
      .select('id, city, stripe_customer_id')
      .eq('id', businessId)
      .single()

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (!business.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. You must subscribe to a plan first.' },
        { status: 400 }
      )
    }

    const franchiseConfig = await getFranchiseStripeConfig(business.city)

    if (!franchiseConfig) {
      return NextResponse.json(
        { error: 'Billing is not configured for your city.' },
        { status: 400 }
      )
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const portalUrl = await createPortalSession(
      businessId,
      franchiseConfig.stripe_account_id,
      `${origin}/dashboard/settings`
    )

    return NextResponse.json({ url: portalUrl })
  } catch (error) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create billing portal session' },
      { status: 500 }
    )
  }
}
