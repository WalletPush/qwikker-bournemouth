'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface BusinessActivityData {
  recentClaims: number
  recentVisits: number
  totalClaims: number
  totalVisits: number
  uniqueVisitors: number
}

export async function getBusinessActivityData(businessId: string): Promise<BusinessActivityData> {
  try {
    const supabase = createServiceRoleClient()

    // Total offer claims for this business
    const { count: totalClaims } = await supabase
      .from('user_offer_claims')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)

    // Total visits for this business
    const { count: totalVisits } = await supabase
      .from('user_business_visits')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)

    // Unique visitors
    const { data: uniqueVisitors } = await supabase
      .from('user_business_visits')
      .select('user_id, wallet_pass_id')
      .eq('business_id', businessId)

    const uniqueCount = new Set(
      uniqueVisitors?.map(v => v.user_id || v.wallet_pass_id).filter(Boolean) || []
    ).size

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: recentClaims } = await supabase
      .from('user_offer_claims')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('claimed_at', sevenDaysAgo.toISOString())

    const { count: recentVisits } = await supabase
      .from('user_business_visits')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('visit_date', sevenDaysAgo.toISOString())

    return {
      totalClaims: totalClaims || 0,
      totalVisits: totalVisits || 0,
      uniqueVisitors: uniqueCount,
      recentClaims: recentClaims || 0,
      recentVisits: recentVisits || 0
    }

  } catch (error) {
    console.error('Error fetching business activity data:', error)
    return {
      totalClaims: 0,
      totalVisits: 0,
      uniqueVisitors: 0,
      recentClaims: 0,
      recentVisits: 0
    }
  }
}
