import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 [DIRECT API] Using real WalletPush API values from GHL!')
    
    const requestBody = await request.json()
    const { userWalletPassId, currentOffer, offerDetails } = requestBody
    
    console.log('📥 [DEBUG] Request data:', { userWalletPassId, currentOffer, offerDetails })
    
    if (!userWalletPassId) {
      return NextResponse.json({ error: 'Missing userWalletPassId' }, { status: 400 })
    }
    
    // Get user's data including Pass Type ID
    const supabase = createServiceRoleClient()
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('city, email, name, first_name, last_name, pass_type_identifier')
      .eq('wallet_pass_id', userWalletPassId)
      .single()
    
    if (userError || !user?.email) {
      console.error('❌ User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // 🎯 REAL VALUES from GHL Custom Values
    const MOBILE_WALLET_APP_KEY = 'xIwpMeyEfuoAtvyCeLsNkQOuCYnOWahJYDHpQzlLfJbFWhptwLhArhcLcBCfpmF'
    const PASS_TYPE_ID = user.pass_type_identifier // ✅ Use stored Pass Type ID from database!
    
    const firstName = user?.first_name || user?.name?.split(' ')[0] || 'User'
    
    // Add timestamp to make the offer unique and ensure it's different from previous value
    const timestamp = new Date().toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
    const offerValue = `${currentOffer || 'Offer Redeemed'} (${timestamp})`
    
    // 🎯 DIRECT API APPROACH: Two API calls to WalletPush
    // 1. Update Current_Offer (changes pass content)
    // 2. Update Last_Message (triggers push notification)
    
    // Check if we have the Pass Type ID
    if (!PASS_TYPE_ID) {
      console.error('❌ Missing Pass Type ID for user:', userWalletPassId)
      return NextResponse.json({ 
        error: 'Missing Pass Type ID - user may need to recreate wallet pass' 
      }, { status: 400 })
    }

    // API Call 1: Update Current_Offer
    const CURRENT_OFFER_API_URL = `https://app2.walletpush.io/api/v1/passes/${PASS_TYPE_ID}/${userWalletPassId}/values/Current_Offer`
    const offerPayload = {
      value: offerValue
    }
    
    console.log('📡 [API 1] Updating Current_Offer field with REAL values')
    console.log('🔍 [DEBUG] API URL:', CURRENT_OFFER_API_URL)
    console.log('🔍 [DEBUG] Payload:', JSON.stringify(offerPayload, null, 2))
    console.log('🔍 [DEBUG] App Key:', MOBILE_WALLET_APP_KEY.substring(0, 10) + '...')
    
    const offerResponse = await fetch(CURRENT_OFFER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MOBILE_WALLET_APP_KEY, // Direct app key (no Bearer)
      },
      body: JSON.stringify(offerPayload)
    })
    
    console.log('📡 [API 1] Current_Offer response status:', offerResponse.status)
    
    if (!offerResponse.ok) {
      const errorText = await offerResponse.text()
      console.error('❌ Current_Offer API error:', offerResponse.status, errorText)
      return NextResponse.json({ 
        error: `WalletPush Current_Offer API error: ${offerResponse.status}`, 
        details: errorText,
        debug: {
          apiUrl: CURRENT_OFFER_API_URL,
          passTypeId: PASS_TYPE_ID,
          passId: userWalletPassId,
          appKey: MOBILE_WALLET_APP_KEY.substring(0, 10) + '...'
        }
      }, { status: 500 })
    }
    
    const offerResult = await offerResponse.text()
    console.log('✅ [API 1] Current_Offer updated successfully!')
    console.log('🔍 [DEBUG] Offer API Response:', offerResult)
    
    // API Call 2: Update Last_Message (triggers push notification)
    const LAST_MESSAGE_API_URL = `https://app2.walletpush.io/api/v1/passes/${PASS_TYPE_ID}/${userWalletPassId}/values/Last_Message`
    const pushMessage = `Congratulations ${firstName}. You have redeemed: ${currentOffer || 'your offer'}!`
    const messagePayload = {
      value: pushMessage
    }
    
    console.log('📡 [API 2] Updating Last_Message field (triggers push)')
    console.log('🔍 [DEBUG] API URL:', LAST_MESSAGE_API_URL)
    console.log('🔍 [DEBUG] Payload:', JSON.stringify(messagePayload, null, 2))
    
    const messageResponse = await fetch(LAST_MESSAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MOBILE_WALLET_APP_KEY,
      },
      body: JSON.stringify(messagePayload)
    })
    
    console.log('📡 [API 2] Last_Message response status:', messageResponse.status)
    
    if (!messageResponse.ok) {
      const errorText = await messageResponse.text()
      console.error('❌ Last_Message API error:', messageResponse.status, errorText)
      // Don't fail the whole request if push fails - the offer was still updated
      console.log('⚠️ Offer updated but push notification failed')
    }
    
    const messageResult = await messageResponse.text()
    console.log('✅ [API 2] Last_Message updated - push notification sent!')
    console.log('🔍 [DEBUG] Message API Response:', messageResult)
    
    return NextResponse.json({
      success: true,
      message: 'Wallet pass updated and push notification sent via direct API!',
      userWalletPassId,
      currentOffer: offerValue,
      pushMessage: pushMessage,
      apiResponses: {
        offerUpdate: offerResult,
        pushNotification: messageResult
      },
        debug: {
          approach: 'Direct WalletPush API with stored Pass Type ID',
          offerApiUrl: CURRENT_OFFER_API_URL,
          messageApiUrl: LAST_MESSAGE_API_URL,
          passTypeId: PASS_TYPE_ID,
          firstName: firstName,
          appKeyUsed: MOBILE_WALLET_APP_KEY.substring(0, 10) + '...'
        }
    })
    
  } catch (error) {
    console.error('❌ [DIRECT API] Error calling WalletPush API:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}