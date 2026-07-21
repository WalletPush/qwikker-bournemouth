import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { getWedding, WEDDING_CITY, CLOUDINARY_CLOUD } from '@/lib/wedding/config'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Best-effort Cloudinary purge — only runs if API creds are configured. Without them the
// asset stays in Cloudinary but is removed from the album (its row is deleted below).
async function destroyFromCloudinary(publicId: string): Promise<void> {
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!apiKey || !apiSecret) return
  try {
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = crypto
      .createHash('sha1')
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex')
    const form = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: apiKey,
      signature,
    })
    await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/destroy`, {
      method: 'POST',
      body: form,
    })
  } catch {
    /* non-fatal */
  }
}

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

  const supabase = createAdminClient()
  const { data: rows } = await supabase
    .from('wedding_photos')
    .select('public_id')
    .eq('slug', wedding.slug)

  for (const row of rows || []) {
    if (row.public_id) await destroyFromCloudinary(row.public_id as string)
  }

  const { error } = await supabase.from('wedding_photos').delete().eq('slug', wedding.slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, deleted: (rows || []).length })
}
