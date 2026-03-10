import { NextRequest, NextResponse } from 'next/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'
import { buildHomeFeed } from '@/lib/home-feed/feed-builder'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const city = await getSafeCurrentCity()

    let walletPassId: string | null = null
    try {
      walletPassId = await getWalletPassCookie()
    } catch {
      // No wallet pass cookie -- anonymous user
    }

    // Optional location from query params
    const { searchParams } = new URL(request.url)
    const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
    const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null

    const feed = await buildHomeFeed({
      city,
      walletPassId,
      userLat,
      userLng,
    })

    return NextResponse.json(feed)
  } catch (error: any) {
    console.error('[home-feed] API error:', error)
    return NextResponse.json(
      { error: 'Failed to build home feed' },
      { status: 500 }
    )
  }
}
