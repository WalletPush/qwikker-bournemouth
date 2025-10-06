'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface PassStatus {
  wallet_pass_id: string
  status: 'created' | 'installed' | 'active' | 'inactive' | 'deleted'
  last_seen: string
  created_at: string
  city: string
  user_name: string
}

/**
 * Track when a user visits the app (indicates pass is still installed)
 */
export async function updatePassActivity(walletPassId: string) {
  try {
    const supabase = createServiceRoleClient()
    
    // Update last_active_at when user visits
    const { error } = await supabase
      .from('app_users')
      .update({
        last_active_at: new Date().toISOString(),
        wallet_pass_status: 'active' // They're using it, so it's active
      })
      .eq('wallet_pass_id', walletPassId)
    
    if (error) {
      console.error('Error updating pass activity:', error)
      return { success: false }
    }
    
    console.log(`✅ Updated pass activity for ${walletPassId}`)
    return { success: true }
    
  } catch (error) {
    console.error('Error in updatePassActivity:', error)
    return { success: false }
  }
}

/**
 * Get pass status analytics for a city
 */
export async function getCityPassStatus(city: string) {
  try {
    const supabase = createServiceRoleClient()
    
    // Get all passes for the city with their status
    const { data: passes, error } = await supabase
      .from('app_users')
      .select(`
        wallet_pass_id,
        name,
        wallet_pass_status,
        wallet_pass_assigned_at,
        last_active_at,
        created_at
      `)
      .eq('city', city.toLowerCase())
      .not('wallet_pass_id', 'is', null)
    
    if (error) {
      console.error(`Error fetching pass status for ${city}:`, error)
      return {
        total: 0,
        active: 0,
        inactive: 0,
        recentlyActive: 0,
        passes: []
      }
    }
    
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    let active = 0
    let inactive = 0
    let recentlyActive = 0
    
    const passStatuses = passes?.map(pass => {
      const lastActive = pass.last_active_at ? new Date(pass.last_active_at) : null
      const isRecentlyActive = lastActive && lastActive > sevenDaysAgo
      const isActive = lastActive && lastActive > thirtyDaysAgo
      
      if (isRecentlyActive) recentlyActive++
      if (isActive) active++
      else inactive++
      
      return {
        wallet_pass_id: pass.wallet_pass_id,
        user_name: pass.name,
        status: isRecentlyActive ? 'active' : isActive ? 'inactive' : 'possibly_deleted',
        last_seen: pass.last_active_at || pass.created_at,
        created_at: pass.wallet_pass_assigned_at || pass.created_at,
        city: city
      }
    }) || []
    
    return {
      total: passes?.length || 0,
      active,
      inactive,
      recentlyActive,
      passes: passStatuses
    }
    
  } catch (error) {
    console.error(`Error in getCityPassStatus for ${city}:`, error)
    return {
      total: 0,
      active: 0,
      inactive: 0,
      recentlyActive: 0,
      passes: []
    }
  }
}

/**
 * Estimate pass deletions based on inactivity
 */
export async function estimatePassDeletions(city: string) {
  const passStatus = await getCityPassStatus(city)
  
  // Passes inactive for 30+ days are likely deleted
  const likelyDeleted = passStatus.passes.filter(pass => 
    pass.status === 'possibly_deleted'
  )
  
  // Passes active in last 7 days are definitely installed
  const definitelyInstalled = passStatus.passes.filter(pass => 
    pass.status === 'active'
  )
  
  return {
    totalPasses: passStatus.total,
    likelyInstalled: definitelyInstalled.length,
    likelyDeleted: likelyDeleted.length,
    unknown: passStatus.inactive, // Inactive but might still be installed
    installationRate: passStatus.total > 0 
      ? Math.round((definitelyInstalled.length / passStatus.total) * 100)
      : 0
  }
}
