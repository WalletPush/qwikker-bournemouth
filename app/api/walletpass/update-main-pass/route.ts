import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendContactUpdateToGoHighLevel } from '@/lib/integrations'

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 [DEBUG] Starting wallet pass update via GHL contact update')
    
    const requestBody = await request.json()
    const { userWalletPassId, currentOffer, offerDetails } = requestBody
    
    console.log('📥 [DEBUG] Full request body:', JSON.stringify(requestBody, null, 2))
    
    if (!userWalletPassId) {
      console.error('❌ Missing userWalletPassId')
      return NextResponse.json(
        { error: 'Missing userWalletPassId' },
        { status: 400 }
      )
    }
    
    // Get user's data for the GHL contact update
    console.log('🔍 [DEBUG] Looking up user in database...')
    const supabase = createServiceRoleClient()
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('city, email, name, first_name, last_name, ghl_contact_id')
      .eq('wallet_pass_id', userWalletPassId)
      .single()
    
    console.log('🔍 [DEBUG] Database query result:', { user, userError })
    
    if (userError || !user?.email) {
      console.error('❌ [DEBUG] User not found or missing email:', userError)
      return NextResponse.json(
        { error: 'User not found in database or missing email' },
        { status: 404 }
      )
    }
    
    const userCity = user.city || 'bournemouth'
    
    // 🎯 FIXED: Use exact field name from GHL Custom Fields
    // Field is "Current Offer" (with space) not "Current_Offer" (with underscore)
    
    const ghlUpdateData = {
      email: user.email,
      first_name: user.first_name || user.name?.split(' ')[0] || 'User',
      last_name: user.last_name || user.name?.split(' ').slice(1).join(' ') || '',
      contact_id: user.ghl_contact_id, // Include the GHL contact ID if we have it
      
      // 🎯 CRITICAL FIX: Use "Current Offer" (with space) as seen in GHL Custom Fields
      'Current Offer': currentOffer || 'Offer Redeemed',
      
      // Additional fields that might be useful
      'Last Message': `Offer claimed: ${offerDetails?.businessName || 'Local Business'}`,
      
      // Metadata for GHL workflow
      updateType: 'offer_redemption',
      isContactUpdate: true,
      skipSignupNotification: true,
      redemption_timestamp: new Date().toISOString(),
      offer_details: JSON.stringify(offerDetails),
      wallet_pass_id: userWalletPassId
    }
    
    console.log('📡 [DEBUG] About to update GHL contact with CORRECT field names')
    console.log('🔍 [DEBUG] Using "Current Offer" (with space) not "Current_Offer" (with underscore)')
    console.log('🔍 [DEBUG] Update data:', JSON.stringify(ghlUpdateData, null, 2))
    
    try {
      // Use our existing GHL integration to update the contact
      await sendContactUpdateToGoHighLevel(ghlUpdateData, userCity)
      
      console.log('✅ [DEBUG] GHL contact updated successfully with correct field name')
      console.log('🔍 [DEBUG] This should trigger the redemption workflow and update the wallet pass')
      
      return NextResponse.json({
        success: true,
        message: 'Offer redeemed! GHL contact updated with correct field name.',
        userWalletPassId,
        currentOffer,
        userEmail: user.email,
        debug: {
          approach: 'GHL contact update with CORRECT field name "Current Offer"',
          userCity,
          userName: user.name,
          ghlContactId: user.ghl_contact_id,
          fieldUsed: 'Current Offer (with space)',
          updateData: ghlUpdateData
        }
      })
      
    } catch (ghlError) {
      console.error('❌ [DEBUG] GHL contact update failed:', ghlError)
      return NextResponse.json(
        { 
          error: 'Failed to update GHL contact', 
          details: ghlError.message,
          debug: {
            userCity,
            userEmail: user.email,
            ghlUpdateData
          }
        },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Caught error in GHL contact update:', error)
    console.error('❌ [DEBUG] Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}