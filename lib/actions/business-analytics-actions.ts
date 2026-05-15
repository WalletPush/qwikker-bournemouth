'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface BusinessAnalytics {
  // Profile View Analytics (page views of business detail page)
  totalProfileViews: number
  uniqueViewers: number
  registeredViewers: number
  anonymousViewers: number
  viewTrend: number

  // Offer Analytics
  totalOfferClaims: number
  activeOffers: number
  claimTrend: number
  topOffers: Array<{
    id: string
    offerName: string
    claims: number
    value: string
  }>

  // Saves
  totalSaves: number
  saveTrend: number

  // Loyalty (null if business has no loyalty program)
  loyaltyMembers: number | null
  loyaltyStampEarns: number | null
  loyaltyRedemptions: number | null

  // Booking
  bookingClicks: number

  // Vibes
  totalVibes: number
  positiveVibePercent: number | null
  vibeBreakdown: { loved_it: number; it_was_good: number; not_for_me: number }

  // QR Scans
  totalQRScans: number
  uniqueQRScanners: number
  qrScanTrend: number
  qrScansByTime: { morning: number; afternoon: number; evening: number; night: number }

  // Premium metrics (Spotlight)
  repeatVisitors: number
  firstTimeVisitors: number
  returningVisitors: number
  peakDays: Array<{ day: string; views: number }>
  atlasDirections: number
  aiMentions: number
  aiDiscoveryQueries: Array<{ query: string; count: number }>

  // Time-based data for charts
  dailyData: Array<{
    date: string
    views: number
    claims: number
    scans: number
  }>
}

// Individual activity event for the dashboard feed
export interface ActivityEvent {
  type: 'offer_claim' | 'profile_view' | 'qr_scan'
  firstName: string | null
  itemName?: string
  timestamp: string
}

// Lightweight analytics for dashboard home (recent activity with individual events)
export async function getBusinessActivityData(businessId: string): Promise<{
  recentVisits: number
  recentClaims: number
  recentActivity: ActivityEvent[]
}> {
  try {
    const supabase = createServiceRoleClient()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const [
      { data: visits },
      { data: claims },
    ] = await Promise.all([
      supabase.from('user_business_visits').select('id, visit_date, wallet_pass_id').eq('business_id', businessId).gte('visit_date', sevenDaysAgo.toISOString()).order('visit_date', { ascending: false }).limit(20),
      supabase.from('user_offer_claims').select('id, claimed_at, wallet_pass_id, offer_title').eq('business_id', businessId).gte('claimed_at', sevenDaysAgo.toISOString()).order('claimed_at', { ascending: false }).limit(20),
    ])
    
    // Collect all wallet_pass_ids to batch-lookup names
    const walletPassIds = new Set<string>()
    visits?.forEach(v => { if (v.wallet_pass_id) walletPassIds.add(v.wallet_pass_id) })
    claims?.forEach(c => { if (c.wallet_pass_id) walletPassIds.add(c.wallet_pass_id) })

    // Batch lookup first names from app_users
    const nameMap: Record<string, string> = {}
    if (walletPassIds.size > 0) {
      const { data: users } = await supabase
        .from('app_users')
        .select('wallet_pass_id, first_name, name')
        .in('wallet_pass_id', Array.from(walletPassIds))
      
      users?.forEach(u => {
        const displayName = u.first_name || u.name?.split(' ')[0] || null
        if (displayName && u.wallet_pass_id) {
          nameMap[u.wallet_pass_id] = displayName
        }
      })
    }

    // Build granular activity events
    const recentActivity: ActivityEvent[] = []

    // Individual offer claims
    claims?.forEach(claim => {
      recentActivity.push({
        type: 'offer_claim',
        firstName: claim.wallet_pass_id ? nameMap[claim.wallet_pass_id] || null : null,
        itemName: claim.offer_title || undefined,
        timestamp: claim.claimed_at,
      })
    })

    // Individual profile views (business visits)
    visits?.forEach(visit => {
      recentActivity.push({
        type: 'profile_view',
        firstName: visit.wallet_pass_id ? nameMap[visit.wallet_pass_id] || null : null,
        timestamp: visit.visit_date,
      })
    })

    // Sort by newest first, cap at 15 events
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return {
      recentVisits: visits?.length || 0,
      recentClaims: claims?.length || 0,
      recentActivity: recentActivity.slice(0, 15),
    }
  } catch (error) {
    console.error('Error fetching business activity:', error)
    return {
      recentVisits: 0,
      recentClaims: 0,
      recentActivity: [],
    }
  }
}

export async function getBusinessAnalytics(businessId: string, periodDays: number = 30): Promise<BusinessAnalytics> {
  try {
    const supabase = createServiceRoleClient()
    const now = new Date()
    const periodAgo = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
    const previousPeriodAgo = new Date(now.getTime() - periodDays * 2 * 24 * 60 * 60 * 1000)

    // Aliases for backward compat within the function
    const thirtyDaysAgo = periodAgo
    const sixtyDaysAgo = previousPeriodAgo

    // 1. PROFILE VIEW ANALYTICS (page views only — excludes booking_click events)
    const [
      { data: views },
      { data: previousViews },
      { count: bookingClicksCount },
    ] = await Promise.all([
      supabase.from('user_business_visits').select('*').eq('business_id', businessId).eq('event_type', 'visit').gte('visit_date', thirtyDaysAgo.toISOString()),
      supabase.from('user_business_visits').select('id').eq('business_id', businessId).eq('event_type', 'visit').gte('visit_date', sixtyDaysAgo.toISOString()).lt('visit_date', thirtyDaysAgo.toISOString()),
      supabase.from('user_business_visits').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('event_type', 'booking_click').gte('visit_date', thirtyDaysAgo.toISOString()),
    ])

    const totalProfileViews = views?.length || 0
    const previousTotal = previousViews?.length || 0
    const viewTrend = previousTotal > 0
      ? ((totalProfileViews - previousTotal) / previousTotal) * 100
      : totalProfileViews > 0 ? 100 : 0

    const uniqueViewers = new Set(views?.map(v => v.user_id || v.wallet_pass_id).filter(Boolean)).size
    const registeredViewers = views?.filter(v => v.user_id || v.wallet_pass_id).length || 0
    const anonymousViewers = views?.filter(v => !v.user_id && !v.wallet_pass_id).length || 0

    // 2. OFFER ANALYTICS (user_offer_claims has business_id directly — no join needed)
    const [
      { data: claims },
      { data: previousClaims },
      { data: activeOffersData },
    ] = await Promise.all([
      supabase.from('user_offer_claims').select('id, offer_id, offer_name, offer_title, offer_value, claimed_at').eq('business_id', businessId).gte('claimed_at', thirtyDaysAgo.toISOString()),
      supabase.from('user_offer_claims').select('id').eq('business_id', businessId).gte('claimed_at', sixtyDaysAgo.toISOString()).lt('claimed_at', thirtyDaysAgo.toISOString()),
      supabase.from('business_offers').select('id').eq('business_id', businessId).eq('status', 'approved'),
    ])

    const totalOfferClaims = claims?.length || 0
    const claimTrend = (previousClaims?.length || 0) > 0
      ? ((totalOfferClaims - (previousClaims?.length || 0)) / (previousClaims?.length || 1)) * 100
      : 0

    const offerClaimCounts: Record<string, { name: string; value: string; count: number }> = {}
    claims?.forEach(claim => {
      const offerId = claim.offer_id || claim.id
      if (!offerClaimCounts[offerId]) {
        offerClaimCounts[offerId] = { name: claim.offer_title || claim.offer_name || 'Unknown Offer', value: claim.offer_value || '', count: 0 }
      }
      offerClaimCounts[offerId].count++
    })
    const topOffers = Object.entries(offerClaimCounts)
      .map(([id, data]) => ({ id, offerName: data.name, claims: data.count, value: data.value }))
      .sort((a, b) => b.claims - a.claims)
      .slice(0, 5)

    // 3. SAVES
    const [
      { count: savesCount },
      { count: previousSavesCount },
    ] = await Promise.all([
      supabase.from('user_saved_items').select('*', { count: 'exact', head: true }).eq('item_type', 'business').eq('item_id', businessId).gte('saved_at', thirtyDaysAgo.toISOString()),
      supabase.from('user_saved_items').select('*', { count: 'exact', head: true }).eq('item_type', 'business').eq('item_id', businessId).gte('saved_at', sixtyDaysAgo.toISOString()).lt('saved_at', thirtyDaysAgo.toISOString()),
    ])
    const totalSaves = savesCount || 0
    const saveTrend = (previousSavesCount || 0) > 0
      ? ((totalSaves - (previousSavesCount || 0)) / (previousSavesCount || 1)) * 100
      : 0

    // 4. LOYALTY (only if business has a loyalty program)
    let loyaltyMembers: number | null = null
    let loyaltyStampEarns: number | null = null
    let loyaltyRedemptions: number | null = null

    const { data: loyaltyProgram } = await supabase
      .from('loyalty_programs')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .single()

    if (loyaltyProgram) {
      const [
        { count: membersCount },
        { count: earnsCount },
        { count: redemptionsCount },
      ] = await Promise.all([
        supabase.from('loyalty_memberships').select('*', { count: 'exact', head: true }).eq('program_id', loyaltyProgram.id).eq('status', 'active'),
        supabase.from('loyalty_earn_events').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('valid', true).gte('earned_at', thirtyDaysAgo.toISOString()),
        supabase.from('loyalty_redemptions').select('*', { count: 'exact', head: true }).eq('business_id', businessId).gte('consumed_at', thirtyDaysAgo.toISOString()),
      ])
      loyaltyMembers = membersCount || 0
      loyaltyStampEarns = earnsCount || 0
      loyaltyRedemptions = redemptionsCount || 0
    }

    // 5. VIBES
    const { data: vibeRows } = await supabase
      .from('qwikker_vibes')
      .select('vibe_rating')
      .eq('business_id', businessId)

    const totalVibes = vibeRows?.length || 0
    const vibeBreakdown = {
      loved_it: vibeRows?.filter(v => v.vibe_rating === 'loved_it').length || 0,
      it_was_good: vibeRows?.filter(v => v.vibe_rating === 'it_was_good').length || 0,
      not_for_me: vibeRows?.filter(v => v.vibe_rating === 'not_for_me').length || 0,
    }
    const positiveVibePercent = totalVibes >= 5
      ? Math.round(((vibeBreakdown.loved_it + vibeBreakdown.it_was_good) / totalVibes) * 100)
      : null

    // 6. QR SCANS (via qr_codes linked to this business)
    const { data: businessQRCodes } = await supabase
      .from('qr_codes')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'active')

    let totalQRScans = 0
    let uniqueQRScanners = 0
    let qrScanTrend = 0
    let qrScansByTime = { morning: 0, afternoon: 0, evening: 0, night: 0 }

    if (businessQRCodes && businessQRCodes.length > 0) {
      const qrIds = businessQRCodes.map(qr => qr.id)
      const [
        { data: currentScanRows },
        { count: previousScans },
      ] = await Promise.all([
        supabase.from('qr_code_scans').select('wallet_pass_id, scanned_at').in('qr_code_id', qrIds).gte('scanned_at', thirtyDaysAgo.toISOString()),
        supabase.from('qr_code_scans').select('*', { count: 'exact', head: true }).in('qr_code_id', qrIds).gte('scanned_at', sixtyDaysAgo.toISOString()).lt('scanned_at', thirtyDaysAgo.toISOString()),
      ])

      totalQRScans = currentScanRows?.length || 0
      uniqueQRScanners = new Set(currentScanRows?.map(s => s.wallet_pass_id).filter(Boolean)).size
      qrScanTrend = (previousScans || 0) > 0
        ? ((totalQRScans - (previousScans || 0)) / (previousScans || 1)) * 100
        : totalQRScans > 0 ? 100 : 0

      // Time-of-day breakdown
      currentScanRows?.forEach(scan => {
        const hour = new Date(scan.scanned_at).getHours()
        if (hour >= 6 && hour < 12) qrScansByTime.morning++
        else if (hour >= 12 && hour < 17) qrScansByTime.afternoon++
        else if (hour >= 17 && hour < 22) qrScansByTime.evening++
        else qrScansByTime.night++
      })
    }

    // 7. PREMIUM METRICS — repeat visitors, peak days, atlas data
    const repeatVisitorRows = views?.reduce((acc, v) => {
      const key = v.wallet_pass_id || v.user_id
      if (key) acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    const repeatVisitors = Object.values(repeatVisitorRows).filter(c => c > 1).length
    const firstTimeVisitors = views?.filter(v => v.is_first_visit === true).length || 0
    const returningVisitors = views?.filter(v => v.is_first_visit === false).length || 0

    // Peak days: day-of-week aggregation from visits
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayCounts: Record<string, number> = {}
    dayNames.forEach(d => { dayCounts[d] = 0 })
    views?.forEach(v => {
      const dayName = dayNames[new Date(v.visit_date).getDay()]
      dayCounts[dayName]++
    })
    const peakDays = dayNames.map(day => ({ day, views: dayCounts[day] }))

    // Atlas directions + AI chat mentions
    let atlasDirections = 0
    let aiMentions = 0
    let aiDiscoveryQueries: Array<{ query: string; count: number }> = []

    try {
      // Atlas directions clicked for this business
      const { count: directionsCount } = await supabase
        .from('atlas_analytics').select('*', { count: 'exact', head: true })
        .eq('business_id', businessId).eq('event_type', 'atlas_directions_clicked')
        .gte('created_at', thirtyDaysAgo.toISOString())
      atlasDirections = directionsCount || 0

      // AI chat mentions: count messages where AI recommended this business
      // Business links in AI responses use pattern: /user/business/{slug}
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('business_name, city')
        .eq('id', businessId)
        .single()

      if (businessProfile?.business_name) {
        const slugify = (name: string) => name.toLowerCase()
          .replace(/['']/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

        const slug = slugify(businessProfile.business_name)
        const slugVariant = businessProfile.business_name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

        

        // Fetch AI messages in period (role is 'ai' in chat_messages table)
        const { data: allAssistantMsgs } = await supabase
          .from('chat_messages')
          .select('id, session_id, created_at, content')
          .eq('role', 'ai')
          .gte('created_at', thirtyDaysAgo.toISOString())

        const mentionRows = (allAssistantMsgs || []).filter(msg => {
          const c = msg.content || ''
          return c.includes(`/user/business/${slug}`) ||
                 (slugVariant !== slug && c.includes(`/user/business/${slugVariant}`))
        })

        

        aiMentions = mentionRows?.length || 0

        // Get discovery queries: one per session, using the first user message
        // (the original intent that led the AI to recommend this business)
        if (mentionRows.length > 0) {
          const sessionIds = [...new Set(mentionRows.map(r => r.session_id))]
          const { data: allSessionMsgs } = await supabase
            .from('chat_messages')
            .select('content, session_id, role, created_at')
            .in('session_id', sessionIds)
            .order('created_at', { ascending: true })

          if (allSessionMsgs && allSessionMsgs.length > 0) {
            // One query per session: the first user message is the discovery intent
            const sessionFirstQuery: Record<string, string> = {}
            for (const msg of allSessionMsgs) {
              if (msg.role === 'user' && !sessionFirstQuery[msg.session_id]) {
                const text = msg.content.trim()
                if (text.length > 5) sessionFirstQuery[msg.session_id] = text
              }
            }

            const queryCounts: Record<string, number> = {}
            Object.values(sessionFirstQuery).forEach(q => {
              const normalized = q.toLowerCase().slice(0, 150)
              queryCounts[normalized] = (queryCounts[normalized] || 0) + 1
            })

            aiDiscoveryQueries = Object.entries(queryCounts)
              .map(([query, count]) => ({ query, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 20)
          }
        }
      }
    } catch (chatError) {
      console.warn('AI mention analytics failed (non-critical):', chatError)
    }

    // 8. DAILY DATA (last 30 days)
    // Supabase returns timestamptz as "2026-01-27 02:07:50.473+00" (space, not T)
    const toDateKey = (ts: string) => new Date(ts).toISOString().split('T')[0]

    const dailyBuckets: Record<string, { views: number; claims: number; scans: number }> = {}
    for (let i = 0; i < periodDays; i++) {
      const dateKey = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      dailyBuckets[dateKey] = { views: 0, claims: 0, scans: 0 }
    }
    views?.forEach(v => { const k = toDateKey(v.visit_date); if (dailyBuckets[k]) dailyBuckets[k].views++ })
    claims?.forEach(c => { const k = toDateKey(c.claimed_at); if (dailyBuckets[k]) dailyBuckets[k].claims++ })

    // Add QR scan daily data
    if (businessQRCodes && businessQRCodes.length > 0) {
      const qrIds = businessQRCodes.map(qr => qr.id)
      const { data: dailyScans } = await supabase
        .from('qr_code_scans')
        .select('scanned_at')
        .in('qr_code_id', qrIds)
        .gte('scanned_at', thirtyDaysAgo.toISOString())
      dailyScans?.forEach(s => { const k = toDateKey(s.scanned_at); if (dailyBuckets[k]) dailyBuckets[k].scans++ })
    }

    const dailyData = Object.entries(dailyBuckets)
      .map(([date, d]) => ({ date, views: d.views, claims: d.claims, scans: d.scans }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalProfileViews,
      uniqueViewers,
      registeredViewers,
      anonymousViewers,
      viewTrend,
      totalOfferClaims,
      activeOffers: activeOffersData?.length || 0,
      claimTrend,
      topOffers,
      totalSaves,
      saveTrend,
      bookingClicks: bookingClicksCount || 0,
      loyaltyMembers,
      loyaltyStampEarns,
      loyaltyRedemptions,
      totalVibes,
      positiveVibePercent,
      vibeBreakdown,
      totalQRScans,
      uniqueQRScanners,
      qrScanTrend,
      qrScansByTime,
      repeatVisitors,
      firstTimeVisitors,
      returningVisitors,
      peakDays,
      atlasDirections,
      aiMentions,
      aiDiscoveryQueries,
      dailyData,
    }

  } catch (error) {
    console.error('Error fetching business analytics:', error)
    return {
      totalProfileViews: 0,
      uniqueViewers: 0,
      registeredViewers: 0,
      anonymousViewers: 0,
      viewTrend: 0,
      totalOfferClaims: 0,
      activeOffers: 0,
      claimTrend: 0,
      topOffers: [],
      totalSaves: 0,
      saveTrend: 0,
      bookingClicks: 0,
      loyaltyMembers: null,
      loyaltyStampEarns: null,
      loyaltyRedemptions: null,
      totalVibes: 0,
      positiveVibePercent: null,
      vibeBreakdown: { loved_it: 0, it_was_good: 0, not_for_me: 0 },
      totalQRScans: 0,
      uniqueQRScanners: 0,
      qrScanTrend: 0,
      qrScansByTime: { morning: 0, afternoon: 0, evening: 0, night: 0 },
      repeatVisitors: 0,
      firstTimeVisitors: 0,
      returningVisitors: 0,
      peakDays: [],
      atlasDirections: 0,
      aiMentions: 0,
      aiDiscoveryQueries: [],
      dailyData: [],
    }
  }
}
