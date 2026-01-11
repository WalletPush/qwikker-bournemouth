import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import { getCategoryVariants, PLACEHOLDER_LIBRARY } from '@/lib/constants/category-placeholders'
import type { SystemCategory } from '@/lib/constants/system-categories'

/**
 * Admin-only API route to update placeholder_variant for a business
 * 
 * Safety rules:
 * - Only admins can access
 * - Only unclaimed businesses can have placeholder overrides
 * - Franchise-scoped (admin can only modify businesses in their city)
 * - Variant must exist for the business's system_category
 */
export async function POST(req: Request) {
  try {
    const { businessId, placeholderVariant } = await req.json()

    // Validation
    if (!businessId || placeholderVariant === undefined || placeholderVariant === null) {
      return NextResponse.json(
        { error: 'Missing businessId or placeholderVariant' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const franchise = getFranchiseCityFromRequest(req)

    // 1) Load business (ensure franchise scope)
    const { data: business, error: bErr } = await supabase
      .from('business_profiles')
      .select('id, franchise_id, status, system_category, business_name')
      .eq('id', businessId)
      .single()

    if (bErr || !business) {
      console.error('Business not found:', bErr)
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Franchise scope check
    if (business.franchise_id !== franchise.id) {
      console.warn(`Forbidden: Admin tried to update business ${businessId} outside their franchise`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only allow overrides for unclaimed businesses
    if (business.status !== 'unclaimed') {
      return NextResponse.json(
        { error: 'Only unclaimed listings can use placeholder overrides. Claimed businesses should upload real images.' },
        { status: 400 }
      )
    }

    const systemCategory = (business.system_category ?? 'other') as SystemCategory

    // 2) Validate variant exists for category
    const categoryData = PLACEHOLDER_LIBRARY[systemCategory]
    const selectedVariant = categoryData?.variants.find(v => v.id === placeholderVariant)
    
    if (!selectedVariant || !categoryData) {
      return NextResponse.json(
        { error: `Invalid placeholderVariant (${placeholderVariant}) for category ${systemCategory}` },
        { status: 400 }
      )
    }

    // Unclaimed range enforcement: Unclaimed businesses can only use variants 0 to unclaimedMax
    if (business.status === 'unclaimed') {
      const unclaimedMax = categoryData.unclaimedMaxVariantId
      if (placeholderVariant < 0 || placeholderVariant > unclaimedMax) {
        return NextResponse.json(
          { error: `For unclaimed listings, variant must be between 0 and ${unclaimedMax}. Variant ${placeholderVariant} is too specific and could misrepresent the business.` },
          { status: 400 }
        )
      }
    }

    // 3) Update business
    const { error: uErr } = await supabase
      .from('business_profiles')
      .update({ placeholder_variant: placeholderVariant })
      .eq('id', businessId)

    if (uErr) {
      console.error('Failed to update placeholder_variant:', uErr)
      return NextResponse.json({ error: uErr.message }, { status: 500 })
    }

    console.log(`✅ Updated placeholder_variant for ${business.business_name} (${businessId}) to variant ${placeholderVariant}`)

    return NextResponse.json({
      success: true,
      businessId,
      placeholderVariant,
      message: `Placeholder updated to variant ${placeholderVariant}`,
    })
  } catch (error: any) {
    console.error('Error updating placeholder_variant:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

