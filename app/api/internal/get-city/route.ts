import { NextRequest, NextResponse } from 'next/server'
import { getCityFromHostname } from '@/lib/utils/city-detection'

/**
 * Internal endpoint to get city from hostname
 * GET /api/internal/get-city
 * 
 * Used by client-side pages that need to know the current franchise city
 */
export async function GET(request: NextRequest) {
  try {
    const hostname = request.headers.get('host') || ''
    const city = await getCityFromHostname(hostname)
    
    return NextResponse.json({
      success: true,
      city,
      hostname
    })
  } catch (error: any) {
    console.error('Error getting city:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      city: 'bournemouth' // Safe fallback
    }, { status: 200 }) // Still return 200 with fallback
  }
}

