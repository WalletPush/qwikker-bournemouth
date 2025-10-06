'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import QRCode from 'qrcode'

export interface QRCodeData {
  id: string
  qr_code: string
  qr_type: 'marketing' | 'business_static' | 'business_dynamic'
  name: string
  description?: string
  category: string
  current_target_url: string
  default_target_url: string
  business_id?: string
  city: string
  status: 'active' | 'inactive' | 'archived'
  total_scans: number
  last_scanned_at?: string
  created_at: string
  updated_at: string
}

export interface QRScanData {
  id: string
  qr_code_id: string
  qr_code: string
  scanned_at: string
  user_agent?: string
  ip_address?: string
  city?: string
  user_id?: string
  wallet_pass_id?: string
  device_type?: string
  browser?: string
  os?: string
}

export interface QRAnalytics {
  qr_code_id: string
  qr_code: string
  date: string
  total_scans: number
  unique_users: number
  unique_ips: number
  mobile_scans: number
  desktop_scans: number
  tablet_scans: number
  morning_scans: number
  afternoon_scans: number
  evening_scans: number
  night_scans: number
  offer_claims: number
  user_signups: number
}

/**
 * Generate a new QR code
 */
export async function generateQRCode(data: {
  qr_type: 'marketing' | 'business_static' | 'business_dynamic'
  name: string
  description?: string
  category: string
  target_url: string
  business_id?: string
  city: string
  physical_location?: string
}) {
  const supabase = createServiceRoleClient()

  try {
    // Generate unique QR code identifier
    const prefix = data.qr_type === 'marketing' ? 'MKT' : 
                   data.qr_type === 'business_static' ? 'BIZ' : 'DYN'
    const categoryPrefix = data.category.substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString().slice(-6)
    const qrCodeId = `QWK-${data.city.substring(0, 3).toUpperCase()}-${prefix}-${categoryPrefix}-${timestamp}`

    // Create redirect URL that we control (this is what the QR actually points to)
    const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/qr/${qrCodeId}`

    // Insert QR code into database
    const { data: qrCode, error } = await supabase
      .from('qr_codes')
      .insert({
        qr_code: qrCodeId,
        qr_type: data.qr_type,
        name: data.name,
        description: data.description,
        category: data.category,
        current_target_url: data.target_url,
        default_target_url: data.target_url,
        business_id: data.business_id,
        city: data.city.toLowerCase(),
        physical_location: data.physical_location,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating QR code:', error)
      return { success: false, error: error.message }
    }

    // Generate the actual QR code image
    const qrCodeImage = await QRCode.toDataURL(redirectUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    })

    return {
      success: true,
      qrCode: qrCode,
      qrCodeImage,
      redirectUrl,
      message: `QR code ${qrCodeId} generated successfully`
    }

  } catch (error) {
    console.error('Error generating QR code:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Track a QR code scan
 */
export async function trackQRScan(data: {
  qrCodeId: string
  userAgent?: string
  ipAddress?: string
  city?: string
  userId?: string
  walletPassId?: string
  referrer?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
}) {
  const supabase = createServiceRoleClient()

  try {
    // Get QR code details from the existing qr_code_templates table
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_code_templates')
      .select('*')
      .eq('code_name', data.qrCodeId)
      .single()

    if (qrError || !qrCode) {
      console.error('QR code not found:', data.qrCodeId)
      return { success: false, error: 'QR code not found' }
    }

    // Parse user agent for device info
    const deviceInfo = parseUserAgent(data.userAgent || '')

    // Record the scan in the existing qr_code_analytics table
    const { data: scanRecord, error: scanError } = await supabase
      .from('qr_code_analytics')
      .insert({
        qr_code_id: qrCode.id,
        business_id: qrCode.business_id,
        user_id: data.userId,
        scan_timestamp: new Date().toISOString(),
        user_agent: data.userAgent,
        ip_address: data.ipAddress,
        referrer_url: data.referrer,
        utm_source: data.utmSource,
        utm_medium: data.utmMedium,
        utm_campaign: data.utmCampaign,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os
      })
      .select()
      .single()

    if (scanError) {
      console.error('Error recording scan:', scanError)
      return { success: false, error: scanError.message }
    }

    return {
      success: true,
      scan: scanRecord,
      targetUrl: qrCode.target_url || qrCode.base_url, // Use target_url if available, fallback to base_url
      message: 'Scan tracked successfully'
    }

  } catch (error) {
    console.error('Error tracking QR scan:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Update QR code target URL (allows changing where printed QR codes redirect)
 * This is the KEY FEATURE - change URLs AFTER printing!
 */
export async function updateQRTarget(qrCodeId: string, newTargetUrl: string) {
  const supabase = createServiceRoleClient()

  try {
    const { data, error } = await supabase
      .from('qr_code_templates')
      .update({
        target_url: newTargetUrl, // Update the target URL
        updated_at: new Date().toISOString()
      })
      .eq('code_name', qrCodeId)
      .select()
      .single()

    if (error) {
      console.error('Error updating QR target:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      qrCode: data,
      message: `QR code ${qrCodeId} target updated to ${newTargetUrl}`
    }

  } catch (error) {
    console.error('Error updating QR target:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get QR codes for a city
 */
export async function getQRCodes(city: string, qrType?: string, category?: string): Promise<QRCodeData[]> {
  const supabase = createServiceRoleClient()

  try {
    let query = supabase
      .from('qr_codes')
      .select('*')
      .eq('city', city.toLowerCase())
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (qrType) {
      query = query.eq('qr_type', qrType)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching QR codes:', error)
      return []
    }

    return data || []

  } catch (error) {
    console.error('Error fetching QR codes:', error)
    return []
  }
}

/**
 * Get real QR analytics for a city
 */
export async function getRealQRAnalytics(city: string, days: number = 30) {
  const supabase = createServiceRoleClient()

  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get aggregated analytics
    const { data: analytics, error } = await supabase
      .from('qr_code_analytics')
      .select(`
        *,
        qr_codes!inner(
          qr_code,
          name,
          qr_type,
          category,
          city
        )
      `)
      .eq('qr_codes.city', city.toLowerCase())
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching QR analytics:', error)
      return {
        marketing: { total_scans: 0, categories: {} },
        business_static: { total_scans: 0, categories: {} },
        business_dynamic: { total_scans: 0, categories: {} }
      }
    }

    // Process analytics data
    const result = {
      marketing: { total_scans: 0, categories: {} as Record<string, number> },
      business_static: { total_scans: 0, categories: {} as Record<string, number> },
      business_dynamic: { total_scans: 0, categories: {} as Record<string, number> }
    }

    analytics?.forEach(item => {
      const qrType = item.qr_codes.qr_type
      const category = item.qr_codes.category
      const scans = item.total_scans

      result[qrType].total_scans += scans

      if (!result[qrType].categories[category]) {
        result[qrType].categories[category] = 0
      }
      result[qrType].categories[category] += scans
    })

    return result

  } catch (error) {
    console.error('Error processing QR analytics:', error)
    return {
      marketing: { total_scans: 0, categories: {} },
      business_static: { total_scans: 0, categories: {} },
      business_dynamic: { total_scans: 0, categories: {} }
    }
  }
}

/**
 * Parse user agent for device information
 */
function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase()
  
  let deviceType = 'desktop'
  if (ua.includes('mobile') || ua.includes('android')) deviceType = 'mobile'
  if (ua.includes('tablet') || ua.includes('ipad')) deviceType = 'tablet'
  
  let browser = 'unknown'
  if (ua.includes('chrome')) browser = 'chrome'
  else if (ua.includes('firefox')) browser = 'firefox'
  else if (ua.includes('safari')) browser = 'safari'
  else if (ua.includes('edge')) browser = 'edge'
  
  let os = 'unknown'
  if (ua.includes('windows')) os = 'windows'
  else if (ua.includes('mac')) os = 'macos'
  else if (ua.includes('linux')) os = 'linux'
  else if (ua.includes('android')) os = 'android'
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'ios'
  
  return { deviceType, browser, os }
}
