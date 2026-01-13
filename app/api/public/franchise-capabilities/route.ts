import { NextRequest, NextResponse } from 'next/server'
import { getCityFromRequest } from '@/lib/utils/city-detection'
import { getSmsCapabilitiesForCity } from '@/lib/utils/sms-verification'

/**
 * GET /api/public/franchise-capabilities
 * 
 * Returns what features are available for the current city's franchise.
 * Used by public claim form to determine what UI elements to show.
 * 
 * Currently supports:
 * - sms_opt_in_available: Whether to show SMS opt-in checkbox
 * 
 * SECURITY: 
 * - City is derived from hostname (not client-supplied)
 * - Only returns boolean flags, no secrets
 */
export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Derive city from hostname
    const city = await getCityFromRequest(request.headers)
    
    // Get SMS capabilities for this city
    const smsCapabilities = await getSmsCapabilitiesForCity(city)
    
    return NextResponse.json({
      success: true,
      city, // Return for client verification
      capabilities: {
        sms_opt_in_available: smsCapabilities.sms_opt_in_available
      }
    })
    
  } catch (error: any) {
    console.error('❌ Franchise capabilities error:', error)
    
    // Fail safely: if we can't determine, default to no SMS
    return NextResponse.json({
      success: true,
      capabilities: {
        sms_opt_in_available: false
      }
    })
  }
}

