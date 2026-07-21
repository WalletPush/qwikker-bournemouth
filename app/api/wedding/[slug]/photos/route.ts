import { NextRequest, NextResponse } from 'next/server'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { getWedding, WEDDING_CITY } from '@/lib/wedding/config'
import { listWeddingPhotos } from '@/lib/wedding/photos'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function gate(request: NextRequest, slug: string) {
  const wedding = getWedding(slug)
  if (!wedding) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  let city: string | null = null
  try {
    city = await getCityFromHostname(request.headers.get('host') || '')
  } catch {
    city = null
  }
  if (city !== WEDDING_CITY) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  return { wedding }
}

// Returns the current photo list so the client gallery can refresh after uploads.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const g = await gate(request, slug)
  if ('error' in g) return g.error

  const photos = await listWeddingPhotos(g.wedding.slug)
  return NextResponse.json({ photos })
}

// Records Cloudinary uploads (called by the client right after it uploads the files).
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const g = await gate(request, slug)
  if ('error' in g) return g.error

  const body = await request.json().catch(() => ({}) as Record<string, unknown>)
  const raw = Array.isArray((body as { photos?: unknown }).photos)
    ? ((body as { photos: unknown[] }).photos)
    : []

  const rows = raw
    .filter(
      (p): p is { url: string; publicId?: string; width?: number; height?: number } =>
        !!p &&
        typeof (p as { url?: unknown }).url === 'string' &&
        /^https:\/\/res\.cloudinary\.com\//.test((p as { url: string }).url)
    )
    .slice(0, 500)
    .map((p) => ({
      slug: g.wedding.slug,
      url: p.url,
      public_id: typeof p.publicId === 'string' ? p.publicId : null,
      width: typeof p.width === 'number' ? p.width : null,
      height: typeof p.height === 'number' ? p.height : null,
    }))

  if (rows.length === 0) return NextResponse.json({ error: 'No valid photos' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('wedding_photos').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, inserted: rows.length })
}
