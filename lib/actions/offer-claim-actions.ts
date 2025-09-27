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
    
    // 🎫 CRITICAL: Update wallet pass with claimed offer
    if (data.visitorWalletPassId) {
      try {
        console.log('🎫 Updating wallet pass for claimed offer:', data.offerTitle)
        
        const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://qwikkerdashboard-theta.vercel.app'}/api/walletpass/update-main-pass`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userWalletPassId: data.visitorWalletPassId,
            currentOffer: `${data.offerTitle} at ${data.businessName}`,
            offerDetails: {
              business: data.businessName,
              offer: data.offerTitle,
              claimed_at: new Date().toISOString()
            }
          })
        })
        
        if (updateResponse.ok) {
          console.log('✅ Wallet pass updated successfully')
        } else {
          console.error('❌ Failed to update wallet pass:', await updateResponse.text())
        }
      } catch (walletError) {
        console.error('❌ Error updating wallet pass:', walletError)
        // Don't fail the offer claim if wallet update fails
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
