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
    
    // 🎯 DYNAMIC: Get user's city and GHL contact ID for WalletPush webhook
    const supabase = createServiceRoleClient()
    const { data: user } = await supabase
      .from('app_users')
      .select('city, ghl_contact_id')
      .eq('wallet_pass_id', userWalletPassId)
      .single()
    
    const userCity = user?.city || 'bournemouth'
    const credentials = await getWalletPushCredentials(userCity)
    
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
    
    console.log('📡 Calling WalletPush webhook endpoint as instructed:', userWalletPassId)
    console.log('🔍 Webhook URL:', WALLETPUSH_WEBHOOK_URL)
    console.log('🔍 Payload:', walletPushData)
    
    const response = await fetch(WALLETPUSH_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(walletPushData)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ WalletPush webhook error:', response.status, errorText)
      return NextResponse.json(
        { error: `WalletPush webhook error: ${response.status}`, details: errorText },
        { status: 500 }
      )
    }
    
    const result = await response.json() // WalletPush webhooks return JSON
    console.log('✅ WalletPush webhook called successfully')
    console.log('🔍 WalletPush response:', result)
    
    return NextResponse.json({
      success: true,
      message: 'Offer added to wallet pass successfully!',
      userWalletPassId,
      currentOffer,
      walletPushResponse: result
    })
    
  } catch (error) {
    console.error('❌ Error updating main wallet pass:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
