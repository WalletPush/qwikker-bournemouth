import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'

const menuItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.string().trim().max(40).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  image_url: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((v) => !v || v === '' || /^https?:\/\//i.test(v), 'Invalid image URL'),
})

const updateSchema = z.object({
  businessId: z.string().uuid(),
  menu_preview: z.array(menuItemSchema).max(5),
})

/** POST: immediate admin replace of featured items (menu_preview). */
export async function POST(request: NextRequest) {
  try {
    const city = await getFranchiseCityFromRequest()
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid featured items data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { businessId, menu_preview } = parsed.data
    const supabase = createServiceRoleClient()

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

    const normalized = menu_preview.map((item) => ({
      name: item.name,
      price: item.price?.trim() || '',
      description: item.description?.trim() || '',
      ...(item.image_url && item.image_url !== '' ? { image_url: item.image_url } : {}),
    }))

    const { error: updateError } = await supabase
      .from('business_profiles')
      .update({
        menu_preview: normalized,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId)

    if (updateError) {
      console.error('Admin menu_preview update failed:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message || 'Failed to update featured items' },
        { status: 500 }
      )
    }

    console.log(
      `✅ Admin updated menu_preview (${normalized.length} items) for ${business.business_name} in ${city}`
    )

    return NextResponse.json({
      success: true,
      menu_preview: normalized,
      message: 'Featured items updated',
    })
  } catch (error) {
    console.error('Admin menu-preview update error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
