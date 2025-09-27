import { NextRequest, NextResponse } from 'next/server'
import { getWalletPushCredentials } from '@/lib/utils/franchise-config'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 Updating main wallet pass with new offer')
    
    const { userWalletPassId, currentOffer, offerDetails } = await request.json()
    
    console.log('📥 Received data:', { 
      userWalletPassId, 
      currentOffer: currentOffer?.substring(0, 50) + '...', 
      hasOfferDetails: !!offerDetails 
    })
    
    if (!userWalletPassId) {
      console.error('❌ Missing userWalletPassId')
      return NextResponse.json(
        { error: 'Missing userWalletPassId' },
        { status: 400 }
      )
    }
    
    // 🎯 DYNAMIC: Get user's city to determine which WalletPush endpoint to use
    const supabase = createServiceRoleClient()
    const { data: user } = await supabase
      .from('app_users')
      .select('city')
      .eq('wallet_pass_id', userWalletPassId)
      .single()
    
    const userCity = user?.city || 'bournemouth'
    const credentials = await getWalletPushCredentials(userCity)
    
    const MOBILE_WALLET_APP_KEY = credentials.apiKey
    const MOBILE_WALLET_TEMPLATE_ID = credentials.templateId
    // Use GHL "Redeem Offers" form to trigger "Redemption Made" workflow
    const REDEEM_OFFERS_FORM_URL = `https://${userCity}.qwikker.com/offer-redemption`
    
    if (!MOBILE_WALLET_APP_KEY || !MOBILE_WALLET_TEMPLATE_ID || !REDEEM_OFFERS_FORM_URL) {
      console.error(`❌ Missing WalletPush credentials for ${userCity}`)
      return NextResponse.json(
        { error: `Missing WalletPush credentials for ${userCity}` },
        { status: 500 }
      )
    }
          
    // Submit to GHL "Redeem Offers" form to trigger "Redemption Made" workflow
    const formData = new URLSearchParams({
      'email': offerDetails?.email || `user-${userWalletPassId}@qwikker.com`,
      'amount_spent': '0', // Set to 0 for offer claims (not purchases)
      'serial_number': userWalletPassId,
      'current_offer': currentOffer || 'No active offer',
      'offer_title': offerDetails?.businessName || 'Qwikker Offer',
      'business_name': offerDetails?.businessName || 'Local Business',
      'form_type': 'Redeem Offers' // This should match the filter in your GHL workflow
    })
    
    console.log('📡 Submitting to GHL Redeem Offers form:', userWalletPassId)
    console.log('🔍 Form URL:', REDEEM_OFFERS_FORM_URL)
    console.log('🔍 Form data:', formData.toString())
    
    const response = await fetch(REDEEM_OFFERS_FORM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ GHL form submission error:', response.status, errorText)
      return NextResponse.json(
        { error: `GHL form error: ${response.status}`, details: errorText },
        { status: 500 }
      )
    }
    
    const result = await response.text() // GHL forms return HTML
    console.log('✅ GHL Redeem Offers form submitted successfully')
    console.log('🔍 GHL response (first 200 chars):', result.substring(0, 200))
    
    return NextResponse.json({
      success: true,
      message: 'GHL workflow triggered - wallet pass should update shortly',
      userWalletPassId,
      currentOffer,
      ghlResponse: result.substring(0, 200) + '...'
    })
    
  } catch (error) {
    console.error('❌ Error updating main wallet pass:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
