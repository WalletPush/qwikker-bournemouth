'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

interface CountMap {
  [key: string]: number
}

interface QRAnalyticsItem {
  qr_code: string
  qr_name: string
  business_name: string | null
  category: string | null
  qr_type: string | null
  total_scans: number
  unique_scans: number
  last_scanned: string | null
  os_breakdown: CountMap
  browser_breakdown: CountMap
  peak_times: { morning: number; afternoon: number; evening: number; night: number }
}

interface DailyScan {
  date: string
  scans: number
}

interface AdminQRAnalyticsResult {
  analytics: QRAnalyticsItem[]
  dailyScans: DailyScan[]
  totalScans: number
  globalOsBreakdown: CountMap
  globalBrowserBreakdown: CountMap
  globalPeakTimes: { morning: number; afternoon: number; evening: number; night: number }
  topRegions: CountMap
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
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysAgo)

  const emptyResult: AdminQRAnalyticsResult = {
    analytics: [], dailyScans: [], totalScans: 0,
    globalOsBreakdown: {}, globalBrowserBreakdown: {},
    globalPeakTimes: { morning: 0, afternoon: 0, evening: 0, night: 0 },
    topRegions: {}
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

  // 1b. Look up business names for QR codes that have a business_id
  const businessIds = [...new Set(qrCodes.filter(qr => qr.business_id).map(qr => qr.business_id))]
  const businessNameMap: Record<string, string> = {}

  if (businessIds.length > 0) {
    const { data: businesses } = await supabase
      .from('business_profiles')
      .select('id, business_name')
      .in('id', businessIds)

    businesses?.forEach(b => { businessNameMap[b.id] = b.business_name })
  }

  // 2. Fetch all scan records with device/geo/time fields
  const { data: allScans } = await supabase
    .from('qr_code_scans')
    .select('qr_code_id, wallet_pass_id, os, browser, country, region, scanned_at')
    .in('qr_code_id', qrIds)
    .gte('scanned_at', startDate.toISOString())

  // 3. Aggregate per-QR and global breakdowns in a single pass
  const perQR: Record<string, {
    uniqueUsers: Set<string>
    os: CountMap
    browser: CountMap
    peakTimes: { morning: number; afternoon: number; evening: number; night: number }
  }> = {}

  const globalOs: CountMap = {}
  const globalBrowser: CountMap = {}
  const globalPeakTimes = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  const globalRegions: CountMap = {}

  allScans?.forEach(scan => {
    const qrId = scan.qr_code_id

    if (!perQR[qrId]) {
      perQR[qrId] = {
        uniqueUsers: new Set(),
        os: {},
        browser: {},
        peakTimes: { morning: 0, afternoon: 0, evening: 0, night: 0 }
      }
    }
    const entry = perQR[qrId]

    // Unique scanners
    const userId = scan.wallet_pass_id || `_anon_${scan.scanned_at}`
    entry.uniqueUsers.add(userId)

    // OS
    const os = scan.os || 'Unknown'
    entry.os[os] = (entry.os[os] || 0) + 1
    globalOs[os] = (globalOs[os] || 0) + 1

    // Browser
    const browser = scan.browser || 'Unknown'
    entry.browser[browser] = (entry.browser[browser] || 0) + 1
    globalBrowser[browser] = (globalBrowser[browser] || 0) + 1

    // Time of day
    if (scan.scanned_at) {
      const hour = new Date(scan.scanned_at).getHours()
      if (hour >= 6 && hour < 12) { entry.peakTimes.morning++; globalPeakTimes.morning++ }
      else if (hour >= 12 && hour < 18) { entry.peakTimes.afternoon++; globalPeakTimes.afternoon++ }
      else if (hour >= 18 && hour < 24) { entry.peakTimes.evening++; globalPeakTimes.evening++ }
      else { entry.peakTimes.night++; globalPeakTimes.night++ }
    }

    // Region/country
    const region = [scan.region, scan.country].filter(Boolean).join(', ') || 'Unknown'
    if (region !== 'Unknown') {
      globalRegions[region] = (globalRegions[region] || 0) + 1
    }
  })

  // Sort regions by count, keep top 10
  const topRegions: CountMap = {}
  Object.entries(globalRegions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([key, val]) => { topRegions[key] = val })

  // 4. Build per-code analytics with enriched data
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
      last_scanned: qr.last_scanned_at,
      os_breakdown: entry?.os || {},
      browser_breakdown: entry?.browser || {},
      peak_times: entry?.peakTimes || { morning: 0, afternoon: 0, evening: 0, night: 0 }
    }
  }) || []

  const totalScans = analytics.reduce((sum, qr) => sum + qr.total_scans, 0)

  // 5. Daily scan trend from qr_code_analytics
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

  dailyScans = Array.from(scansByDate.entries()).map(([date, scans]) => ({
    date,
    scans
  }))

  return {
    analytics, dailyScans, totalScans,
    globalOsBreakdown: globalOs,
    globalBrowserBreakdown: globalBrowser,
    globalPeakTimes,
    topRegions
  }
}
