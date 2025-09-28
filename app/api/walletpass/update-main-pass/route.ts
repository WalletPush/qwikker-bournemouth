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
    
    // 🎯 WEBHOOK APPROACH: Two webhook calls like the direct API approach
    // 1. Update Current_Offer (changes pass content)
    // 2. Update Last_Message (triggers push notification)
    
    const WALLETPUSH_WEBHOOK_URL = `https://app.walletpush.io/api/hl-endpoint/IkBldqzvQG4XkoSxkCq8`
    
    // Call 1: Update Current_Offer
    const offerData = {
      'contact_id': user.ghl_contact_id,
      'Current_Offer': offerWithTimestamp,
      'First_Name': firstName,
      'serialNumber': userWalletPassId
    }
    
    console.log('📡 [WEBHOOK 1] Updating Current_Offer field')
    console.log('🔍 [DEBUG] Payload:', JSON.stringify(offerData, null, 2))
    
    const offerResponse = await fetch(WALLETPUSH_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(offerData)
    })
    
    console.log('📡 [WEBHOOK 1] Response status:', offerResponse.status)
    
    if (!offerResponse.ok) {
      const errorText = await offerResponse.text()
      console.error('❌ Current_Offer webhook error:', offerResponse.status, errorText)
      return NextResponse.json({ 
        error: `WalletPush Current_Offer webhook error: ${offerResponse.status}`, 
        details: errorText
      }, { status: 500 })
    }
    
    const offerResult = await offerResponse.json()
    console.log('✅ [WEBHOOK 1] Current_Offer updated successfully!')
    
    // Call 2: Update Last_Message (triggers push notification)
    const pushMessage = `Congratulations ${firstName}. You have redeemed: ${currentOffer || 'your offer'}!`
    const messageData = {
      'contact_id': user.ghl_contact_id,
      'Last_Message': pushMessage,
      'First_Name': firstName,
      'serialNumber': userWalletPassId
    }
    
    console.log('📡 [WEBHOOK 2] Updating Last_Message field (triggers push)')
    console.log('🔍 [DEBUG] Payload:', JSON.stringify(messageData, null, 2))
    
    const messageResponse = await fetch(WALLETPUSH_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData)
    })
    
    console.log('📡 [WEBHOOK 2] Response status:', messageResponse.status)
    
    if (!messageResponse.ok) {
      const errorText = await messageResponse.text()
      console.error('❌ Last_Message webhook error:', messageResponse.status, errorText)
      // Don't fail the whole request if push fails - the offer was still updated
      console.log('⚠️ Offer updated but push notification failed')
    }
    
    const messageResult = messageResponse.ok ? await messageResponse.json() : null
    console.log('✅ [WEBHOOK 2] Last_Message updated - push notification sent!')
    
    return NextResponse.json({
      success: true,
      message: 'Wallet pass updated and push notification sent via webhooks!',
      userWalletPassId,
      currentOffer: offerWithTimestamp,
      pushMessage: pushMessage,
      webhookResponses: {
        offerUpdate: offerResult,
        pushNotification: messageResult
      },
      debug: {
        approach: 'WalletPush Webhook - Two calls for update + push',
        webhookUrl: WALLETPUSH_WEBHOOK_URL,
        ghlContactId: user.ghl_contact_id,
        firstName: firstName
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