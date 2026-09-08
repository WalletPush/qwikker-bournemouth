import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'

const optionalString = z.string().trim().max(500)

const bodySchema = z
  .object({
    businessId: z.string().uuid(),
    phone: optionalString.nullable().optional(),
    business_address: optionalString.nullable().optional(),
    website_url: optionalString.nullable().optional(),
    instagram_handle: optionalString.nullable().optional(),
    facebook_url: optionalString.nullable().optional(),
  })
  .refine(
    (b) =>
      b.phone !== undefined ||
      b.business_address !== undefined ||
      b.website_url !== undefined ||
      b.instagram_handle !== undefined ||
      b.facebook_url !== undefined,
    { message: 'At least one contact field required' }
  )

function normalizeInstagram(raw: string | null): string | null {
  if (raw === null) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Accept full URL or @handle / handle
  const fromUrl = trimmed.match(/instagram\.com\/([^/?#]+)/i)
  if (fromUrl) return fromUrl[1].replace(/^@/, '')
  return trimmed.replace(/^@/, '')
}

function normalizeUrl(raw: string | null): string | null {
  if (raw === null) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/**
 * Admin CRM: update phone / address / website / Instagram / Facebook on a listing.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid contact payload', success: false, details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { businessId, ...fields } = parsed.data

    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')
    if (!adminSessionCookie?.value) {
      return NextResponse.json({ error: 'Admin authentication required', success: false }, { status: 401 })
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json({ error: 'Invalid admin session', success: false }, { status: 401 })
    }

    const admin = await getAdminById(adminSession.adminId)
    const hostname = request.headers.get('host') || ''
    const requestCity = await getCityFromHostname(hostname)

    if (!admin || !(await isAdminForCity(adminSession.adminId, requestCity))) {
      return NextResponse.json({ error: 'Insufficient permissions', success: false }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient()

    const { data: business, error: fetchError } = await supabaseAdmin
      .from('business_profiles')
      .select('id, city')
      .eq('id', businessId)
      .single()

    if (fetchError || !business) {
      return NextResponse.json({ error: 'Business not found', success: false }, { status: 404 })
    }

    if (business.city !== requestCity) {
      return NextResponse.json({ error: 'Business not in your city', success: false }, { status: 403 })
    }

    const update: Record<string, string | null> = {}

    if (fields.phone !== undefined) {
      update.phone = fields.phone === null || fields.phone === '' ? null : fields.phone
    }
    if (fields.business_address !== undefined) {
      update.business_address =
        fields.business_address === null || fields.business_address === ''
          ? null
          : fields.business_address
    }
    if (fields.website_url !== undefined) {
      update.website_url =
        fields.website_url === null || fields.website_url === ''
          ? null
          : normalizeUrl(fields.website_url)
    }
    if (fields.instagram_handle !== undefined) {
      update.instagram_handle =
        fields.instagram_handle === null || fields.instagram_handle === ''
          ? null
          : normalizeInstagram(fields.instagram_handle)
    }
    if (fields.facebook_url !== undefined) {
      update.facebook_url =
        fields.facebook_url === null || fields.facebook_url === ''
          ? null
          : normalizeUrl(fields.facebook_url)
    }

    const { error: updateError } = await supabaseAdmin
      .from('business_profiles')
      .update({
        ...update,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId)

    if (updateError) {
      console.error('update-business-contact failed:', updateError)
      return NextResponse.json(
        { error: 'Failed to update contact details', success: false, details: updateError.message },
        { status: 500 }
      )
    }

    revalidatePath('/admin')
    revalidatePath('/user/discover')

    return NextResponse.json({
      success: true,
      ...update,
    })
  } catch (error) {
    console.error('update-business-contact API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
