import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userWalletPassId, offerId } = await request.json()
    // businessName available but not currently used

    if (!userWalletPassId || !offerId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: userWalletPassId and offerId' 
      }, { status: 400 })
    }

    // Validate user exists
    if (userWalletPassId === 'guest' || userWalletPassId === 'test' || userWalletPassId.length < 10) {
      return NextResponse.json({ 
        error: 'You need to sign up through the GHL form first to get your Qwikker wallet pass' 
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('city, email, name, first_name, last_name, pass_type_identifier')
      .eq('wallet_pass_id', userWalletPassId)
      .single()

    if (userError || !user) {
      return NextResponse.json({
        error: 'Wallet pass not found. Please contact support if you believe this is an error.'
      }, { status: 404 })
    }

    // Get offer details from business_offers table
    const { data: offer, error: offerError } = await supabase
      .from('business_offers')
      .select(`
        id,
        offer_name,
        offer_value,
        offer_terms,
        offer_end_date,
        business_id,
        business_profiles!inner(business_name, city)
      `)
      .eq('id', offerId)
      .eq('status', 'approved')
      .eq('business_profiles.city', user.city)
      .single()

    if (offerError || !offer) {
      return NextResponse.json({
        error: 'Offer not found or not available in your city'
      }, { status: 404 })
    }

    // Check if user has already claimed this offer
    const { data: existingClaim } = await supabase
      .from('user_offer_claims')
      .select('id, redeemed_at')
      .eq('user_id', userWalletPassId)
      .eq('offer_id', offerId)
      .single()

    if (existingClaim) {
      if (existingClaim.redeemed_at) {
        return NextResponse.json({
          error: 'You have already redeemed this offer'
        }, { status: 400 })
      } else {
        // Already claimed but not redeemed - just add to wallet
        // Continue with wallet update
      }
    } else {
      // Create new claim record
      const { error: claimError } = await supabase
        .from('user_offer_claims')
        .insert({
          user_id: userWalletPassId,
          offer_id: offerId,
          business_id: offer.business_id,
          claimed_at: new Date().toISOString()
        })

      if (claimError) {
        console.error('❌ Error creating offer claim:', claimError)
        return NextResponse.json({
          error: 'Failed to claim offer'
        }, { status: 500 })
      }
    }

    // Now call the existing wallet pass update API
    const walletResponse = await fetch(`${request.nextUrl.origin}/api/walletpass/update-main-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userWalletPassId: userWalletPassId,
        currentOffer: `${offer.offer_name} - ${offer.offer_value}`,
        offerDetails: {
          description: offer.offer_name,
          validUntil: offer.offer_end_date,
          terms: offer.offer_terms,
          businessName: offer.business_profiles.business_name,
          discount: offer.offer_value
        }
      })
    })

    const walletResult = await walletResponse.json()

    if (!walletResponse.ok) {
      return NextResponse.json({
        error: 'Failed to update wallet pass',
        details: walletResult.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `🎉 "${offer.offer_name}" has been added to your wallet pass!`,
      offerName: offer.offer_name,
      businessName: offer.business_profiles.business_name,
      expiryInfo: walletResult.debug?.expiryTime,
      walletResult: walletResult
    })

  } catch (error) {
    console.error('❌ AI Add to Wallet error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
