import { NextRequest, NextResponse } from 'next/server'
import { getWalletPushCredentials } from '@/lib/utils/franchise-config'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 [DEBUG] Starting wallet pass update process')
    
    const requestBody = await request.json()
    const { userWalletPassId, currentOffer, offerDetails } = requestBody
    
    console.log('📥 [DEBUG] Full request body:', JSON.stringify(requestBody, null, 2))
    console.log('📥 [DEBUG] Extracted values:', { 
      userWalletPassId, 
      currentOffer, 
      offerDetails 
    })
    
    if (!userWalletPassId) {
      console.error('❌ Missing userWalletPassId')
      return NextResponse.json(
        { error: 'Missing userWalletPassId' },
        { status: 400 }
      )
    }
    
    // 🎯 DYNAMIC: Get user's city and GHL contact ID for WalletPush webhook
    console.log('🔍 [DEBUG] Looking up user in database...')
    const supabase = createServiceRoleClient()
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('city, ghl_contact_id, name, email')
      .eq('wallet_pass_id', userWalletPassId)
      .single()
    
    console.log('🔍 [DEBUG] Database query result:', { user, userError })
    
    if (userError) {
      console.error('❌ [DEBUG] Database error:', userError)
      return NextResponse.json(
        { error: 'User not found in database', details: userError.message },
        { status: 404 }
      )
    }
    
    const userCity = user?.city || 'bournemouth'
    console.log('🔍 [DEBUG] Getting credentials for city:', userCity)
    const credentials = await getWalletPushCredentials(userCity)
    console.log('🔍 [DEBUG] Retrieved credentials:', { 
      hasApiKey: !!credentials.apiKey, 
      hasTemplateId: !!credentials.templateId, 
      endpointUrl: credentials.endpointUrl 
    })
    
    const MOBILE_WALLET_APP_KEY = credentials.apiKey
    const MOBILE_WALLET_TEMPLATE_ID = credentials.templateId
    const WALLETPUSH_WEBHOOK_URL = credentials.endpointUrl || `https://app.walletpush.io/api/hl-endpoint/IkBldqzvQG4XkoSxkCq8`
    
    if (!MOBILE_WALLET_APP_KEY || !MOBILE_WALLET_TEMPLATE_ID || !WALLETPUSH_WEBHOOK_URL) {
      console.error(`❌ Missing WalletPush credentials for ${userCity}`)
      return NextResponse.json(
        { error: `Missing WalletPush credentials for ${userCity}` },
        { status: 500 }
      )
    }
          
    // 🎯 PROPER FIX: Use the stored GHL contact_id from database
    const ghlContactId = user?.ghl_contact_id
    
    if (!ghlContactId) {
      console.error(`❌ No GHL contact ID found for user ${userWalletPassId}`)
      return NextResponse.json(
        { error: 'User not properly linked to GHL contact - please contact support' },
        { status: 400 }
      )
    }
    
    const walletPushData = {
      'contact_id': ghlContactId, // ✅ Use the actual GHL contact ID
      'Current_Offer': currentOffer || 'No active offer', // ✅ Matches template ${Current_Offer}
      'Last_Message': `Offer claimed: ${offerDetails?.businessName || 'Local Business'}`, // ✅ Matches template ${Last_Message}
      'ID': userWalletPassId // Also include wallet pass ID
    }
    
    console.log('📡 [DEBUG] About to call WalletPush webhook')
    console.log('🔍 [DEBUG] Webhook URL:', WALLETPUSH_WEBHOOK_URL)
    console.log('🔍 [DEBUG] Payload:', JSON.stringify(walletPushData, null, 2))
    
    const response = await fetch(WALLETPUSH_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(walletPushData)
    })
    
    console.log('📡 [DEBUG] WalletPush response status:', response.status)
    console.log('📡 [DEBUG] WalletPush response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [DEBUG] WalletPush webhook error:', response.status, errorText)
      return NextResponse.json(
        { 
          error: `WalletPush webhook error: ${response.status}`, 
          details: errorText,
          debug: {
            userCity,
            ghlContactId,
            webhookUrl: WALLETPUSH_WEBHOOK_URL,
            payloadSent: walletPushData,
            responseStatus: response.status,
            responseHeaders: Object.fromEntries(response.headers.entries())
          }
        },
        { status: 500 }
      )
    }
    
    const result = await response.json() // WalletPush webhooks return JSON
    console.log('✅ [DEBUG] WalletPush webhook called successfully')
    console.log('🔍 [DEBUG] WalletPush response:', JSON.stringify(result, null, 2))
    
    return NextResponse.json({
      success: true,
      message: 'Offer added to wallet pass successfully!',
      userWalletPassId,
      currentOffer,
      walletPushResponse: result,
      debug: {
        userCity,
        ghlContactId,
        webhookUrl: WALLETPUSH_WEBHOOK_URL,
        payloadSent: walletPushData
      }
    })
    
  } catch (error) {
    console.error('❌ [DEBUG] Caught error in wallet pass update:', error)
    console.error('❌ [DEBUG] Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}
