import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/check-approved-offers - Check all approved offers in business_offers table
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessName = searchParams.get('businessName') // Optional filter

    const supabase = createAdminClient()

    let query = supabase
      .from('business_offers')
      .select(`
        id,
        business_id,
        offer_name,
        offer_type,
        offer_value,
        offer_terms,
        offer_start_date,
        offer_end_date,
        status,
        approved_at,
        created_at,
        business_profiles (
          business_name,
          city,
          email,
          status
        )
      `)
      .order('created_at', { ascending: false })

    // If searching for specific business
    if (businessName) {
      // We need to join and filter, but Supabase doesn't allow filtering on joined tables directly
      // So we'll get all and filter in JavaScript
    }

    const { data: offers, error } = await query

    if (error) {
      console.error('Error fetching approved offers:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    // Filter by business name if provided
    let filteredOffers = offers || []
    if (businessName) {
      filteredOffers = filteredOffers.filter(offer => 
        offer.business_profiles?.business_name?.toLowerCase().includes(businessName.toLowerCase())
      )
    }

    // Format the response
    const formattedOffers = filteredOffers.map(offer => ({
      offerId: offer.id,
      businessId: offer.business_id,
      businessName: offer.business_profiles?.business_name || 'Unknown Business',
      businessStatus: offer.business_profiles?.status || 'Unknown',
      city: offer.business_profiles?.city || 'Unknown',
      email: offer.business_profiles?.email || 'Unknown',
      offerName: offer.offer_name,
      offerValue: offer.offer_value,
      offerType: offer.offer_type,
      offerTerms: offer.offer_terms,
      startDate: offer.offer_start_date,
      endDate: offer.offer_end_date,
      status: offer.status,
      approvedAt: offer.approved_at,
      createdAt: offer.created_at
    }))

    return NextResponse.json({
      success: true,
      offers: formattedOffers,
      count: formattedOffers.length,
      searchTerm: businessName || null
    })

  } catch (error) {
    console.error('Check approved offers error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
