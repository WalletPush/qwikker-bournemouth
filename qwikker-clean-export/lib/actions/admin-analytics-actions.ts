'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface AdminAnalytics {
  totalUsers: number
  activeUsers: number
  totalBusinesses: number
  approvedBusinesses: number
  pendingApplications: number
  totalOffersClaimed: number
  totalBusinessVisits: number
  recentSignups: number // Last 7 days
  userGrowthPercentage: number
  businessGrowthPercentage: number
}

export async function getAdminAnalytics(city: string): Promise<AdminAnalytics> {
  try {
    const supabase = createServiceRoleClient()
    
    // Get covered areas using the new franchise geography system
    const { data: areasData, error: areasError } = await supabase
      .rpc('get_areas_for_franchise', { franchise_code: city.toLowerCase() })

    let coveredCities: string[] = []
    
    if (areasError || !areasData) {
      console.warn(`⚠️ Admin Analytics: Could not get areas from franchise geography system:`, areasError)
      // Fallback to legacy hardcoded mapping
      const legacyMapping: Record<string, string[]> = {
        'bournemouth': ['bournemouth', 'christchurch', 'poole'],
        'calgary': ['calgary'],
        'london': ['london'],
      }
      coveredCities = legacyMapping[city.toLowerCase()] || [city.toLowerCase()]
      console.log(`📊 Admin Analytics using LEGACY mapping for ${city}:`, coveredCities)
    } else {
      coveredCities = areasData
      console.log(`📊 Admin Analytics for franchise ${city} covering cities:`, coveredCities)
    }
    
    // Get total and active users - FRANCHISE FILTERED
    const { count: totalUsers } = await supabase
      .from('app_users')
      .select('*', { count: 'exact', head: true })
      .in('city', coveredCities)

    const { count: activeUsers } = await supabase
      .from('app_users')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_pass_status', 'active')
      .in('city', coveredCities)

    // Get business metrics - FRANCHISE FILTERED
    const { count: totalBusinesses } = await supabase
      .from('business_profiles')
      .select('*', { count: 'exact', head: true })
      .in('business_town', coveredCities)

    const { count: approvedBusinesses } = await supabase
      .from('business_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .in('business_town', coveredCities)

    const { count: pendingApplications } = await supabase
      .from('business_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_review')
      .in('business_town', coveredCities)

    // Get engagement metrics
    const { count: totalOffersClaimed } = await supabase
      .from('user_offer_claims')
      .select('*', { count: 'exact', head: true })

    const { count: totalBusinessVisits } = await supabase
      .from('user_business_visits')
      .select('*', { count: 'exact', head: true })

    // Get recent signups (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: recentSignups } = await supabase
      .from('app_users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    // Calculate growth percentages (last 7 days vs previous 7 days)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const { count: previousWeekUsers } = await supabase
      .from('app_users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())

    const { count: previousWeekBusinesses } = await supabase
      .from('business_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())

    // Calculate growth percentages
    const userGrowthPercentage = previousWeekUsers > 0 
      ? Math.round(((recentSignups || 0) - previousWeekUsers) / previousWeekUsers * 100)
      : recentSignups > 0 ? 100 : 0

    const businessGrowthPercentage = previousWeekBusinesses > 0 
      ? Math.round(((recentSignups || 0) - previousWeekBusinesses) / previousWeekBusinesses * 100)
      : 0

    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalBusinesses: totalBusinesses || 0,
      approvedBusinesses: approvedBusinesses || 0,
      pendingApplications: pendingApplications || 0,
      totalOffersClaimed: totalOffersClaimed || 0,
      totalBusinessVisits: totalBusinessVisits || 0,
      recentSignups: recentSignups || 0,
      userGrowthPercentage,
      businessGrowthPercentage
    }

  } catch (error) {
    console.error('Error fetching admin analytics:', error)
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalBusinesses: 0,
      approvedBusinesses: 0,
      pendingApplications: 0,
      totalOffersClaimed: 0,
      totalBusinessVisits: 0,
      recentSignups: 0,
      userGrowthPercentage: 0,
      businessGrowthPercentage: 0
    }
  }
}
