import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { restoreUnclaimedToPlaceholderPool } from '@/lib/media/restore-placeholder-pool'

/**
 * Admin-only: set or clear a custom placeholder for an UNCLAIMED business.
 * Pass `url: null` to remove the custom image and fall back to the pool.
 */
export async function POST(req: NextRequest) {
  const guard = await requireCityAdmin(req)
  if ('error' in guard) return guard.error
  const { city, adminId } = guard.ctx

  try {
    const { businessId, url } = await req.json()

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
    }

    const clearing = url === null
    if (!clearing && (typeof url !== 'string' || !/^https?:\/\//i.test(url))) {
      return NextResponse.json(
        { error: 'url must be an http(s) URL, or null to clear' },
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
            'Only unclaimed listings can use custom placeholders. Claimed businesses upload real images.',
        },
        { status: 400 }
      )
    }

    if (clearing) {
      await restoreUnclaimedToPlaceholderPool(city, businessId)
      console.log(`✅ Cleared custom display → pool for ${business.business_name}`)
      return NextResponse.json({ success: true, businessId, url: null })
    }

    // Set custom URL, then index as media hero (canonical display)
    const { error: uErr } = await supabase
      .from('business_profiles')
      .update({ placeholder_custom_url: url })
      .eq('id', businessId)

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 })
    }

    try {
      const { createMediaAsset } = await import('@/lib/media/media-service')
      await createMediaAsset({
        city,
        businessId,
        sourceUrl: url,
        assetType: 'business_photo',
        reviewStatus: 'approved',
        setAsHero: true,
        uploadedBy: adminId,
        curatedBy: adminId,
      })
    } catch (mediaErr) {
      console.warn('[media_assets] custom placeholder index failed:', mediaErr)
    }

    // Keep placeholder_custom_url set for legacy readers (selectHeroMedia clears it —
    // re-apply so Remove UI + cover resolver stay consistent)
    await supabase
      .from('business_profiles')
      .update({ placeholder_custom_url: url })
      .eq('id', businessId)

    console.log(`✅ Set custom placeholder for ${business.business_name}`)
    return NextResponse.json({ success: true, businessId, url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error updating placeholder_custom_url:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
