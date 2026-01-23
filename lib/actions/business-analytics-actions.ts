'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface BusinessAnalytics {
  // Visit Analytics
  totalVisits: number
  uniqueVisitors: number
  registeredVisitors: number
  anonymousVisitors: number
  visitTrend: number // percentage change from previous period
  
  // Offer Analytics
  totalOfferClaims: number
  activeOffers: number
  claimTrend: number // percentage change
  topOffers: Array<{
    id: string
    offerName: string
    claims: number
    value: string
  }>
  
  // QR Code Analytics
  totalQRScans: number
  qrScanTrend: number
  topQRCodes: Array<{
    id: string
    name: string
    scans: number
  }>
  
  // Conversion Metrics
  conversionRate: number // visits to offer claims
  avgVisitsPerUser: number
  
  // Time-based data for charts
  dailyVisits: Array<{
    date: string
    visits: number
    claims: number
  }>
}

// Lightweight analytics for dashboard home (just recent activity)
export async function getBusinessActivityData(businessId: string): Promise<{
  recentVisits: number
  recentClaims: number
  recentQRScans: number
}> {
  try {
    const supabase = createServiceRoleClient()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    // Get recent visits (last 7 days)
    const { data: visits } = await supabase
      .from('user_business_visits')
      .select('id')
      .eq('business_id', businessId)
      .gte('visit_date', sevenDaysAgo.toISOString())
    
    // Get recent claims (last 7 days)
    const { data: claims } = await supabase
      .from('user_offer_claims')
      .select(`
        id,
        business_offers!inner(business_id)
      `)
      .eq('business_offers.business_id', businessId)
      .gte('claimed_at', sevenDaysAgo.toISOString())
    
    // Get recent QR scans (last 7 days)
    const { data: qrScans } = await supabase
      .from('qr_code_scans')
      .select(`
        id,
        qr_codes!inner(business_id)
      `)
      .eq('qr_codes.business_id', businessId)
      .gte('scanned_at', sevenDaysAgo.toISOString())
    
    return {
      recentVisits: visits?.length || 0,
      recentClaims: claims?.length || 0,
      recentQRScans: qrScans?.length || 0
    }
  } catch (error) {
    console.error('❌ Error fetching business activity:', error)
    return {
      recentVisits: 0,
      recentClaims: 0,
      recentQRScans: 0
    }
  }
}

export async function getBusinessAnalytics(businessId: string): Promise<BusinessAnalytics> {
  try {
    const supabase = createServiceRoleClient()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    
    // 1. VISIT ANALYTICS
    const { data: visits, error: visitsError } = await supabase
      .from('user_business_visits')
      .select('*')
      .eq('business_id', businessId)
      .gte('visit_date', thirtyDaysAgo.toISOString())
    
    const { data: previousVisits } = await supabase
      .from('user_business_visits')
      .select('*')
      .eq('business_id', businessId)
      .gte('visit_date', sixtyDaysAgo.toISOString())
      .lt('visit_date', thirtyDaysAgo.toISOString())
    
    const totalVisits = visits?.length || 0
    const previousTotalVisits = previousVisits?.length || 0
    const visitTrend = previousTotalVisits > 0 
      ? ((totalVisits - previousTotalVisits) / previousTotalVisits) * 100 
      : totalVisits > 0 ? 100 : 0 // If we have visits but no previous visits, show 100% growth
    
    // Count unique visitors (only those with user_id or wallet_pass_id)
    const uniqueVisitors = new Set(
      visits?.map(v => v.user_id || v.wallet_pass_id).filter(Boolean)
    ).size
    
    // Count registered visitors (those with user_id or wallet_pass_id)
    const registeredVisitors = visits?.filter(v => v.user_id || v.wallet_pass_id).length || 0
    
    // Anonymous visitors are those WITHOUT user_id or wallet_pass_id
    const anonymousVisitors = visits?.filter(v => !v.user_id && !v.wallet_pass_id).length || 0
    
    // 2. OFFER ANALYTICS
    const { data: claims } = await supabase
      .from('user_offer_claims')
      .select(`
        *,
        business_offers!inner(
          business_id,
          offer_name,
          offer_value
        )
      `)
      .eq('business_offers.business_id', businessId)
      .gte('claimed_at', thirtyDaysAgo.toISOString())
    
    const { data: previousClaims } = await supabase
      .from('user_offer_claims')
      .select(`
        *,
        business_offers!inner(business_id)
      `)
      .eq('business_offers.business_id', businessId)
      .gte('claimed_at', sixtyDaysAgo.toISOString())
      .lt('claimed_at', thirtyDaysAgo.toISOString())
    
    const totalOfferClaims = claims?.length || 0
    const previousTotalClaims = previousClaims?.length || 0
    const claimTrend = previousTotalClaims > 0
      ? ((totalOfferClaims - previousTotalClaims) / previousTotalClaims) * 100
      : 0
    
    // Count active offers
    const { data: activeOffersData } = await supabase
      .from('business_offers')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'approved')
    
    const activeOffers = activeOffersData?.length || 0
    
    // Top performing offers
    const offerClaimCounts: Record<string, { name: string, value: string, count: number }> = {}
    claims?.forEach(claim => {
      const offerId = claim.offer_id
      if (!offerClaimCounts[offerId]) {
        offerClaimCounts[offerId] = {
          name: claim.business_offers?.offer_name || 'Unknown Offer',
          value: claim.business_offers?.offer_value || '',
          count: 0
        }
      }
      offerClaimCounts[offerId].count++
    })
    
    const topOffers = Object.entries(offerClaimCounts)
      .map(([id, data]) => ({
        id,
        offerName: data.name,
        claims: data.count,
        value: data.value
      }))
      .sort((a, b) => b.claims - a.claims)
      .slice(0, 5)
    
    // 3. QR CODE ANALYTICS
    const { data: qrScans } = await supabase
      .from('qr_code_scans')
      .select(`
        *,
        qr_codes!inner(business_id, qr_name)
      `)
      .eq('qr_codes.business_id', businessId)
      .gte('scanned_at', thirtyDaysAgo.toISOString())
    
    const { data: previousQRScans } = await supabase
      .from('qr_code_scans')
      .select(`
        *,
        qr_codes!inner(business_id)
      `)
      .eq('qr_codes.business_id', businessId)
      .gte('scanned_at', sixtyDaysAgo.toISOString())
      .lt('scanned_at', thirtyDaysAgo.toISOString())
    
    const totalQRScans = qrScans?.length || 0
    const previousTotalQRScans = previousQRScans?.length || 0
    const qrScanTrend = previousTotalQRScans > 0
      ? ((totalQRScans - previousTotalQRScans) / previousTotalQRScans) * 100
      : 0
    
    // Top QR codes
    const qrScanCounts: Record<string, { name: string, count: number }> = {}
    qrScans?.forEach(scan => {
      const qrId = scan.qr_code_id
      if (!qrScanCounts[qrId]) {
        qrScanCounts[qrId] = {
          name: scan.qr_codes?.qr_name || 'Unknown QR',
          count: 0
        }
      }
      qrScanCounts[qrId].count++
    })
    
    const topQRCodes = Object.entries(qrScanCounts)
      .map(([id, data]) => ({
        id,
        name: data.name,
        scans: data.count
      }))
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 5)
    
    // 4. CONVERSION METRICS
    const conversionRate = totalVisits > 0 
      ? (totalOfferClaims / totalVisits) * 100 
      : 0
    
    const avgVisitsPerUser = uniqueVisitors > 0 
      ? totalVisits / uniqueVisitors 
      : 0
    
    // 5. DAILY VISIT/CLAIM DATA (last 30 days)
    const dailyData: Record<string, { visits: number, claims: number }> = {}
    
    // Initialize all dates
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split('T')[0]
      dailyData[dateKey] = { visits: 0, claims: 0 }
    }
    
    // Count visits per day
    visits?.forEach(visit => {
      const dateKey = visit.visit_date.split('T')[0]
      if (dailyData[dateKey]) {
        dailyData[dateKey].visits++
      }
    })
    
    // Count claims per day
    claims?.forEach(claim => {
      const dateKey = claim.claimed_at.split('T')[0]
      if (dailyData[dateKey]) {
        dailyData[dateKey].claims++
      }
    })
    
    const dailyVisits = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        visits: data.visits,
        claims: data.claims
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    return {
      totalVisits,
      uniqueVisitors,
      registeredVisitors,
      anonymousVisitors,
      visitTrend,
      totalOfferClaims,
      activeOffers,
      claimTrend,
      topOffers,
      totalQRScans,
      qrScanTrend,
      topQRCodes,
      conversionRate,
      avgVisitsPerUser,
      dailyVisits
    }
    
  } catch (error) {
    console.error('❌ Error fetching business analytics:', error)
    // Return empty analytics on error
    return {
      totalVisits: 0,
      uniqueVisitors: 0,
      registeredVisitors: 0,
      anonymousVisitors: 0,
      visitTrend: 0,
      totalOfferClaims: 0,
      activeOffers: 0,
      claimTrend: 0,
      topOffers: [],
      totalQRScans: 0,
      qrScanTrend: 0,
      topQRCodes: [],
      conversionRate: 0,
      avgVisitsPerUser: 0,
      dailyVisits: []
    }
  }
}
