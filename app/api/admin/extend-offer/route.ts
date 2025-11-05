import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/admin/extend-offer - Extend an offer's end date
 */
export async function POST(request: NextRequest) {
  try {
    const { offerId, newEndDate } = await request.json()

    if (!offerId || !newEndDate) {
      return NextResponse.json({
        success: false,
        error: 'Offer ID and new end date are required'
      }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Update the offer end date
    const { data: updatedOffer, error } = await supabase
      .from('business_offers')
      .update({
        offer_end_date: newEndDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', offerId)
      .select(`
        *,
        business_profiles (
          business_name,
          city
        )
      `)
      .single()

    if (error) {
      console.error('Error extending offer:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Offer "${updatedOffer.offer_name}" extended until ${newEndDate}`,
      offer: {
        id: updatedOffer.id,
        name: updatedOffer.offer_name,
        business: updatedOffer.business_profiles?.business_name,
        oldEndDate: updatedOffer.offer_end_date,
        newEndDate: newEndDate
      }
    })

  } catch (error) {
    console.error('Extend offer error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
