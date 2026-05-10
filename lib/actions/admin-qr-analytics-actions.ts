'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

interface CountMap {
  [key: string]: number
}

interface PeakTimes {
  morning: number
  afternoon: number
  evening: number
  night: number
}

interface QRAnalyticsItem {
  qr_code: string
  qr_name: string
  business_name: string | null
  category: string | null
  qr_type: string | null
  total_scans: number
  unique_scans: number
  prior_period_scans: number
  last_scanned: string | null
  os_breakdown: CountMap
  browser_breakdown: CountMap
  peak_times: PeakTimes
}

interface DailyScan {
  date: string
  scans: number
}

interface TopPerformer {
  qr_code: string
  qr_name: string
  business_name: string | null
  category: string | null
  total_scans: number
  prior_period_scans: number
  percent_of_total: number
  growth_pct: number | null
}

interface CategoryPerf {
  category: string
  total_scans: number
  qr_count: number
  avg_scans: number
  percent_of_total: number
}

interface CampaignData {
  source: string
  medium: string
  campaign: string
  scans: number
}

interface ConversionData {
  total_scans: number
  identified_users: number
  repeat_users: number
  identification_rate: number
  retention_rate: number
}

interface RepeatScannerData {
  total_unique_scanners: number
  repeat_scanners: number
  repeat_rate: number
  avg_scans_per_repeater: number
}

interface AdminQRAnalyticsResult {
  analytics: QRAnalyticsItem[]
  dailyScans: DailyScan[]
  totalScans: number
  currentPeriodScans: number
  priorPeriodTotalScans: number
  growthPct: number | null
  globalOsBreakdown: CountMap
  globalBrowserBreakdown: CountMap
  globalPeakTimes: PeakTimes
  topRegions: CountMap
  dayOfWeek: CountMap
  topPerformers: TopPerformer[]
  categoryPerformance: CategoryPerf[]
  campaigns: CampaignData[]
  conversions: ConversionData
  repeatScanners: RepeatScannerData
}

/**
 * Fetch QR analytics for the admin city dashboard.
 * Uses service role to bypass RLS (admin auth is cookie-based, not Supabase Auth).
 */
export async function getAdminQRAnalytics(
  city: string,
  daysAgo: number
): Promise<AdminQRAnalyticsResult> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - daysAgo)

  const priorStart = new Date(startDate)
  priorStart.setDate(priorStart.getDate() - daysAgo)

  const emptyPeakTimes: PeakTimes = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  const emptyConversions: ConversionData = { total_scans: 0, identified_users: 0, repeat_users: 0, identification_rate: 0, retention_rate: 0 }
  const emptyRepeat: RepeatScannerData = { total_unique_scanners: 0, repeat_scanners: 0, repeat_rate: 0, avg_scans_per_repeater: 0 }

  const emptyResult: AdminQRAnalyticsResult = {
    analytics: [], dailyScans: [], totalScans: 0, currentPeriodScans: 0, priorPeriodTotalScans: 0, growthPct: null,
    globalOsBreakdown: {}, globalBrowserBreakdown: {},
    globalPeakTimes: emptyPeakTimes, topRegions: {}, dayOfWeek: {},
    topPerformers: [], categoryPerformance: [], campaigns: [],
    conversions: emptyConversions, repeatScanners: emptyRepeat
  }

  // 1. Get active QR codes for this city
  const { data: qrCodes, error: qrError } = await supabase
    .from('qr_codes')
    .select('id, qr_code, name, total_scans, last_scanned_at, category, qr_type, business_id')
    .eq('city', city.toLowerCase())
    .eq('status', 'active')
    .order('total_scans', { ascending: false })

  if (qrError) {
    console.error('❌ Admin QR analytics - qr_codes fetch error:', qrError)
    return emptyResult
  }

  const qrIds = qrCodes?.map(qr => qr.id) || []
  if (qrIds.length === 0) return emptyResult

  // 1b. Look up business names
  const businessIds = [...new Set(qrCodes.filter(qr => qr.business_id).map(qr => qr.business_id))]
  const businessNameMap: Record<string, string> = {}

  if (businessIds.length > 0) {
    const { data: businesses } = await supabase
      .from('business_profiles')
      .select('id, business_name')
      .in('id', businessIds)
    businesses?.forEach(b => { businessNameMap[b.id] = b.business_name })
  }

  // 2. Fetch current period scans (with UTM fields)
  const { data: currentScans } = await supabase
    .from('qr_code_scans')
    .select('qr_code_id, wallet_pass_id, os, browser, country, region, scanned_at, utm_source, utm_medium, utm_campaign')
    .in('qr_code_id', qrIds)
    .gte('scanned_at', startDate.toISOString())

  // 2b. Fetch prior period scans (just IDs for growth comparison)
  const { data: priorScans } = await supabase
    .from('qr_code_scans')
    .select('qr_code_id')
    .in('qr_code_id', qrIds)
    .gte('scanned_at', priorStart.toISOString())
    .lt('scanned_at', startDate.toISOString())

  const priorCountPerQR: CountMap = {}
  priorScans?.forEach(s => {
    priorCountPerQR[s.qr_code_id] = (priorCountPerQR[s.qr_code_id] || 0) + 1
  })
  const priorPeriodTotalScans = priorScans?.length || 0

  // 3. Single pass aggregation over current period scans
  const perQR: Record<string, {
    uniqueUsers: Set<string>
    scanCount: number
    os: CountMap
    browser: CountMap
    peakTimes: PeakTimes
  }> = {}

  const globalOs: CountMap = {}
  const globalBrowser: CountMap = {}
  const globalPeakTimes: PeakTimes = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  const globalRegions: CountMap = {}
  const dayOfWeekCounts: CountMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // For repeat scanner tracking
  const globalUserScans: Record<string, number> = {}

  // For UTM campaign tracking
  const campaignMap: Record<string, { source: string; medium: string; campaign: string; scans: number }> = {}

  currentScans?.forEach(scan => {
    const qrId = scan.qr_code_id

    if (!perQR[qrId]) {
      perQR[qrId] = {
        uniqueUsers: new Set(),
        scanCount: 0,
        os: {},
        browser: {},
        peakTimes: { morning: 0, afternoon: 0, evening: 0, night: 0 }
      }
    }
    const entry = perQR[qrId]
    entry.scanCount++

    // Unique scanners
    const userId = scan.wallet_pass_id || `_anon_${scan.scanned_at}`
    entry.uniqueUsers.add(userId)

    // Global repeat tracking (only for identified users)
    if (scan.wallet_pass_id) {
      globalUserScans[scan.wallet_pass_id] = (globalUserScans[scan.wallet_pass_id] || 0) + 1
    }

    // OS
    const os = scan.os || 'Unknown'
    entry.os[os] = (entry.os[os] || 0) + 1
    globalOs[os] = (globalOs[os] || 0) + 1

    // Browser
    const browser = scan.browser || 'Unknown'
    entry.browser[browser] = (entry.browser[browser] || 0) + 1
    globalBrowser[browser] = (globalBrowser[browser] || 0) + 1

    // Time of day + day of week
    if (scan.scanned_at) {
      const dt = new Date(scan.scanned_at)
      const hour = dt.getHours()
      if (hour >= 6 && hour < 12) { entry.peakTimes.morning++; globalPeakTimes.morning++ }
      else if (hour >= 12 && hour < 18) { entry.peakTimes.afternoon++; globalPeakTimes.afternoon++ }
      else if (hour >= 18 && hour < 24) { entry.peakTimes.evening++; globalPeakTimes.evening++ }
      else { entry.peakTimes.night++; globalPeakTimes.night++ }

      const dayName = dayNames[dt.getDay()]
      dayOfWeekCounts[dayName] = (dayOfWeekCounts[dayName] || 0) + 1
    }

    // Region/country
    const region = [scan.region, scan.country].filter(Boolean).join(', ') || 'Unknown'
    if (region !== 'Unknown') {
      globalRegions[region] = (globalRegions[region] || 0) + 1
    }

    // UTM campaigns
    if (scan.utm_source || scan.utm_campaign) {
      const key = `${scan.utm_source || 'direct'}|${scan.utm_medium || 'none'}|${scan.utm_campaign || 'none'}`
      if (!campaignMap[key]) {
        campaignMap[key] = {
          source: scan.utm_source || 'direct',
          medium: scan.utm_medium || 'none',
          campaign: scan.utm_campaign || 'none',
          scans: 0
        }
      }
      campaignMap[key].scans++
    }
  })

  // Sort regions, keep top 10
  const topRegions: CountMap = {}
  Object.entries(globalRegions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([key, val]) => { topRegions[key] = val })

  // 4. Repeat scanner stats
  const identifiedUsers = Object.keys(globalUserScans)
  const repeaters = identifiedUsers.filter(id => globalUserScans[id] > 1)
  const totalRepeatScans = repeaters.reduce((sum, id) => sum + globalUserScans[id], 0)
  const repeatScanners: RepeatScannerData = {
    total_unique_scanners: identifiedUsers.length,
    repeat_scanners: repeaters.length,
    repeat_rate: identifiedUsers.length > 0 ? Math.round((repeaters.length / identifiedUsers.length) * 100) : 0,
    avg_scans_per_repeater: repeaters.length > 0 ? Math.round((totalRepeatScans / repeaters.length) * 10) / 10 : 0
  }

  // 5. Campaign data sorted by scans
  const campaigns: CampaignData[] = Object.values(campaignMap)
    .sort((a, b) => b.scans - a.scans)
    .slice(0, 15)

  // 6. Build per-code analytics
  const analytics: QRAnalyticsItem[] = qrCodes?.map(qr => {
    const entry = perQR[qr.id]
    return {
      qr_code: qr.qr_code,
      qr_name: qr.name,
      business_name: qr.business_id ? (businessNameMap[qr.business_id] || null) : null,
      category: qr.category || null,
      qr_type: qr.qr_type || null,
      total_scans: qr.total_scans || 0,
      unique_scans: entry?.uniqueUsers.size || 0,
      prior_period_scans: priorCountPerQR[qr.id] || 0,
      last_scanned: qr.last_scanned_at,
      os_breakdown: entry?.os || {},
      browser_breakdown: entry?.browser || {},
      peak_times: entry?.peakTimes || { morning: 0, afternoon: 0, evening: 0, night: 0 }
    }
  }) || []

  const totalScans = analytics.reduce((sum, qr) => sum + qr.total_scans, 0)

  // Growth %
  const growthPct = priorPeriodTotalScans > 0
    ? Math.round(((currentScans?.length || 0) - priorPeriodTotalScans) / priorPeriodTotalScans * 100)
    : null

  // 7. Top performers (top 5 by current period scan count)
  const sortedByPeriod = [...analytics]
    .map(qr => {
      const periodScans = perQR[qrCodes?.find(q => q.qr_code === qr.qr_code)?.id || '']?.scanCount || 0
      const prior = priorCountPerQR[qrCodes?.find(q => q.qr_code === qr.qr_code)?.id || ''] || 0
      return { ...qr, periodScans, prior }
    })
    .sort((a, b) => b.periodScans - a.periodScans)

  const periodTotal = sortedByPeriod.reduce((s, q) => s + q.periodScans, 0)

  const topPerformers: TopPerformer[] = sortedByPeriod.slice(0, 5).map(qr => ({
    qr_code: qr.qr_code,
    qr_name: qr.qr_name,
    business_name: qr.business_name,
    category: qr.category,
    total_scans: qr.periodScans,
    prior_period_scans: qr.prior,
    percent_of_total: periodTotal > 0 ? Math.round((qr.periodScans / periodTotal) * 100) : 0,
    growth_pct: qr.prior > 0 ? Math.round(((qr.periodScans - qr.prior) / qr.prior) * 100) : null
  }))

  // 8. Category performance
  const catMap: Record<string, { scans: number; count: number }> = {}
  analytics.forEach(qr => {
    const cat = qr.category || 'uncategorized'
    if (!catMap[cat]) catMap[cat] = { scans: 0, count: 0 }
    catMap[cat].scans += qr.total_scans
    catMap[cat].count++
  })

  const categoryPerformance: CategoryPerf[] = Object.entries(catMap)
    .map(([category, { scans, count }]) => ({
      category: category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      total_scans: scans,
      qr_count: count,
      avg_scans: count > 0 ? Math.round(scans / count) : 0,
      percent_of_total: totalScans > 0 ? Math.round((scans / totalScans) * 100) : 0
    }))
    .sort((a, b) => b.total_scans - a.total_scans)

  // 9. Conversion metrics derived from scan data
  const currentPeriodScans = currentScans?.length || 0
  const conversions: ConversionData = {
    total_scans: currentPeriodScans,
    identified_users: identifiedUsers.length,
    repeat_users: repeaters.length,
    identification_rate: currentPeriodScans > 0 ? Math.round((identifiedUsers.length / currentPeriodScans) * 100) : 0,
    retention_rate: identifiedUsers.length > 0 ? Math.round((repeaters.length / identifiedUsers.length) * 100) : 0
  }

  // 10. Daily scan trend
  let dailyScans: DailyScan[] = []

  const { data: dailyData } = await supabase
    .from('qr_code_analytics')
    .select('date, total_scans, qr_code_id')
    .in('qr_code_id', qrIds)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  const scansByDate = new Map<string, number>()
  dailyData?.forEach(day => {
    const existing = scansByDate.get(day.date) || 0
    scansByDate.set(day.date, existing + day.total_scans)
  })

  dailyScans = Array.from(scansByDate.entries()).map(([date, scans]) => ({ date, scans }))

  return {
    analytics, dailyScans, totalScans, currentPeriodScans, priorPeriodTotalScans, growthPct,
    globalOsBreakdown: globalOs, globalBrowserBreakdown: globalBrowser,
    globalPeakTimes, topRegions, dayOfWeek: dayOfWeekCounts,
    topPerformers, categoryPerformance, campaigns,
    conversions, repeatScanners
  }
}
