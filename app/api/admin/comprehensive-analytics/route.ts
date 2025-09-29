import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCity } from '@/lib/utils/franchise-areas'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')

    if (!city) {
      return NextResponse.json({ error: 'City parameter is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    
    // 🎯 SIMPLIFIED FRANCHISE SYSTEM: Get franchise city
    const franchiseCity = getFranchiseCity(city)
    console.log(`📊 Comprehensive Analytics for ${city} franchise city: ${franchiseCity}`)

    // Get offer claim trends (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: offerClaimTrends } = await supabase
      .from('user_offer_claims')
      .select(`
        claimed_at,
        business_name,
        offer_title
      `)
      .gte('claimed_at', thirtyDaysAgo.toISOString())
      .order('claimed_at', { ascending: false })

    // Group offer claims by date and business
    const trendMap = new Map()
    offerClaimTrends?.forEach(claim => {
      const date = claim.claimed_at.split('T')[0] // Get date part
      const key = `${date}-${claim.business_name}`
      
      if (trendMap.has(key)) {
        trendMap.get(key).claims += 1
      } else {
        trendMap.set(key, {
          date: claim.claimed_at,
          business_name: claim.business_name,
          claims: 1
        })
      }
    })

    const processedOfferClaimTrends = Array.from(trendMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Get top performing businesses
    const { data: businessVisits } = await supabase
      .from('user_business_visits')
      .select(`
        business_id,
        business_profiles!inner(
          business_name,
          business_town,
          updated_at
        )
      `)
      .eq('business_profiles.business_town', franchiseCity)

    const { data: businessOfferClaims } = await supabase
      .from('user_offer_claims')
      .select(`
        business_id,
        business_name
      `)

    // Calculate business performance metrics
    const businessPerformanceMap = new Map()
    
    // Count visits per business
    businessVisits?.forEach(visit => {
      const businessName = visit.business_profiles?.business_name
      if (businessName) {
        if (businessPerformanceMap.has(businessName)) {
          businessPerformanceMap.get(businessName).total_visits += 1
        } else {
          businessPerformanceMap.set(businessName, {
            business_name: businessName,
            total_visits: 1,
            offer_claims: 0,
            last_activity: visit.business_profiles?.updated_at || new Date().toISOString()
          })
        }
      }
    })

    // Count offer claims per business
    businessOfferClaims?.forEach(claim => {
      if (claim.business_name) {
        if (businessPerformanceMap.has(claim.business_name)) {
          businessPerformanceMap.get(claim.business_name).offer_claims += 1
        } else {
          businessPerformanceMap.set(claim.business_name, {
            business_name: claim.business_name,
            total_visits: 0,
            offer_claims: 1,
            last_activity: new Date().toISOString()
          })
        }
      }
    })

    // Calculate conversion rates and sort by performance
    const topBusinesses = Array.from(businessPerformanceMap.values())
      .map(business => ({
        ...business,
        conversion_rate: business.total_visits > 0 
          ? Math.round((business.offer_claims / business.total_visits) * 100)
          : 0
      }))
      .sort((a, b) => {
        // Sort by total engagement (visits + claims)
        const aEngagement = a.total_visits + a.offer_claims
        const bEngagement = b.total_visits + b.offer_claims
        return bEngagement - aEngagement
      })
      .slice(0, 10) // Top 10 businesses

    // Calculate pass install rate
    const { count: totalUsers } = await supabase
      .from('app_users')
      .select('*', { count: 'exact', head: true })
      .eq('city', franchiseCity)

    const { count: usersWithPasses } = await supabase
      .from('app_users')
      .select('*', { count: 'exact', head: true })
      .eq('city', franchiseCity)
      .not('wallet_pass_id', 'is', null)

    const passInstallRate = totalUsers > 0 
      ? Math.round((usersWithPasses / totalUsers) * 100)
      : 0

    // Calculate average visits per user
    const totalVisits = businessVisits?.length || 0
    const averageVisitsPerUser = totalUsers > 0 
      ? totalVisits / totalUsers
      : 0

    return NextResponse.json({
      offerClaimTrends: processedOfferClaimTrends,
      topBusinesses,
      passInstallRate,
      averageVisitsPerUser
    })

  } catch (error) {
    console.error('Error fetching comprehensive analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}

