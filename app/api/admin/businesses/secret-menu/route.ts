import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { getMaxSecretMenuItems } from '@/lib/utils/tier-limits'

const secretItemSchema = z.object({
  itemName: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  price: z.string().trim().max(40).optional().nullable(),
  image_url: z.string().trim().optional().nullable(),
  ordering_instructions: z.string().trim().max(500).optional().nullable(),
  created_at: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  approved_at: z.string().optional().nullable(),
})

const updateSchema = z.object({
  businessId: z.string().uuid(),
  secret_menu_items: z.array(secretItemSchema).max(50),
})

interface NotesShape {
  secret_menu_items?: unknown[]
  [key: string]: unknown
}

function parseNotes(raw: string | null | undefined): NotesShape {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as NotesShape) : {}
  } catch {
    return {}
  }
}

/** POST: immediate admin replace of secret_menu_items inside additional_notes. */
export async function POST(request: NextRequest) {
  const guard = await requireCityAdmin(request)
  if ('error' in guard) return guard.error
  const { city } = guard.ctx

  try {
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid secret menu data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { businessId, secret_menu_items } = parsed.data
    const supabase = createServiceRoleClient()

    const { data: business, error: bizError } = await supabase
      .from('business_profiles')
      .select('id, business_name, city, plan, status, additional_notes')
      .eq('id', businessId)
      .eq('city', city)
      .single()

    if (bizError || !business) {
      return NextResponse.json(
        { success: false, error: 'Business not found in your franchise area' },
        { status: 404 }
      )
    }

    const tier = business.status === 'claimed_free' ? 'claimed_free' : (business.plan || 'starter')
    const maxItems = getMaxSecretMenuItems(tier)
    const existingNotes = parseNotes(business.additional_notes)
    const existingCount = Array.isArray(existingNotes.secret_menu_items)
      ? existingNotes.secret_menu_items.length
      : 0

    // Allow keeping legacy over-cap lists, but never grow past the tier max
    const allowedMax = Math.max(maxItems, existingCount)
    if (secret_menu_items.length > allowedMax) {
      return NextResponse.json(
        {
          success: false,
          error: `Secret menu limit for this plan is ${maxItems} items`,
        },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const normalized = secret_menu_items.map((item) => ({
      itemName: item.itemName,
      description: item.description?.trim() || '',
      price: item.price?.trim() || '',
      ...(item.image_url ? { image_url: item.image_url } : {}),
      ...(item.ordering_instructions ? { ordering_instructions: item.ordering_instructions } : {}),
      created_at: item.created_at || now,
      status: item.status || 'approved',
      approved_at: item.approved_at || now,
    }))

    const nextNotes: NotesShape = {
      ...existingNotes,
      secret_menu_items: normalized,
    }

    const { error: updateError } = await supabase
      .from('business_profiles')
      .update({
        additional_notes: JSON.stringify(nextNotes),
        updated_at: now,
      })
      .eq('id', businessId)

    if (updateError) {
      console.error('Admin secret menu update failed:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message || 'Failed to update secret menu' },
        { status: 500 }
      )
    }

    console.log(
      `✅ Admin updated secret menu (${normalized.length} items) for ${business.business_name} in ${city}`
    )

    return NextResponse.json({
      success: true,
      secret_menu_items: normalized,
      message: 'Secret menu updated',
    })
  } catch (error) {
    console.error('Admin secret-menu update error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
