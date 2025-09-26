import { NextRequest, NextResponse } from 'next/server'

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
    
    const MOBILE_WALLET_APP_KEY = process.env.MOBILE_WALLET_APP_KEY
    const MOBILE_WALLET_TEMPLATE_ID = process.env.MOBILE_WALLET_TEMPLATE_ID
    
    if (!MOBILE_WALLET_APP_KEY || !MOBILE_WALLET_TEMPLATE_ID) {
      console.error('❌ Missing WalletPush credentials')
      return NextResponse.json(
        { error: 'Missing WalletPush credentials' },
        { status: 500 }
      )
    }
    
          // Update HighLevel contact to trigger workflow
          const GHL_API_KEY = process.env.GHL_API_KEY
          if (!GHL_API_KEY) {
            console.error('❌ Missing GHL_API_KEY environment variable')
            return NextResponse.json(
              { error: 'Missing HighLevel API key' },
              { status: 500 }
            )
          }

          // First, find the contact by email or serial number
          const email = offerDetails?.email || `user-${userWalletPassId}@qwikker.com`
          const contactSearchUrl = `https://services.leadconnectorhq.com/contacts/search?email=${encodeURIComponent(email)}`
          
          const searchResponse = await fetch(contactSearchUrl, {
            headers: {
              'Authorization': `Bearer ${GHL_API_KEY}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (!searchResponse.ok) {
            console.error('❌ Failed to find contact:', searchResponse.status)
            return NextResponse.json(
              { error: 'Failed to find contact in HighLevel' },
              { status: 500 }
            )
          }
          
          const searchData = await searchResponse.json()
          const contact = searchData.contacts?.[0]
          
          if (!contact) {
            console.error('❌ No contact found with email:', email)
            return NextResponse.json(
              { error: 'Contact not found' },
              { status: 404 }
            )
          }
          
          // Update the contact's Current_Offer field
          const updateUrl = `https://services.leadconnectorhq.com/contacts/${contact.id}`
          const updateData = {
            customFields: {
              'Current_Offer': currentOffer || 'No active offer'
            }
          }
    
    console.log('📡 Calling WalletPush API to update pass:', userWalletPassId)
    console.log('🔍 Template ID:', MOBILE_WALLET_TEMPLATE_ID)
    console.log('🔍 Full Update URL:', updateUrl)
    console.log('🔍 Update data:', updateData)
    console.log('🔍 Auth Key (first 10 chars):', MOBILE_WALLET_APP_KEY?.substring(0, 10) + '...')
    
    const response = await fetch(updateUrl, {
      method: 'PUT', // HighLevel API uses PUT for updates
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
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
    console.log('✅ Successfully updated HighLevel contact - workflow should trigger')
    console.log('🔍 Contact update response:', JSON.stringify(result, null, 2))
    
    return NextResponse.json({
      success: true,
      message: 'HighLevel contact updated successfully - wallet pass should update automatically',
      userWalletPassId,
      currentOffer,
      contactId: contact.id,
      highLevelResponse: result
    })
    
  } catch (error) {
    console.error('❌ Error updating main wallet pass:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
