'use server'

import { createClient } from '@/lib/supabase/server'

export async function getUserForChat(walletPassId?: string) {
  const supabase = await createClient()
  
  try {
    // In production, walletPassId comes from URL param, cookie, or localStorage
    const targetWalletPassId = walletPassId || 'QWIK-BOURNEMOUTH-DAVID-2024'
    
    const { data: user, error } = await supabase
      .from('app_users')
      .select('name, level, tier, total_points, city, preferred_categories')
      .eq('wallet_pass_id', targetWalletPassId)
      .single()
    
    if (error || !user) {
      // Fallback to generic user for demo
      return {
        success: true,
        user: {
          name: 'Qwikker Explorer',
          level: 1,
          tier: 'explorer',
          total_points: 0,
          city: 'bournemouth',
          preferred_categories: []
        }
      }
    }
    
    return { success: true, user }
  } catch (error) {
    console.error('Error fetching user for chat:', error)
    return {
      success: false,
      user: {
        name: 'Qwikker Explorer',
        level: 1,
        tier: 'explorer',
        total_points: 0,
        city: 'bournemouth',
        preferred_categories: []
      }
    }
  }
}
