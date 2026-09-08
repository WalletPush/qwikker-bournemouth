import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import {
  isVibeGroup,
  MAX_CUSTOM_TAG_LENGTH,
  MAX_CUSTOM_TAGS,
  VIBE_TAG_SLUGS,
  type VibeGroup,
} from '@/lib/constants/vibe-tags'

const vibeGroupValues = [
  'food',
  'beauty',
  'wellness',
  'fitness',
  'retail',
  'accommodation',
  'venue',
  'services',
  'default',
] as const satisfies readonly VibeGroup[]

const bodySchema = z.object({
  businessId: z.string().uuid(),
  selected: z.array(z.string().trim().min(1).max(60)).max(40),
  custom: z.array(z.string().trim().min(1).max(MAX_CUSTOM_TAG_LENGTH)).max(MAX_CUSTOM_TAGS),
  tag_set: z.enum(vibeGroupValues).nullable().optional(),
})

/** POST: city-admin immediate update of vibe_tags on a business listing. */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const adminId = cookieStore.get('admin_session')?.value
    if (!adminId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await getAdminById(adminId)
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const hostname = request.headers.get('host') || ''
    const city = getCityFromHostname(hostname)
    if (!isAdminForCity(admin, city)) {
      return NextResponse.json({ success: false, error: 'Forbidden for this city' }, { status: 403 })
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid vibe tags payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { businessId, selected, custom, tag_set } = parsed.data
    const selectedClean = Array.from(
      new Set(selected.filter((slug) => VIBE_TAG_SLUGS.has(slug) || slug.length > 0))
    )
    // Prefer known taxonomy slugs; still allow legacy selected values so admins can remove them later
    const customClean = Array.from(
      new Set(
        custom
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, MAX_CUSTOM_TAGS)
      )
    )

    const vibe_tags = {
      selected: selectedClean,
      custom: customClean,
      tag_set: tag_set && isVibeGroup(tag_set) ? tag_set : null,
    }
    const supabase = createAdminClient()

    const { data: business, error: bizError } = await supabase
      .from('business_profiles')
      .select('id, business_name, city')
      .eq('id', businessId)
      .eq('city', city)
      .single()

    if (bizError || !business) {
      return NextResponse.json(
        { success: false, error: 'Business not found in your franchise area' },
        { status: 404 }
      )
    }

    const { error: updateError } = await supabase
      .from('business_profiles')
      .update({
        vibe_tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId)

    if (updateError) {
      console.error('Admin vibe_tags update failed:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message || 'Failed to update vibe tags' },
        { status: 500 }
      )
    }

    revalidatePath('/admin')
    revalidatePath('/user')

    return NextResponse.json({
      success: true,
      vibe_tags,
      message: `Vibe tags updated for ${business.business_name}`,
    })
  } catch (error) {
    console.error('Admin update-vibe-tags error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
