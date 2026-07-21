import { NextRequest, NextResponse } from 'next/server'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { getWedding, WEDDING_CITY, WEDDING_BUCKET } from '@/lib/wedding/config'
import { listWeddingPhotos } from '@/lib/wedding/photos'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Password-gated teardown: removes every uploaded photo (test cleanup / post-event).
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
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

  const body = await request.json().catch(() => ({}) as Record<string, unknown>)
  const password = typeof body.password === 'string' ? body.password : ''
  if (password !== wedding.downloadPassword) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const photos = await listWeddingPhotos(wedding.slug)
  if (photos.length === 0) return NextResponse.json({ success: true, deleted: 0 })

  const supabase = createAdminClient()
  const paths = photos.map((p) => p.path)
  const { error } = await supabase.storage.from(WEDDING_BUCKET).remove(paths)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, deleted: paths.length })
}
