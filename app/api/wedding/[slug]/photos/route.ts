import { NextRequest, NextResponse } from 'next/server'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { getWedding, WEDDING_CITY } from '@/lib/wedding/config'
import { listWeddingPhotos } from '@/lib/wedding/photos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Returns the current photo list so the client gallery can refresh after uploads.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const wedding = getWedding(slug)
  if (!wedding) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let city: string | null = null
  try {
    city = await getCityFromHostname(request.headers.get('host') || '')
  } catch {
    city = null
  }
  if (city !== WEDDING_CITY) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const photos = await listWeddingPhotos(wedding.slug)
  return NextResponse.json({ photos })
}
