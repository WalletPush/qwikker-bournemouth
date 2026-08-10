import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { restoreUnclaimedToPlaceholderPool } from '@/lib/media/restore-placeholder-pool'

/**
 * Admin-only: set placeholder_variant for an unclaimed business and restore
 * the generated pool as the live display (clears custom upload / hero pointer).
 */
export async function POST(req: NextRequest) {
  const guard = await requireCityAdmin(req)
  if ('error' in guard) return guard.error
  const { city } = guard.ctx

  try {
    const { businessId, placeholderVariant } = await req.json()

    if (!businessId || placeholderVariant === undefined || placeholderVariant === null) {
      return NextResponse.json(
        { error: 'Missing businessId or placeholderVariant' },
        { status: 400 }
      )
    }

    if (
      typeof placeholderVariant !== 'number' ||
      !Number.isInteger(placeholderVariant) ||
      placeholderVariant < 0 ||
      placeholderVariant > 19
    ) {
      return NextResponse.json(
        { error: 'placeholderVariant must be an integer between 0 and 19' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { data: business, error: bErr } = await supabase
      .from('business_profiles')
      .select('id, city, status, business_name')
      .eq('id', businessId)
      .eq('city', city)
      .single()

    if (bErr || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (business.status !== 'unclaimed') {
      return NextResponse.json(
        {
          error:
            'Only unclaimed listings can use placeholder overrides. Claimed businesses should upload real images.',
        },
        { status: 400 }
      )
    }

    // Drop custom / media hero so the pool variant is what cards render
    await restoreUnclaimedToPlaceholderPool(city, businessId)

    const { error: uErr } = await supabase
      .from('business_profiles')
      .update({ placeholder_variant: placeholderVariant })
      .eq('id', businessId)
      .eq('city', city)

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 })
    }

    console.log(
      `✅ Restored placeholder pool for ${business.business_name} → variant ${placeholderVariant}`
    )

    return NextResponse.json({
      success: true,
      businessId,
      placeholderVariant,
      clearedCustomDisplay: true,
      message: `Placeholder updated to variant ${placeholderVariant}`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error updating placeholder_variant:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
