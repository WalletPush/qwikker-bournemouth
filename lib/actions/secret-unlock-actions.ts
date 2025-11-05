'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

interface TrackSecretUnlockParams {
  businessId: string
  itemName: string
  visitorName?: string
  visitorWalletPassId?: string
}

export async function trackSecretUnlock({ 
  businessId, 
  itemName, 
  visitorName, 
  visitorWalletPassId 
}: TrackSecretUnlockParams) {
  try {
    const supabase = createServiceRoleClient()
    
    // Get the visitor's user_id if they have a wallet pass
    let visitorUserId = null
    if (visitorWalletPassId) {
      const { data: visitor } = await supabase
        .from('app_users')
        .select('user_id, first_name, last_name')
        .eq('wallet_pass_id', visitorWalletPassId)
        .single()
      
      if (visitor) {
        visitorUserId = visitor.user_id
        visitorName = `${visitor.first_name} ${visitor.last_name}`.trim()
      }
    }
    
    // Record the unlock for both registered AND anonymous users
    if (visitorUserId || visitorWalletPassId) {
      // Check if this secret was already unlocked by this user (check by user_id OR wallet_pass_id)
      const { data: existingUnlock } = await supabase
        .from('user_secret_unlocks')
        .select('id')
        .eq('business_id', businessId)
        .eq('secret_item_name', itemName)
        .or(`user_id.eq.${visitorUserId || 'null'},wallet_pass_id.eq.${visitorWalletPassId || 'null'}`)
        .single()
      
      if (existingUnlock) {
        console.log(`🤫 Secret "${itemName}" already unlocked by user ${visitorUserId || visitorWalletPassId}`)
        return { success: true, message: 'Secret already unlocked', alreadyUnlocked: true }
      }
      
      const { error: unlockError } = await supabase
        .from('user_secret_unlocks')
        .insert({
          user_id: visitorUserId, // Can be null for anonymous users
          wallet_pass_id: visitorWalletPassId, // Track anonymous users by wallet pass
          business_id: businessId,
          secret_item_name: itemName,
          unlock_date: new Date().toISOString(),
          points_earned: 50 // Standard points for secret unlock
        })
      
      if (unlockError) {
        console.error('❌ Error tracking secret unlock:', unlockError)
        return { success: false, error: unlockError.message }
      }
      
      console.log(`🤫 ✅ Secret unlock tracked: ${itemName} at business ${businessId} by ${visitorName || 'Anonymous'}`)
    } else {
      console.log(`🤫 ⚠️ No tracking data provided for secret unlock: ${itemName} at business ${businessId}`)
    }
    
    return { 
      success: true, 
      message: 'Secret unlock tracked successfully!',
      pointsEarned: visitorUserId ? 50 : 0
    }
    
  } catch (error) {
    console.error('❌ Error in trackSecretUnlock:', error)
    return { success: false, error: 'Failed to track secret unlock' }
  }
}
