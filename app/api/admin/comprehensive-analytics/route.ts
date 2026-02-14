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
      .eq('business_profiles.city', franchiseCity)

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

    // Get push notification analytics
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Get all push notifications for this city directly (no join needed)
    const { data: pushNotifications, error: pushError } = await supabase
      .from('push_notifications')
      .select('id, created_at, business_id, city')
      .eq('city', franchiseCity)

    console.log('📊 Push notifications query:', {
      franchiseCity,
      count: pushNotifications?.length,
      error: pushError,
      sample: pushNotifications?.[0]
    })

    // Get business names for these push notifications
    const businessIds = [...new Set(pushNotifications?.map(n => n.business_id).filter(Boolean))] || []
    const { data: businesses } = await supabase
      .from('business_profiles')
      .select('id, business_name')
      .in('id', businessIds)
    
    const businessIdToName = new Map(businesses?.map(b => [b.id, b.business_name]) || [])

    // Push notifications sent this week
    const pushesThisWeek = pushNotifications?.filter(
      notif => new Date(notif.created_at) >= sevenDaysAgo
    ).length || 0

    // Get all recipients for these notifications
    const notificationIds = pushNotifications?.map(n => n.id) || []
    console.log('📊 Notification IDs:', notificationIds.length)
    
    let sentRecipients: any[] = []
    if (notificationIds.length > 0) {
      // First, let's see ALL recipients regardless of status
      const { data: allRecipients } = await supabase
        .from('push_notification_recipients')
        .select('push_notification_id, id, status')
        .in('push_notification_id', notificationIds)
      
      console.log('📊 ALL Recipients (any status):', {
        total: allRecipients?.length,
        byStatus: allRecipients?.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      })

      const { data, error: recipientsError } = await supabase
        .from('push_notification_recipients')
        .select('push_notification_id, id')
        .in('push_notification_id', notificationIds)
        .eq('status', 'sent')

      console.log('📊 Recipients query (status=sent):', {
        count: data?.length,
        error: recipientsError,
        sample: data?.[0]
      })
      
      sentRecipients = data || []
    }

    // Get all clicks for these recipients
    let clicks: any[] = []
    if (notificationIds.length > 0) {
      const { data, error: clicksError } = await supabase
        .from('push_notification_clicks')
        .select('recipient_id, push_notification_recipients!inner(push_notification_id)')
        .in('push_notification_recipients.push_notification_id', notificationIds)

      console.log('📊 Clicks query:', {
        count: data?.length,
        error: clicksError,
        sample: data?.[0]
      })
      
      clicks = data || []
    }

    // Build per-business push notification metrics
    const businessPushMap = new Map()
    pushNotifications?.forEach(notif => {
      const businessName = businessIdToName.get(notif.business_id)
      
      console.log('📊 Processing notification:', {
        id: notif.id,
        business_id: notif.business_id,
        businessName
      })
      
      if (businessName) {
        // Count sent recipients for this notification
        const notifRecipients = sentRecipients?.filter(r => r.push_notification_id === notif.id).length || 0
        
        // Count clicks for this notification
        const notifClicks = clicks?.filter(c => {
          const recipientNotifId = Array.isArray(c.push_notification_recipients)
            ? c.push_notification_recipients[0]?.push_notification_id
            : c.push_notification_recipients?.push_notification_id
          return recipientNotifId === notif.id
        }).length || 0

        console.log('📊 Business metrics:', {
          businessName,
          notifRecipients,
          notifClicks
        })

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

    console.log('📊 Final business push map:', Array.from(businessPushMap.entries()))

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

