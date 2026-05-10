'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

interface QRAnalyticsItem {
  qr_code: string
  qr_name: string
  total_scans: number
  mobile_scans: number
  desktop_scans: number
  tablet_scans: number
  last_scanned: string | null
}

interface DailyScan {
  date: string
  scans: number
}

interface AdminQRAnalyticsResult {
  analytics: QRAnalyticsItem[]
  dailyScans: DailyScan[]
  totalScans: number
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

  // 1. Get active QR codes for this city
  const { data: qrCodes, error: qrError } = await supabase
    .from('qr_codes')
    .select('id, qr_code, name, total_scans, last_scanned_at')
    .eq('city', city.toLowerCase())
    .eq('status', 'active')
    .order('total_scans', { ascending: false })

  if (qrError) {
    console.error('❌ Admin QR analytics - qr_codes fetch error:', qrError)
    return { analytics: [], dailyScans: [], totalScans: 0 }
  }

  const qrIds = qrCodes?.map(qr => qr.id) || []

  // 2. Get scans with device breakdown (single query, aggregate in memory)
  const deviceCounts: Record<string, { mobile: number; desktop: number; tablet: number }> = {}

  if (qrIds.length > 0) {
    const { data: allScans } = await supabase
      .from('qr_code_scans')
      .select('qr_code_id, device_type')
      .in('qr_code_id', qrIds)
      .gte('scanned_at', startDate.toISOString())

    allScans?.forEach(scan => {
      if (!deviceCounts[scan.qr_code_id]) {
        deviceCounts[scan.qr_code_id] = { mobile: 0, desktop: 0, tablet: 0 }
      }
      if (scan.device_type === 'mobile') deviceCounts[scan.qr_code_id].mobile++
      else if (scan.device_type === 'desktop') deviceCounts[scan.qr_code_id].desktop++
      else if (scan.device_type === 'tablet') deviceCounts[scan.qr_code_id].tablet++
    })
  }

  // 3. Build per-code analytics
  const analytics: QRAnalyticsItem[] = qrCodes?.map(qr => ({
    qr_code: qr.qr_code,
    qr_name: qr.name,
    total_scans: qr.total_scans || 0,
    mobile_scans: deviceCounts[qr.id]?.mobile || 0,
    desktop_scans: deviceCounts[qr.id]?.desktop || 0,
    tablet_scans: deviceCounts[qr.id]?.tablet || 0,
    last_scanned: qr.last_scanned_at
  })) || []

  const totalScans = analytics.reduce((sum, qr) => sum + qr.total_scans, 0)

  // 4. Daily scan trend from qr_code_analytics
  let dailyScans: DailyScan[] = []

  if (qrIds.length > 0) {
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
  }

  return { analytics, dailyScans, totalScans }
}
