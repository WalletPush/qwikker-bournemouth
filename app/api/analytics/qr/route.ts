import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/analytics/qr - Get QR code analytics for a business
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if user has access to this business
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    // Verify business ownership
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('id, user_id')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({
        success: false,
        error: 'Business not found or access denied'
      }, { status: 403 })
    }

    // Check if business has analytics access
    const { getBusinessTierInfo } = await import('@/lib/utils/subscription-helpers')
    const tierInfo = await getBusinessTierInfo(businessId)
    const hasAccess = tierInfo.hasAnalyticsAccess

    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: 'Analytics access requires Spotlight tier',
        upgradeRequired: true
      }, { status: 403 })
    }

    // Fetch QR analytics data
    const { data: qrAnalytics, error } = await supabase
      .from('qr_code_analytics')
      .select(`
        *,
        qr_code_templates (
          code_name,
          qr_type,
          category
        )
      `)
      .eq('business_id', businessId)
      .order('scan_timestamp', { ascending: false })
      .limit(1000) // Last 1000 scans

    if (error) {
      console.error('Error fetching QR analytics:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch analytics data'
      }, { status: 500 })
    }

    // Process and aggregate the data
    const processedAnalytics = processQRAnalytics(qrAnalytics || [])

    return NextResponse.json({
      success: true,
      analytics: processedAnalytics,
      totalScans: qrAnalytics?.length || 0
    })

  } catch (error) {
    console.error('QR Analytics API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * Process raw QR analytics data into business dashboard format
 */
function processQRAnalytics(rawData: any[]) {
  if (!rawData || rawData.length === 0) {
    return []
  }

  // Group by QR code
  const groupedByQR = rawData.reduce((acc, scan) => {
    const qrName = scan.qr_code_templates?.code_name || 'Unknown QR'
    const qrType = scan.qr_code_templates?.qr_type || 'unknown'
    
    if (!acc[qrName]) {
      acc[qrName] = {
        qr_code_name: qrName,
        qr_type: qrType,
        scans: [],
        unique_users: new Set(),
        devices: { mobile: 0, desktop: 0, tablet: 0 },
        hours: {}
      }
    }
    
    acc[qrName].scans.push(scan)
    
    // Track unique users (by IP or user_id)
    const userId = scan.user_id || scan.ip_address
    if (userId) {
      acc[qrName].unique_users.add(userId)
    }
    
    // Track device types
    if (scan.device_type) {
      acc[qrName].devices[scan.device_type] = (acc[qrName].devices[scan.device_type] || 0) + 1
    }
    
    // Track peak hours
    if (scan.scan_timestamp) {
      const hour = new Date(scan.scan_timestamp).getHours()
      const hourKey = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`
      acc[qrName].hours[hourKey] = (acc[qrName].hours[hourKey] || 0) + 1
    }
    
    return acc
  }, {})

  // Convert to array format
  return Object.values(groupedByQR).map((qr: any) => {
    const totalScans = qr.scans.length
    const uniqueUsers = qr.unique_users.size
    const conversionRate = uniqueUsers > 0 ? (uniqueUsers / totalScans) * 100 : 0
    
    // Get top 3 peak hours
    const peakHours = Object.entries(qr.hours)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([hour]) => hour)
    
    // Get last scan
    const lastScan = qr.scans.length > 0 ? qr.scans[0].scan_timestamp : null
    
    return {
      qr_code_name: qr.qr_code_name,
      qr_type: qr.qr_type,
      total_scans: totalScans,
      unique_users: uniqueUsers,
      conversion_rate: Math.round(conversionRate * 10) / 10,
      last_scan: lastScan,
      device_breakdown: qr.devices,
      peak_hours: peakHours,
      top_referrers: ['Direct Scan'] // TODO: Add referrer tracking
    }
  })
}
