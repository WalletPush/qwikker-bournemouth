import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 [DIRECT API] Using WalletPush Direct API with PUT method - WORKING!')
    
    const requestBody = await request.json()
    const { userWalletPassId, currentOffer, offerDetails } = requestBody
    
    console.log('📥 [DEBUG] Request data:', { userWalletPassId, currentOffer, offerDetails })
    
    if (!userWalletPassId) {
      return NextResponse.json({ error: 'Missing userWalletPassId' }, { status: 400 })
    }
    
    // Get user's data including pass_type_identifier
    const supabase = createServiceRoleClient()
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('city, ghl_contact_id, email, name, first_name, last_name, pass_type_identifier')
      .eq('wallet_pass_id', userWalletPassId)
      .single()
    
    if (userError || !user) {
      console.error('❌ User not found:', userError)
      return NextResponse.json({ 
        error: 'User not found - please contact support' 
      }, { status: 404 })
    }
    
    const firstName = user?.first_name || user?.name?.split(' ')[0] || 'User'
    
    // Use stored pass_type_identifier or fallback to default
    const passTypeId = user.pass_type_identifier || 'pass.com.qwikker'
    const serialNumber = userWalletPassId
    const appKey = 'xIwpMeyEfuoAtvyCeLsNkQOuCYhOWahJYDHpQzlLfJbFWhptwLhArihcLcBCfpmF'
    
    // Calculate 12-hour expiry from now (in UK timezone)
    const now = new Date()
    const expiryTime = new Date(now.getTime() + (12 * 60 * 60 * 1000)) // Add 12 hours
    
    // Format expiry as "29 Sep 09:17" in UK timezone
    const expiryFormatted = expiryTime.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short',
      timeZone: 'Europe/London'
    }) + ' ' + expiryTime.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/London'
    })
    
    // Get business name and offer name from request
    const businessName = requestBody.offerDetails?.businessName || 'Business'
    const offerName = currentOffer || 'Offer'
    const passDisplayText = `${offerName} at ${businessName} (Expires: ${expiryFormatted})`
    
    // 🎯 DIRECT API APPROACH: Two PUT calls
    // 1. Update Current_Offer (changes pass content)
    // 2. Update Last_Message (triggers push notification)
    
    const baseUrl = 'https://app2.walletpush.io/api/v1/passes'
    
    // Call 1: Update Current_Offer
    const offerUrl = `${baseUrl}/${passTypeId}/${serialNumber}/values/Current_Offer`
    
    console.log('📡 [API 1] Updating Current_Offer field')
    console.log('🔍 [DEBUG] URL:', offerUrl)
    console.log('🔍 [DEBUG] Payload:', JSON.stringify({ value: passDisplayText }, null, 2))
    
    const offerResponse = await fetch(offerUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': appKey
      },
      body: JSON.stringify({ value: passDisplayText })
    })
    
    console.log('📡 [API 1] Response status:', offerResponse.status)
    
    if (!offerResponse.ok) {
      const errorText = await offerResponse.text()
      console.error('❌ Current_Offer API error:', offerResponse.status, errorText)
      return NextResponse.json({ 
        error: `WalletPush Current_Offer API error: ${offerResponse.status}`, 
        details: errorText
      }, { status: 500 })
    }
    
    const offerResult = await offerResponse.json()
    console.log('✅ [API 1] Current_Offer updated successfully!')
    
    // Call 2: Update Last_Message (triggers push notification)
    const pushMessage = `🎉 Congratulations ${firstName}! You have redeemed: ${currentOffer || 'your offer'}!`
    const messageUrl = `${baseUrl}/${passTypeId}/${serialNumber}/values/Last_Message`
    
    console.log('📡 [API 2] Updating Last_Message field (triggers push)')
    console.log('🔍 [DEBUG] URL:', messageUrl)
    console.log('🔍 [DEBUG] Payload:', JSON.stringify({ value: pushMessage }, null, 2))
    
    const messageResponse = await fetch(messageUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': appKey
      },
      body: JSON.stringify({ value: pushMessage })
    })
    
    console.log('📡 [API 2] Response status:', messageResponse.status)
    
    if (!messageResponse.ok) {
      const errorText = await messageResponse.text()
      console.error('❌ Last_Message API error:', messageResponse.status, errorText)
      // Don't fail the whole request if push fails - the offer was still updated
      console.log('⚠️ Offer updated but push notification failed')
    }
    
    const messageResult = messageResponse.ok ? await messageResponse.json() : null
    console.log('✅ [API 2] Last_Message updated - push notification sent!')
    
    return NextResponse.json({
      success: true,
      message: 'Wallet pass updated and push notification sent via Direct API!',
      userWalletPassId,
      currentOffer: passDisplayText,
      pushMessage: pushMessage,
      apiResponses: {
        offerUpdate: offerResult,
        pushNotification: messageResult
      },
      debug: {
        approach: 'WalletPush Direct API - Two PUT calls for update + push',
        passTypeId: passTypeId,
        serialNumber: serialNumber,
        firstName: firstName,
        businessName: businessName,
        expiryTime: expiryFormatted
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