import { NextRequest, NextResponse } from 'next/server'
import { getCityFromHostname } from '@/lib/utils/city-detection'

/**
 * Debug endpoint to verify environment detection
 * Shows VERCEL_ENV, NODE_ENV, and city detection behavior
 * 
 * REMOVE THIS IN PRODUCTION or add auth!
 */
export async function GET(request: NextRequest) {
  try {
    const hostname = request.headers.get('host') || ''
    
    let detectedCity = 'error'
    let detectionError = null
    
    try {
      detectedCity = await getCityFromHostname(hostname)
    } catch (error: any) {
      detectionError = error.message
    }
    
    return NextResponse.json({
      environment: {
        VERCEL_ENV: process.env.VERCEL_ENV || 'undefined',
        NODE_ENV: process.env.NODE_ENV || 'undefined',
        VERCEL_URL: process.env.VERCEL_URL || 'undefined',
      },
      request: {
        hostname,
        host: request.headers.get('host'),
        'x-forwarded-host': request.headers.get('x-forwarded-host'),
      },
      detection: {
        city: detectedCity,
        error: detectionError,
      },
      explanation: {
        isProd: process.env.VERCEL_ENV === 'production',
        allowFallbacks: process.env.VERCEL_ENV !== 'production',
        behavior: process.env.VERCEL_ENV === 'production' 
          ? 'STRICT (city required)' 
          : 'FALLBACK (defaults to bournemouth)',
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug endpoint failed',
      message: error.message,
    }, { status: 500 })
  }
}

