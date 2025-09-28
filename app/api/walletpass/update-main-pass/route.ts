import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 [WEBHOOK] Back to WalletPush webhook approach - Direct API not working')
    
    const requestBody = await request.json()
    const { userWalletPassId, currentOffer, offerDetails } = requestBody
    
    console.log('📥 [DEBUG] Request data:', { userWalletPassId, currentOffer, offerDetails })
    
    if (!userWalletPassId) {
      return NextResponse.json({ error: 'Missing userWalletPassId' }, { status: 400 })
    }
    
    // Get user's data including GHL contact ID
    const supabase = createServiceRoleClient()
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('city, ghl_contact_id, email, name, first_name, last_name')
      .eq('wallet_pass_id', userWalletPassId)
      .single()
    
    if (userError || !user?.ghl_contact_id) {
      console.error('❌ User not found or missing GHL contact ID:', userError)
      return NextResponse.json({ 
        error: 'User not properly linked to GHL contact - please contact support' 
      }, { status: 404 })
    }
    
    const firstName = user?.first_name || user?.name?.split(' ')[0] || 'User'
    
    // Add timestamp to ensure Current_Offer field actually changes
    const timestamp = new Date().toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
    const offerWithTimestamp = `${currentOffer || 'Offer Redeemed'} (${timestamp})`
    
    // 🎯 WEBHOOK APPROACH: Use the format that worked before
    const WALLETPUSH_WEBHOOK_URL = `https://app.walletpush.io/api/hl-endpoint/IkBldqzvQG4XkoSxkCq8`
    
    const walletPushData = {
      'contact_id': user.ghl_contact_id, // ✅ Use the actual GHL contact ID
      'Current_Offer': offerWithTimestamp, // 🎯 This should trigger Rule 2
      'First_Name': firstName,
      'Last_Message': `Congratulations ${firstName}. You have redeemed: ${currentOffer || 'your offer'}!`,
      'serialNumber': userWalletPassId // Also include wallet pass ID
    }
    
    console.log('📡 [WEBHOOK] Calling WalletPush webhook with correct field names')
    console.log('🔍 [DEBUG] Webhook URL:', WALLETPUSH_WEBHOOK_URL)
    console.log('🔍 [DEBUG] Payload:', JSON.stringify(walletPushData, null, 2))
    
    const response = await fetch(WALLETPUSH_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(walletPushData)
    })
    
    console.log('📡 [DEBUG] WalletPush webhook response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ WalletPush webhook error:', response.status, errorText)
      return NextResponse.json({ 
        error: `WalletPush webhook error: ${response.status}`, 
        details: errorText,
        debug: {
          webhookUrl: WALLETPUSH_WEBHOOK_URL,
          payloadSent: walletPushData
        }
      }, { status: 500 })
    }
    
    const result = await response.json()
    console.log('✅ [WEBHOOK] WalletPush webhook called successfully!')
    console.log('🔍 [DEBUG] Webhook Response:', result)
    
    return NextResponse.json({
      success: true,
      message: 'Offer sent to WalletPush - pass should update shortly!',
      userWalletPassId,
      currentOffer: offerWithTimestamp,
      walletPushResponse: result,
      debug: {
        approach: 'WalletPush Webhook (Direct API not available)',
        webhookUrl: WALLETPUSH_WEBHOOK_URL,
        payloadSent: walletPushData,
        ghlContactId: user.ghl_contact_id
      }
    })
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Error calling WalletPush webhook:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}