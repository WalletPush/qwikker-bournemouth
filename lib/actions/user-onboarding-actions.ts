'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export async function markFirstVisitCompleted(walletPassId: string) {
  try {
    const supabase = createServiceRoleClient()
    
    const { error } = await supabase
      .from('app_users')
      .update({ first_visit_completed: true })
      .eq('wallet_pass_id', walletPassId)
    
    if (error) {
      console.error('❌ Error marking first visit completed:', error)
      return { success: false, error: error.message }
    }
    
    console.log(`✅ Marked first visit completed for wallet_pass_id: ${walletPassId}`)
    return { success: true }
    
  } catch (error) {
    console.error('❌ Error in markFirstVisitCompleted:', error)
    return { success: false, error: error.message }
  }
}
