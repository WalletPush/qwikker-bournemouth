import { NextRequest, NextResponse } from 'next/server'
import { getWalletPushCredentials } from '@/lib/utils/franchise-config'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 [DIRECT API] Using WalletPush Direct API - MUCH SIMPLER!')
    
    const requestBody = await request.json()
    const { userWalletPassId, currentOffer, offerDetails } = requestBody
    
    console.log('📥 [DEBUG] Request data:', { userWalletPassId, currentOffer, offerDetails })
    
    if (!userWalletPassId) {
      return NextResponse.json({ error: 'Missing userWalletPassId' }, { status: 400 })
    }
    
    // Get user's city for dynamic credentials
    const supabase = createServiceRoleClient()
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('city, email, name, first_name, last_name')
      .eq('wallet_pass_id', userWalletPassId)
      .single()
    
    if (userError || !user?.email) {
      console.error('❌ User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const userCity = user?.city || 'bournemouth'
    console.log('🔍 [DEBUG] Getting credentials for city:', userCity)
    const credentials = await getWalletPushCredentials(userCity)
    
    const MOBILE_WALLET_APP_KEY = credentials.apiKey
    const MOBILE_WALLET_TEMPLATE_ID = credentials.templateId
    
    if (!MOBILE_WALLET_APP_KEY || !MOBILE_WALLET_TEMPLATE_ID) {
      console.error(`❌ Missing WalletPush credentials for ${userCity}`)
      return NextResponse.json({ 
        error: `Missing WalletPush credentials for ${userCity}` 
      }, { status: 500 })
    }
    
    // 🎯 DIRECT API APPROACH: Two API calls to WalletPush
    // 1. Update Current_Offer (changes pass content)
    // 2. Update Last_Message (triggers push notification)
    
    const firstName = user?.first_name || user?.name?.split(' ')[0] || 'User'
    
    // Add timestamp to make the offer unique and ensure it's different from previous value
    const timestamp = new Date().toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
    const offerValue = `${currentOffer || 'Offer Redeemed'} (${timestamp})`
    
    // API Call 1: Update Current_Offer
    const CURRENT_OFFER_API_URL = `https://app2.walletpush.io/api/v1/passes/${MOBILE_WALLET_TEMPLATE_ID}/${userWalletPassId}/values/Current_Offer`
    const offerPayload = {
      value: offerValue
    }
    
    console.log('📡 [API 1] Updating Current_Offer field')
    console.log('🔍 [DEBUG] API URL:', CURRENT_OFFER_API_URL)
    console.log('🔍 [DEBUG] Payload:', JSON.stringify(offerPayload, null, 2))
    
    const offerResponse = await fetch(CURRENT_OFFER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MOBILE_WALLET_APP_KEY,
      },
      body: JSON.stringify(offerPayload)
    })
    
    console.log('📡 [API 1] Current_Offer response status:', offerResponse.status)
    
    if (!offerResponse.ok) {
      const errorText = await offerResponse.text()
      console.error('❌ Current_Offer API error:', offerResponse.status, errorText)
      return NextResponse.json({ 
        error: `WalletPush Current_Offer API error: ${offerResponse.status}`, 
        details: errorText
      }, { status: 500 })
    }
    
    const offerResult = await offerResponse.text()
    console.log('✅ [API 1] Current_Offer updated successfully!')
    console.log('🔍 [DEBUG] Offer API Response:', offerResult)
    
    // API Call 2: Update Last_Message (triggers push notification)
    const LAST_MESSAGE_API_URL = `https://app2.walletpush.io/api/v1/passes/${MOBILE_WALLET_TEMPLATE_ID}/${userWalletPassId}/values/Last_Message`
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
      message: 'Wallet pass updated and push notification sent!',
      userWalletPassId,
      currentOffer: offerValue,
      pushMessage: pushMessage,
      apiResponses: {
        offerUpdate: offerResult,
        pushNotification: messageResult
      },
      debug: {
        approach: 'Direct WalletPush API - Two calls for update + push',
        offerApiUrl: CURRENT_OFFER_API_URL,
        messageApiUrl: LAST_MESSAGE_API_URL,
        userCity,
        templateId: MOBILE_WALLET_TEMPLATE_ID,
        firstName: firstName
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