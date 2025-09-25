import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 Updating main wallet pass with new offer')
    
    const { userWalletPassId, currentOffer, offerDetails } = await request.json()
    
    if (!userWalletPassId) {
      console.error('❌ Missing userWalletPassId')
      return NextResponse.json(
        { error: 'Missing userWalletPassId' },
        { status: 400 }
      )
    }
    
    const MOBILE_WALLET_APP_KEY = process.env.MOBILE_WALLET_APP_KEY
    const MOBILE_WALLET_TEMPLATE_ID = process.env.MOBILE_WALLET_TEMPLATE_ID
    
    if (!MOBILE_WALLET_APP_KEY || !MOBILE_WALLET_TEMPLATE_ID) {
      console.error('❌ Missing WalletPush credentials')
      return NextResponse.json(
        { error: 'Missing WalletPush credentials' },
        { status: 500 }
      )
    }
    
    // Update specific pass by serial number (userWalletPassId)
    const updateUrl = `https://app2.walletpush.io/api/v1/templates/${MOBILE_WALLET_TEMPLATE_ID}/passes/${userWalletPassId}`
    
    const updateData = {
      // Update the Current_Offer field with full offer text
      'Current_Offer': currentOffer || 'No active offer',
      // Update Last_Message with rich offer details (since we can't use separate fields yet)
      'Last_Message': offerDetails ? 
        `${currentOffer} | Valid: ${offerDetails.validUntil ? new Date(offerDetails.validUntil).toLocaleDateString('en-GB') : 'No expiry'} | ${offerDetails.businessName || 'Qwikker Partner'}` :
        `Latest offer: ${currentOffer}`,
      // Add barcode with offer info for business scanning  
      'barcode_message': `QWIKKER-USER-${userWalletPassId}-OFFER-${Date.now()}`,
      'barcode_format': 'PKBarcodeFormatQR'
    }
    
    console.log('📡 Calling WalletPush API to update pass:', userWalletPassId)
    console.log('Update data:', updateData)
    
    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': MOBILE_WALLET_APP_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ WalletPush API error:', response.status, errorText)
      return NextResponse.json(
        { error: `WalletPush error: ${response.status}`, details: errorText },
        { status: 500 }
      )
    }
    
    const result = await response.json()
    console.log('✅ Successfully updated main wallet pass')
    
    return NextResponse.json({
      success: true,
      message: 'Main wallet pass updated successfully',
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
