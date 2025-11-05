import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/check-pending-offers - Check all pending offers waiting for approval
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Get all pending offer changes
    const { data: pendingOffers, error } = await supabase
      .from('business_changes')
      .select(`
        id,
        business_id,
        change_type,
        change_data,
        status,
        created_at,
        business_profiles (
          business_name,
          city,
          email
        )
      `)
      .eq('change_type', 'offer')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending offers:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    // Format the response
    const formattedOffers = (pendingOffers || []).map(offer => ({
      changeId: offer.id,
      businessId: offer.business_id,
      businessName: offer.business_profiles?.business_name || 'Unknown Business',
      city: offer.business_profiles?.city || 'Unknown',
      email: offer.business_profiles?.email || 'Unknown',
      offerName: offer.change_data?.offer_name || 'Unknown Offer',
      offerValue: offer.change_data?.offer_value || 'Unknown Value',
      offerType: offer.change_data?.offer_type || 'Unknown Type',
      submittedAt: offer.created_at,
      status: offer.status
    }))

    return NextResponse.json({
      success: true,
      pendingOffers: formattedOffers,
      count: formattedOffers.length
    })

  } catch (error) {
    console.error('Check pending offers error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * POST /api/admin/check-pending-offers - Quick approve all pending offers (for testing)
 */
export async function POST(request: NextRequest) {
  try {
    const { approveAll = false } = await request.json()

    if (!approveAll) {
      return NextResponse.json({
        success: false,
        error: 'Set approveAll: true to approve all pending offers'
      }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get all pending offers
    const { data: pendingOffers } = await supabase
      .from('business_changes')
      .select('id')
      .eq('change_type', 'offer')
      .eq('status', 'pending')

    if (!pendingOffers || pendingOffers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending offers to approve',
        approved: 0
      })
    }

    let approvedCount = 0
    const results = []

    // Approve each offer by calling the existing approve-change API logic
    for (const offer of pendingOffers) {
      try {
        // Call the existing approval logic
        const approvalResponse = await fetch(`${request.nextUrl.origin}/api/admin/approve-change`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify({
            changeId: offer.id,
            action: 'approve'
          })
        })

        if (approvalResponse.ok) {
          approvedCount++
          results.push({ changeId: offer.id, status: 'approved' })
        } else {
          results.push({ changeId: offer.id, status: 'failed', error: await approvalResponse.text() })
        }
      } catch (error) {
        results.push({ changeId: offer.id, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Approved ${approvedCount} out of ${pendingOffers.length} offers`,
      approved: approvedCount,
      total: pendingOffers.length,
      results
    })

  } catch (error) {
    console.error('Bulk approve error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
