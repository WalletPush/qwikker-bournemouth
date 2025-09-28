import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 [FINAL] Using WalletPush webhook directly (not GHL)')
    
    const requestBody = await request.json()
    const { userWalletPassId, currentOffer, offerDetails } = requestBody
    
    console.log('📥 [DEBUG] Request data:', { userWalletPassId, currentOffer, offerDetails })
    
    if (!userWalletPassId) {
      return NextResponse.json({ error: 'Missing userWalletPassId' }, { status: 400 })
    }
    
    // Get user's data
    const supabase = createServiceRoleClient()
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('city, email, name, first_name, last_name')
      .eq('wallet_pass_id', userWalletPassId)
      .single()
    
    if (userError || !user?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const firstName = user.first_name || user.name?.split(' ')[0] || 'User'
    
    // 🎯 FINAL APPROACH: Call WalletPush webhook directly (not HighLevel endpoint)
    const WALLETPUSH_WEBHOOK_URL = 'https://app.walletpush.io/api/webhook/6949cdc9-dcb2-4b0b-94c9-d2c69b0cb9e0'
    
    // Use the exact format that triggers Rule 2 (Current_Offer "Has Changed")
    const walletPushData = {
      // User identification
      email: user.email,
      serialNumber: userWalletPassId,
      
      // Fields that match your WalletPush template
      First_Name: firstName,
      Current_Offer: currentOffer || 'Offer Redeemed',
      Last_Message: `Offer claimed: ${offerDetails?.businessName || 'Local Business'}`,
      
      // Timestamp to ensure "Has Changed" condition is met
      updated_at: new Date().toISOString()
    }
    
    console.log('📡 [FINAL] Calling WalletPush webhook directly')
    console.log('🔍 [DEBUG] Webhook URL:', WALLETPUSH_WEBHOOK_URL)
    console.log('🔍 [DEBUG] Payload:', JSON.stringify(walletPushData, null, 2))
    
    const response = await fetch(WALLETPUSH_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eDZUgyCo0vUZQWk`, // Using the secret key from your webhook settings
      },
      body: JSON.stringify(walletPushData)
    })
    
    console.log('📡 [DEBUG] WalletPush response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ WalletPush webhook error:', response.status, errorText)
      return NextResponse.json({ 
        error: `WalletPush webhook error: ${response.status}`, 
        details: errorText 
      }, { status: 500 })
    }
    
    const result = await response.json()
    console.log('✅ [FINAL] WalletPush webhook called successfully')
    console.log('🔍 [DEBUG] Response:', result)
    
    return NextResponse.json({
      success: true,
      message: 'Offer added to wallet pass via WalletPush webhook!',
      userWalletPassId,
      currentOffer,
      walletPushResponse: result,
      debug: {
        approach: 'Direct WalletPush webhook call',
        webhookUrl: WALLETPUSH_WEBHOOK_URL,
        payloadSent: walletPushData
      }
    })
    
  } catch (error) {
    console.error('❌ [FINAL] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}