'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getWalletPushCredentials } from '@/lib/utils/franchise-config'
import { estimatePassDeletions } from '@/lib/utils/pass-status-tracker'

interface EnhancedWalletPushAnalytics {
  // Real data from our database
  passesCreatedInDB: number
  activeUsers: number
  inactiveUsers: number
  
  // Estimated data (since WalletPush doesn't provide real-time deletion tracking)
  estimatedInstalled: number
  estimatedDeleted: number
  installationRate: number
  
  // Engagement data from our database
  offersClaimed: number
  offersRedeemed: number
  businessVisits: number
  
  // Real-time activity
  recentActivity: Array<{
    type: 'pass_created' | 'offer_claimed' | 'business_visit'
    user_name: string
    timestamp: string
    details?: string
  }>
  
  // WalletPush API data (if available)
  walletPushData?: {
    passesCreated: number
    passesInstalled: number
    apiSuccess: boolean
  }
}

export async function getEnhancedWalletPushAnalytics(city: string): Promise<EnhancedWalletPushAnalytics> {
  try {
    const supabase = createServiceRoleClient()
    
    // Get real data from our database
    const [
      { count: passesCreatedInDB },
      { count: activeUsers },
      { count: offersClaimed },
      { count: businessVisits }
    ] = await Promise.all([
      // Total passes created for this city
      supabase
        .from('app_users')
        .select('*', { count: 'exact', head: true })
        .eq('city', city.toLowerCase())
        .not('wallet_pass_id', 'is', null),
      
      // Active users (seen in last 30 days)
      supabase
        .from('app_users')
        .select('*', { count: 'exact', head: true })
        .eq('city', city.toLowerCase())
        .eq('wallet_pass_status', 'active')
        .gte('last_active_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Offers claimed in this city
      supabase
        .from('user_offer_claims')
        .select('*', { count: 'exact', head: true }),
        
      // Business visits in this city
      supabase
        .from('user_business_visits')
        .select('*', { count: 'exact', head: true })
    ])
    
    // Get pass deletion estimates
    const deletionEstimates = await estimatePassDeletions(city)
    
    // Get recent activity
    const { data: recentUsers } = await supabase
      .from('app_users')
      .select('name, wallet_pass_assigned_at')
      .eq('city', city.toLowerCase())
      .not('wallet_pass_id', 'is', null)
      .order('wallet_pass_assigned_at', { ascending: false })
      .limit(5)
    
    const { data: recentClaims } = await supabase
      .from('user_offer_claims')
      .select('offer_title, business_name, claimed_at, wallet_pass_id')
      .order('claimed_at', { ascending: false })
      .limit(3)
    
    // Build recent activity
    const recentActivity = []
    
    // Add recent pass creations
    recentUsers?.forEach(user => {
      recentActivity.push({
        type: 'pass_created' as const,
        user_name: user.name || 'Unknown User',
        timestamp: user.wallet_pass_assigned_at || new Date().toISOString(),
        details: `Installed wallet pass in ${city}`
      })
    })
    
    // Add recent offer claims
    recentClaims?.forEach(claim => {
      recentActivity.push({
        type: 'offer_claimed' as const,
        user_name: 'User', // We'd need to join with app_users to get name
        timestamp: claim.claimed_at,
        details: `Claimed "${claim.offer_title}" at ${claim.business_name}`
      })
    })
    
    // Sort by timestamp
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    // Try to get WalletPush API data (optional)
    let walletPushData = undefined
    try {
      const credentials = await getWalletPushCredentials(city)
      if (credentials.apiKey && credentials.templateId) {
        const response = await fetch(`https://app2.walletpush.io/api/v1/templates/${credentials.templateId}/analytics`, {
          headers: { 'Authorization': credentials.apiKey }
        })
        
        if (response.ok) {
          const data = await response.json()
          walletPushData = {
            passesCreated: data.passes_created || 0,
            passesInstalled: data.passes_installed || 0,
            apiSuccess: true
          }
        }
      }
    } catch (error) {
      console.warn(`WalletPush API not available for ${city}:`, error)
    }
    
    return {
      passesCreatedInDB: passesCreatedInDB || 0,
      activeUsers: activeUsers || 0,
      inactiveUsers: (passesCreatedInDB || 0) - (activeUsers || 0),
      estimatedInstalled: deletionEstimates.likelyInstalled,
      estimatedDeleted: deletionEstimates.likelyDeleted,
      installationRate: deletionEstimates.installationRate,
      offersClaimed: offersClaimed || 0,
      offersRedeemed: 0, // We don't track redemptions yet
      businessVisits: businessVisits || 0,
      recentActivity: recentActivity.slice(0, 10),
      walletPushData
    }
    
  } catch (error) {
    console.error(`Error getting enhanced analytics for ${city}:`, error)
    return {
      passesCreatedInDB: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      estimatedInstalled: 0,
      estimatedDeleted: 0,
      installationRate: 0,
      offersClaimed: 0,
      offersRedeemed: 0,
      businessVisits: 0,
      recentActivity: [],
      walletPushData: undefined
    }
  }
}
