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
    const updateUrl = credentials.endpointUrl // 🎯 DYNAMIC endpoint!
    
    if (!MOBILE_WALLET_APP_KEY || !MOBILE_WALLET_TEMPLATE_ID || !updateUrl) {
      console.error(`❌ Missing WalletPush credentials for ${userCity}`)
      return NextResponse.json(
        { error: `Missing WalletPush credentials for ${userCity}` },
        { status: 500 }
      )
    }
          
          const formData = new URLSearchParams({
            'email': offerDetails?.email || `user-${userWalletPassId}@qwikker.com`,
            'amount_spent': '0', // Set to 0 for offer claims
            'user_id': userWalletPassId,
            'offer': currentOffer || 'No active offer',
            'serial_number': userWalletPassId, // Critical: This is how WalletPush identifies the specific pass
            'current_offer': currentOffer || 'No active offer'
          })
    
    console.log('📡 Submitting to redemption form (LATEST VERSION):', userWalletPassId)
    console.log('🔍 Form URL:', updateUrl)
    console.log('🔍 Form data:', formData.toString())
    console.log('🔍 Auth Key (first 10 chars):', MOBILE_WALLET_APP_KEY?.substring(0, 10) + '...')
    
    const response = await fetch(updateUrl, {
      method: 'POST', // Form submissions use POST
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ WalletPush API error:', response.status, errorText)
      return NextResponse.json(
        { error: `WalletPush error: ${response.status}`, details: errorText },
        { status: 500 }
      )
    }
    
    const result = await response.text() // Forms might return HTML
    console.log('✅ Successfully submitted to redemption form')
    console.log('🔍 Form response:', result.substring(0, 200) + '...')
    
    return NextResponse.json({
      success: true,
      message: 'Redemption form submitted successfully - wallet pass should update',
      userWalletPassId,
      currentOffer,
      formResponse: result.substring(0, 200) + '...'
    })
    
  } catch (error) {
    console.error('❌ Error updating main wallet pass:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
