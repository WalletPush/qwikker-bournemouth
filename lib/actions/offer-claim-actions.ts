'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Claim an offer for a user
 */
export async function claimOffer(data: {
  offerId: string
  offerTitle: string
  businessName: string
  businessId?: string
  visitorWalletPassId?: string
}) {
  try {
    const supabase = createServiceRoleClient()
    
    // If we have a wallet pass ID, try to find the user
    let userId = null
    if (data.visitorWalletPassId) {
      const { data: user } = await supabase
        .from('user_members')
        .select('user_id')
        .eq('wallet_pass_id', data.visitorWalletPassId)
        .single()
      
      if (user) {
        userId = user.user_id
      }
    }
    
    // Store the claim in database
    const claimData = {
      offer_id: data.offerId,
      offer_title: data.offerTitle,
      business_name: data.businessName,
      business_id: data.businessId,
      user_id: userId,
      wallet_pass_id: data.visitorWalletPassId,
      claimed_at: new Date().toISOString(),
      status: 'claimed'
    }
    
    const { data: claimRecord, error } = await supabase
      .from('user_offer_claims')
      .insert(claimData)
      .select()
      .single()
    
    if (error) {
      console.error('Error storing offer claim:', error)
      // Don't fail the request - localStorage backup will still work
      return { 
        success: true, 
        message: 'Offer claimed successfully!',
        data: { stored_in_db: false, claim_id: null }
      }
    }
    
    // 🎫 CRITICAL: Trigger GHL "Redemption Made" workflow
    if (data.visitorWalletPassId) {
      try {
        console.log('🎫 Triggering GHL Redemption Made workflow for:', data.offerTitle)
        
        // Get user details for GHL submission
        const { data: user } = await supabase
          .from('user_members')
          .select('email, first_name, last_name')
          .eq('wallet_pass_id', data.visitorWalletPassId)
          .single()
        
        // Prepare data for GHL "Redemption Made" workflow
        const ghlData = {
          email: user?.email || `user-${data.visitorWalletPassId}@qwikker.com`,
          first_name: user?.first_name || 'Qwikker',
          last_name: user?.last_name || 'User',
          serial_number: data.visitorWalletPassId,
          current_offer: `${data.offerTitle} at ${data.businessName}`,
          offer_title: data.offerTitle,
          business_name: data.businessName,
          claimed_at: new Date().toISOString(),
          form_type: 'Redeem Offers' // This should match the filter in your GHL workflow
        }
        
        console.log('📡 Submitting to GHL Redemption Made workflow:', ghlData)
        
        // Submit the "Redeem Offers" form to trigger GHL "Redemption Made" workflow
        const REDEEM_OFFERS_FORM_URL = 'https://bournemouth.qwikker.com/offer-redemption'
        
        // Prepare form data for submission - start with minimal fields
        // Based on the form, we know it has Email and Amount Spent fields
        const formData = new URLSearchParams({
          'email': ghlData.email,
          'amount_spent': '0', // Set to 0 for offer claims (not actual purchases)
          // Add any additional fields that might be required by the GHL workflow
          'serial_number': data.visitorWalletPassId,
          'current_offer': `${data.offerTitle} at ${data.businessName}`,
          'offer_title': data.offerTitle,
          'business_name': data.businessName
        })
        
        console.log('📝 Submitting Redeem Offers form:', formData.toString())
        
        const ghlResponse = await fetch(REDEEM_OFFERS_FORM_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        })
        
        if (ghlResponse.ok) {
          console.log('✅ GHL Redemption Made workflow triggered successfully')
        } else {
          console.error('❌ Failed to trigger GHL workflow:', await ghlResponse.text())
        }
      } catch (ghlError) {
        console.error('❌ Error triggering GHL Redemption Made workflow:', ghlError)
        // Don't fail the offer claim if GHL trigger fails
      }
    }
    
    return { 
      success: true, 
      message: 'Offer claimed successfully!',
      data: { stored_in_db: true, claim_id: claimRecord.id }
    }
    
  } catch (error) {
    console.error('Error in claimOffer:', error)
    return { 
      success: true, // Don't fail the UI experience
      message: 'Offer claimed successfully!',
      data: { stored_in_db: false, claim_id: null }
    }
  }
}

/**
 * Get claimed offers for a user
 */
export async function getClaimedOffers(visitorWalletPassId: string) {
  try {
    const supabase = createServiceRoleClient()
    
    const { data: claims, error } = await supabase
      .from('user_offer_claims')
      .select('*')
      .eq('wallet_pass_id', visitorWalletPassId)
      .order('claimed_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching claimed offers:', error)
      return { success: false, error: error.message, claims: [] }
    }
    
    return { success: true, claims: claims || [] }
    
  } catch (error) {
    console.error('Error in getClaimedOffers:', error)
    return { success: false, error: 'Failed to fetch claimed offers', claims: [] }
  }
}

/**
 * Check if an offer is already claimed by a user
 */
export async function isOfferClaimed(offerId: string, visitorWalletPassId?: string): Promise<boolean> {
  if (!visitorWalletPassId) return false
  
  try {
    const supabase = createServiceRoleClient()
    
    const { data, error } = await supabase
      .from('user_offer_claims')
      .select('id')
      .eq('offer_id', offerId)
      .eq('wallet_pass_id', visitorWalletPassId)
      .single()
    
    return !error && !!data
    
  } catch (error) {
    console.error('Error checking if offer is claimed:', error)
    return false
  }
}
