import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFranchiseCity } from '@/lib/utils/franchise-areas'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')

    if (!city) {
      return NextResponse.json({ error: 'City parameter is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    
    // 🎯 SIMPLIFIED FRANCHISE SYSTEM: Get franchise city
    const franchiseCity = await getFranchiseCity(city)
    console.log(`📊 Comprehensive Analytics for ${city} franchise city: ${franchiseCity}`)

    // Pre-compute date boundaries
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // ── Phase 1: Run all independent queries in parallel ──
    const [
      { data: offerClaimTrends },
      { data: businessVisits },
      { data: businessOfferClaims },
      { count: totalUsers },
      { count: usersWithPasses },
      { count: totalVisitsCount },
      { data: pushNotifications },
    ] = await Promise.all([
      // Offer claim trends -- franchise filtered via app_users join
      supabase
        .from('user_offer_claims')
        .select('claimed_at, business_name, offer_title, app_users!inner(city)')
        .in('app_users.city', [franchiseCity])
        .gte('claimed_at', thirtyDaysAgo.toISOString())
        .order('claimed_at', { ascending: false })
        .limit(500),
      // Business visits for performance map -- franchise filtered
      supabase
        .from('user_business_visits')
        .select('business_id, business_profiles!inner(business_name, business_town, updated_at)')
        .eq('business_profiles.city', franchiseCity)
        .limit(500),
      // Offer claims per business -- franchise filtered via app_users join
      supabase
        .from('user_offer_claims')
        .select('business_id, business_name, app_users!inner(city)')
        .in('app_users.city', [franchiseCity])
        .limit(500),
      // Total users in franchise
      supabase
        .from('app_users')
        .select('*', { count: 'exact', head: true })
        .eq('city', franchiseCity),
      // Users with wallet passes in franchise
      supabase
        .from('app_users')
        .select('*', { count: 'exact', head: true })
        .eq('city', franchiseCity)
        .not('wallet_pass_id', 'is', null),
      // True total visits count (not capped by limit) for accurate avg calculation
      supabase
        .from('user_business_visits')
        .select('*, business_profiles!inner(city)', { count: 'exact', head: true })
        .eq('business_profiles.city', franchiseCity),
      // Push notifications
      supabase
        .from('push_notifications')
        .select('id, created_at, business_id, city')
        .eq('city', franchiseCity)
        .limit(500),
    ])

    // ── Process offer claim trends ──
    const trendMap = new Map()
    offerClaimTrends?.forEach(claim => {
      const date = claim.claimed_at.split('T')[0]
      const key = `${date}-${claim.business_name}`
      if (trendMap.has(key)) {
        trendMap.get(key).claims += 1
      } else {
        trendMap.set(key, { date: claim.claimed_at, business_name: claim.business_name, claims: 1 })
      }
    })
    const processedOfferClaimTrends = Array.from(trendMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // ── Build business performance map ──
    const businessPerformanceMap = new Map()

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

    // ── Pass install rate and average visits ──
    const passInstallRate = totalUsers > 0 
      ? Math.round(((usersWithPasses || 0) / totalUsers) * 100)
      : 0

    const averageVisitsPerUser = totalUsers > 0 
      ? (totalVisitsCount || 0) / totalUsers
      : 0

    // ── Push notification analytics ──
    const pushesThisWeek = pushNotifications?.filter(
      notif => new Date(notif.created_at) >= sevenDaysAgo
    ).length || 0

    // Phase 2: Fetch push-related data that depends on notification IDs
    const notificationIds = pushNotifications?.map(n => n.id) || []
    const pushBusinessIds = [...new Set(pushNotifications?.map(n => n.business_id).filter(Boolean))] || []

    // Run push sub-queries in parallel
    const [businessNamesResult, recipientsResult, clicksResult] = await Promise.all([
      pushBusinessIds.length > 0
        ? supabase.from('business_profiles').select('id, business_name').in('id', pushBusinessIds)
        : Promise.resolve({ data: [] as any[] }),
      notificationIds.length > 0
        ? supabase.from('push_notification_recipients').select('push_notification_id, id').in('push_notification_id', notificationIds).eq('status', 'sent')
        : Promise.resolve({ data: [] as any[] }),
      notificationIds.length > 0
        ? supabase.from('push_notification_clicks').select('push_notification_id, id').in('push_notification_id', notificationIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const businessIdToName = new Map((businessNamesResult.data || []).map((b: any) => [b.id, b.business_name]))
    const sentRecipients = recipientsResult.data || []
    const clicks = clicksResult.data || []

    // Build per-business push notification metrics
    const businessPushMap = new Map()
    pushNotifications?.forEach(notif => {
      const businessName = businessIdToName.get(notif.business_id)
      
      if (businessName) {
        const notifRecipients = sentRecipients?.filter(r => r.push_notification_id === notif.id).length || 0
        const notifClicks = clicks?.filter(c => c.push_notification_id === notif.id).length || 0

        if (businessPushMap.has(businessName)) {
          const existing = businessPushMap.get(businessName)
          businessPushMap.set(businessName, {
            push_sent: existing.push_sent + 1,
            push_recipients: existing.push_recipients + notifRecipients,
            push_clicks: existing.push_clicks + notifClicks
          })
        } else {
          businessPushMap.set(businessName, {
            push_sent: 1,
            push_recipients: notifRecipients,
            push_clicks: notifClicks
          })
        }
      }
    })

    // Merge push metrics into business performance map
    businessPushMap.forEach((pushMetrics, businessName) => {
      if (businessPerformanceMap.has(businessName)) {
        const existing = businessPerformanceMap.get(businessName)
        businessPerformanceMap.set(businessName, {
          ...existing,
          ...pushMetrics
        })
      } else {
        businessPerformanceMap.set(businessName, {
          business_name: businessName,
          total_visits: 0,
          offer_claims: 0,
          last_activity: new Date().toISOString(),
          ...pushMetrics
        })
      }
    })

    // Calculate conversion rates and sort by performance
    const topBusinesses = Array.from(businessPerformanceMap.values())
      .map(business => ({
        ...business,
        conversion_rate: business.total_visits > 0 
          ? Math.round((business.offer_claims / business.total_visits) * 100)
          : 0,
        push_ctr: business.push_recipients > 0
          ? Math.round((business.push_clicks / business.push_recipients) * 100)
          : 0
      }))
      .sort((a, b) => {
        // Sort by total engagement (visits + claims)
        const aEngagement = a.total_visits + a.offer_claims
        const bEngagement = b.total_visits + b.offer_claims
        return bEngagement - aEngagement
      })
      .slice(0, 10) // Top 10 businesses

    return NextResponse.json({
      offerClaimTrends: processedOfferClaimTrends,
      topBusinesses,
      passInstallRate,
      averageVisitsPerUser,
      totalPushNotifications: pushNotifications?.length || 0,
      pushesThisWeek,
      totalPushRecipients: sentRecipients?.length || 0,
      totalPushClicks: clicks?.length || 0
    })

  } catch (error) {
    console.error('Error fetching comprehensive analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}

