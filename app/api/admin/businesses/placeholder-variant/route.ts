import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'

/**
 * Admin-only API route to update placeholder_variant for a business
 * 
 * Simple system: variants 0, 1, 2 (corresponding to 00.webp, 01.webp, 02.webp)
 * 
 * Safety rules:
 * - Only admins can access
 * - Only unclaimed businesses can have placeholder overrides
 * - Franchise-scoped (admin can only modify businesses in their city)
 * - Variant must be 0, 1, or 2
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

    // Validate variant is 0, 1, or 2
    if (![0, 1, 2].includes(placeholderVariant)) {
      return NextResponse.json(
        { error: 'placeholderVariant must be 0, 1, or 2' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const city = await getFranchiseCityFromRequest()

    // 1) Load business (ensure franchise scope)
    const { data: business, error: bErr } = await supabase
      .from('business_profiles')
      .select('id, city, status, business_name')
      .eq('id', businessId)
      .eq('city', city) // 🔒 CRITICAL: Franchise scope - only businesses in admin's city
      .single()

    if (bErr || !business) {
      console.error('Business not found or not in this franchise:', bErr)
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Only allow overrides for unclaimed businesses
    if (business.status !== 'unclaimed') {
      return NextResponse.json(
        { error: 'Only unclaimed listings can use placeholder overrides. Claimed businesses should upload real images.' },
        { status: 400 }
      )
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

