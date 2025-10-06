import { NextRequest, NextResponse } from 'next/server'
import { trackQRScan } from '@/lib/actions/real-qr-actions'
import { headers } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { qrId: string } }
) {
  const { qrId } = params
  
  try {
    // Get request information
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || undefined
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIp = headersList.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || request.ip || undefined
    const referrer = headersList.get('referer') || undefined

    // Parse URL parameters
    const url = new URL(request.url)
    const utmSource = url.searchParams.get('utm_source') || undefined
    const utmMedium = url.searchParams.get('utm_medium') || undefined
    const utmCampaign = url.searchParams.get('utm_campaign') || undefined
    const userId = url.searchParams.get('user_id') || undefined
    const walletPassId = url.searchParams.get('pass_id') || undefined

    // Track the scan
    const scanResult = await trackQRScan({
      qrCodeId: qrId,
      userAgent,
      ipAddress,
      userId,
      walletPassId,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign
    })

    if (!scanResult.success) {
      console.error('Failed to track QR scan:', scanResult.error)
      // Still redirect even if tracking fails
      return NextResponse.redirect(new URL('https://qwikker.com'))
    }

    // Redirect to the target URL
    const targetUrl = scanResult.targetUrl || 'https://qwikker.com'
    
    // Add tracking parameters to target URL if it's a Qwikker URL
    const redirectUrl = new URL(targetUrl)
    if (redirectUrl.hostname.includes('qwikker.com')) {
      redirectUrl.searchParams.set('qr_scan', 'true')
      redirectUrl.searchParams.set('qr_id', qrId)
      if (utmSource) redirectUrl.searchParams.set('utm_source', utmSource)
      if (utmMedium) redirectUrl.searchParams.set('utm_medium', utmMedium)
      if (utmCampaign) redirectUrl.searchParams.set('utm_campaign', utmCampaign)
    }

    console.log(`✅ QR Scan tracked: ${qrId} -> ${redirectUrl.toString()}`)

    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('Error handling QR scan:', error)
    // Fallback redirect
    return NextResponse.redirect(new URL('https://qwikker.com'))
  }
}

// Handle POST requests for API-based tracking
export async function POST(
  request: NextRequest,
  { params }: { params: { qrId: string } }
) {
  const { qrId } = params
  
  try {
    const body = await request.json()
    
    // Track the scan with provided data
    const scanResult = await trackQRScan({
      qrCodeId: qrId,
      ...body
    })

    if (!scanResult.success) {
      return NextResponse.json(
        { error: scanResult.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      targetUrl: scanResult.targetUrl,
      message: scanResult.message
    })

  } catch (error) {
    console.error('Error tracking QR scan via API:', error)
    return NextResponse.json(
      { error: 'Failed to track scan' },
      { status: 500 }
    )
  }
}

