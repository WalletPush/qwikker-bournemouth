/**
 * QR Code Generation and Management Utilities
 * 
 * This handles the creation of dynamic QR codes that can be reassigned
 * to different businesses without changing the physical QR code.
 */

interface QRCodeConfig {
  city: string
  qr_type: 'explore' | 'offers' | 'secret_menu' | 'general'
  physical_location: string
  template_name?: string
}

interface GeneratedQRCode {
  qr_code_id: string
  static_url: string
  printable_url: string
  tracking_params: {
    utm_source: string
    utm_medium: string
    utm_campaign: string
  }
}

/**
 * Generate a static URL for a QR code that will dynamically route
 * based on database assignments
 */
export function generateQRCodeURL(config: QRCodeConfig, qr_code_id: string): GeneratedQRCode {
  const { city, qr_type, physical_location } = config
  
  // Base URL that never changes (this goes in the physical QR code)
  const baseUrl = `https://${city}.qwikker.com/intent`
  
  // Static URL with QR ID (this is what gets printed on QR codes)
  const staticUrl = `${baseUrl}?qr=${qr_code_id}`
  
  // Tracking parameters for analytics
  const trackingParams = {
    utm_source: 'qr_code',
    utm_medium: physical_location.toLowerCase().replace(/\s+/g, '_'),
    utm_campaign: `${city}_${qr_type}_campaign`
  }
  
  // Full URL with tracking (for analytics dashboards)
  const trackingUrl = new URL(staticUrl)
  Object.entries(trackingParams).forEach(([key, value]) => {
    trackingUrl.searchParams.set(key, value)
  })
  
  return {
    qr_code_id,
    static_url: staticUrl, // This goes in the QR code
    printable_url: trackingUrl.toString(), // This is for tracking
    tracking_params
  }
}

/**
 * Generate QR code template name based on configuration
 */
export function generateQRCodeTemplateName(config: QRCodeConfig, sequence: number = 1): string {
  const { city, qr_type, physical_location } = config
  
  const locationSlug = physical_location
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
  
  const paddedSequence = sequence.toString().padStart(3, '0')
  
  return `${qr_type}-${city}-${locationSlug}-${paddedSequence}`
}

/**
 * Validate QR code assignment to prevent conflicts
 */
export function validateQRAssignment(
  qrCode: { id: string, qr_type: string, current_assignment?: unknown },
  targetBusiness: { id: string, business_name: string, status: string }
): { valid: boolean, errors: string[], warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check if business is approved
  if (targetBusiness.status !== 'approved') {
    errors.push(`Business "${targetBusiness.business_name}" is not approved`)
  }
  
  // Check if QR code already has an assignment
  if (qrCode.current_assignment) {
    warnings.push(`QR code is currently assigned to "${qrCode.current_assignment.business_name}"`)
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Generate preview URL for testing QR assignment
 */
export function generatePreviewURL(
  qrType: string,
  businessSlug: string,
  city: string,
  targetContentId?: string
): string {
  const baseUrl = `https://${city}.qwikker.com`
  
  switch (qrType) {
    case 'explore':
      return `${baseUrl}/user/discover?highlight=${businessSlug}&ref=qr_preview`
    
    case 'offers':
      if (targetContentId) {
        return `${baseUrl}/user/offers?highlight=${targetContentId}&business=${businessSlug}&ref=qr_preview`
      }
      return `${baseUrl}/user/offers?business=${businessSlug}&ref=qr_preview`
    
    case 'secret_menu':
      return `${baseUrl}/user/secret-menu?business=${businessSlug}&ref=qr_preview`
    
    case 'general':
    default:
      return `${baseUrl}/user/dashboard?business=${businessSlug}&ref=qr_preview`
  }
}

/**
 * Generate QR code analytics summary
 */
export interface QRAnalyticsSummary {
  total_scans: number
  unique_users: number
  conversion_rate: number
  top_device: string
  peak_hour: string
  last_scan: string | null
}

export function calculateQRAnalytics(analyticsData: unknown[]): QRAnalyticsSummary {
  if (analyticsData.length === 0) {
    return {
      total_scans: 0,
      unique_users: 0,
      conversion_rate: 0,
      top_device: 'mobile',
      peak_hour: '12:00',
      last_scan: null
    }
  }
  
  const totalScans = analyticsData.length
  const uniqueUsers = new Set(analyticsData.map(d => d.user_id).filter(Boolean)).size
  const conversions = analyticsData.filter(d => d.target_reached).length
  const conversionRate = totalScans > 0 ? (conversions / totalScans) * 100 : 0
  
  // Device breakdown
  const deviceCounts = analyticsData.reduce((acc, d) => {
    acc[d.device_type] = (acc[d.device_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const topDevice = Object.entries(deviceCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'mobile'
  
  // Peak hour analysis
  const hourCounts = analyticsData.reduce((acc, d) => {
    const hour = new Date(d.scan_timestamp).getHours()
    acc[hour] = (acc[hour] || 0) + 1
    return acc
  }, {} as Record<number, number>)
  
  const peakHour = Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || '12'
  
  const lastScan = analyticsData
    .sort((a, b) => new Date(b.scan_timestamp).getTime() - new Date(a.scan_timestamp).getTime())[0]
    ?.scan_timestamp || null
  
  return {
    total_scans: totalScans,
    unique_users: uniqueUsers,
    conversion_rate: Math.round(conversionRate * 10) / 10,
    top_device: topDevice,
    peak_hour: `${peakHour}:00`,
    last_scan: lastScan
  }
}

/**
 * Default QR code templates for new cities
 */
export const DEFAULT_QR_TEMPLATES: QRCodeConfig[] = [
  {
    city: 'bournemouth',
    qr_type: 'explore',
    physical_location: 'Table Tent',
    template_name: 'explore-bournemouth-table-tent-001'
  },
  {
    city: 'bournemouth',
    qr_type: 'explore',
    physical_location: 'Window Sticker',
    template_name: 'explore-bournemouth-window-sticker-001'
  },
  {
    city: 'bournemouth',
    qr_type: 'offers',
    physical_location: 'Table Tent',
    template_name: 'offers-bournemouth-table-tent-001'
  },
  {
    city: 'bournemouth',
    qr_type: 'offers',
    physical_location: 'Flyer',
    template_name: 'offers-bournemouth-flyer-001'
  },
  {
    city: 'bournemouth',
    qr_type: 'secret_menu',
    physical_location: 'Secret Sticker',
    template_name: 'secret-menu-bournemouth-sticker-001'
  },
  {
    city: 'bournemouth',
    qr_type: 'general',
    physical_location: 'Join Qwikker Flyer',
    template_name: 'general-bournemouth-join-001'
  }
]
