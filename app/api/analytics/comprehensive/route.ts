import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')
    const businessId = searchParams.get('businessId')
    const walletPassId = searchParams.get('walletPassId')

    if (!city && !businessId && !walletPassId) {
      return NextResponse.json({ 
        success: false, 
        error: 'City, businessId, or walletPassId parameter required' 
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const analytics: any = {}

    if (city) {
      // Admin analytics for city
      analytics.city = await getCityAnalytics(supabase, city)
    }

    if (businessId) {
      // Business analytics
      analytics.business = await getBusinessAnalytics(supabase, businessId)
    }

    if (walletPassId) {
      // User analytics
      analytics.user = await getUserAnalytics(supabase, walletPassId)
    }

    return NextResponse.json({
      success: true,
      analytics
    })

  } catch (error) {
    console.error('Error fetching comprehensive analytics:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics'
    }, { status: 500 })
  }
}

async function getCityAnalytics(supabase: any, city: string) {
  // Get franchise city for filtering
  const { getFranchiseCity } = await import('@/lib/utils/franchise-areas')
  const franchiseCity = await getFranchiseCity(city)

  // Total businesses
  const { count: totalBusinesses } = await supabase
    .from('business_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('city', franchiseCity)

  // Active businesses
  const { count: activeBusinesses } = await supabase
    .from('business_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('city', franchiseCity)
    .eq('status', 'approved')

  // Total users
  const { count: totalUsers } = await supabase
    .from('app_users')
    .select('*', { count: 'exact', head: true })
    .eq('city', franchiseCity)

  // Total offer claims
  const { count: totalOfferClaims } = await supabase
    .from('user_offer_claims')
    .select('*, app_users!inner(city)', { count: 'exact', head: true })
    .eq('app_users.city', franchiseCity)

  // Total business visits
  const { count: totalVisits } = await supabase
    .from('user_business_visits')
    .select('*, app_users!inner(city)', { count: 'exact', head: true })
    .eq('app_users.city', franchiseCity)

  // Recent activity (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { count: recentClaims } = await supabase
    .from('user_offer_claims')
    .select('*, app_users!inner(city)', { count: 'exact', head: true })
    .eq('app_users.city', franchiseCity)
    .gte('claimed_at', thirtyDaysAgo.toISOString())

  const { count: recentVisits } = await supabase
    .from('user_business_visits')
    .select('*, app_users!inner(city)', { count: 'exact', head: true })
    .eq('app_users.city', franchiseCity)
    .gte('visit_date', thirtyDaysAgo.toISOString())

  return {
    totalBusinesses: totalBusinesses || 0,
    activeBusinesses: activeBusinesses || 0,
    totalUsers: totalUsers || 0,
    totalOfferClaims: totalOfferClaims || 0,
    totalVisits: totalVisits || 0,
    recentClaims: recentClaims || 0,
    recentVisits: recentVisits || 0,
    conversionRate: totalUsers > 0 ? ((totalOfferClaims || 0) / totalUsers * 100).toFixed(1) : '0.0'
  }
}

async function getBusinessAnalytics(supabase: any, businessId: string) {
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
    recentVisits: recentVisits || 0,
    conversionRate: totalVisits > 0 ? ((totalClaims || 0) / totalVisits * 100).toFixed(1) : '0.0'
  }
}

async function getUserAnalytics(supabase: any, walletPassId: string) {
  // Get user ID
  const { data: user } = await supabase
    .from('app_users')
    .select('user_id')
    .eq('wallet_pass_id', walletPassId)
    .single()

  if (!user) {
    return {
      totalClaims: 0,
      totalVisits: 0,
      totalSecretUnlocks: 0,
      uniqueBusinessesVisited: 0,
      favoriteCategory: 'None'
    }
  }

  // Total offer claims
  const { count: totalClaims } = await supabase
    .from('user_offer_claims')
    .select('*', { count: 'exact', head: true })
    .or(`user_id.eq.${user.user_id},wallet_pass_id.eq.${walletPassId}`)

  // Total visits
  const { count: totalVisits } = await supabase
    .from('user_business_visits')
    .select('*', { count: 'exact', head: true })
    .or(`user_id.eq.${user.user_id},wallet_pass_id.eq.${walletPassId}`)

  // Total secret unlocks
  const { count: totalSecretUnlocks } = await supabase
    .from('user_secret_unlocks')
    .select('*', { count: 'exact', head: true })
    .or(`user_id.eq.${user.user_id},wallet_pass_id.eq.${walletPassId}`)

  // Unique businesses visited
  const { data: visits } = await supabase
    .from('user_business_visits')
    .select('business_id')
    .or(`user_id.eq.${user.user_id},wallet_pass_id.eq.${walletPassId}`)

  const uniqueBusinesses = new Set(visits?.map(v => v.business_id) || []).size

  // Favorite category (most visited)
  const { data: categoryVisits } = await supabase
    .from('user_business_visits')
    .select(`
      business_id,
      business_profiles!inner(system_category, display_category)
    `)
    .or(`user_id.eq.${user.user_id},wallet_pass_id.eq.${walletPassId}`)

  const categoryCount: { [key: string]: number } = {}
  categoryVisits?.forEach(visit => {
    // Use system_category for stable grouping, display_category for labels
    const category = visit.business_profiles?.system_category
    if (category) {
      categoryCount[category] = (categoryCount[category] || 0) + 1
    }
  })

  const favoriteCategory = Object.keys(categoryCount).length > 0 
    ? Object.keys(categoryCount).reduce((a, b) => categoryCount[a] > categoryCount[b] ? a : b)
    : 'None'

  return {
    totalClaims: totalClaims || 0,
    totalVisits: totalVisits || 0,
    totalSecretUnlocks: totalSecretUnlocks || 0,
    uniqueBusinessesVisited: uniqueBusinesses,
    favoriteCategory
  }
}
