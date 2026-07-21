import { NextRequest, NextResponse } from 'next/server'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { getWedding, WEDDING_CITY, WEDDING_BUCKET } from '@/lib/wedding/config'
import { listWeddingPhotos } from '@/lib/wedding/photos'
import { createAdminClient } from '@/lib/supabase/admin'
import { createZip, type ZipFile } from '@/lib/wedding/zip'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Password-gated: bundles every uploaded photo into a single ZIP for the couple.
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
  if (photos.length === 0) return NextResponse.json({ error: 'empty' }, { status: 404 })

  const supabase = createAdminClient()
  const files: ZipFile[] = []
  let idx = 1
  for (const photo of photos) {
    const { data, error } = await supabase.storage.from(WEDDING_BUCKET).download(photo.path)
    if (error || !data) continue
    const buf = Buffer.from(await data.arrayBuffer())
    const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    files.push({ name: `${String(idx).padStart(3, '0')}-${safeName}`, data: buf })
    idx++
  }

  if (files.length === 0) return NextResponse.json({ error: 'empty' }, { status: 404 })

  const zip = createZip(files)
  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${wedding.slug}-album.zip"`,
      'Content-Length': String(zip.length),
      'Cache-Control': 'no-store',
    },
  })
}
