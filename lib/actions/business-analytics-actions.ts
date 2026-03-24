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

  // Time-based data for charts
  dailyData: Array<{
    date: string
    views: number
    claims: number
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

export async function getBusinessAnalytics(businessId: string): Promise<BusinessAnalytics> {
  try {
    const supabase = createServiceRoleClient()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

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
    const positiveVibePercent = totalVibes >= 5
      ? Math.round(((vibeRows?.filter(v => v.vibe_rating === 'loved_it' || v.vibe_rating === 'it_was_good').length || 0) / totalVibes) * 100)
      : null

    // 7. DAILY DATA (last 30 days)
    // Supabase returns timestamptz as "2026-01-27 02:07:50.473+00" (space, not T)
    const toDateKey = (ts: string) => new Date(ts).toISOString().split('T')[0]

    const dailyBuckets: Record<string, { views: number; claims: number }> = {}
    for (let i = 0; i < 30; i++) {
      const dateKey = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      dailyBuckets[dateKey] = { views: 0, claims: 0 }
    }
    views?.forEach(v => { const k = toDateKey(v.visit_date); if (dailyBuckets[k]) dailyBuckets[k].views++ })
    claims?.forEach(c => { const k = toDateKey(c.claimed_at); if (dailyBuckets[k]) dailyBuckets[k].claims++ })

    const dailyData = Object.entries(dailyBuckets)
      .map(([date, d]) => ({ date, views: d.views, claims: d.claims }))
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
      dailyData: [],
    }
  }
}
