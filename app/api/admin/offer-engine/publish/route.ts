import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { coveredCitiesFor } from '@/lib/offer-engine/generate-offers'
import { publishListing } from '@/lib/listing-engine/publish-listing'

/**
 * Publish (a.k.a. "Confirm") the accepted AI listing fields for ONE business to
 * the live business_profiles record. See lib/listing-engine/publish-listing.ts for
 * the field rules. Offers are held for the claim flow, not published here.
 */
export async function POST(request: NextRequest) {
  const guard = await requireCityAdmin(request)
  if ('error' in guard) return guard.error
  const { city, adminId } = guard.ctx

  try {
    const body = await request.json().catch(() => ({}))
    const businessId: string | undefined = body?.businessId
    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const result = await publishListing(supabase, businessId, adminId, coveredCitiesFor(city))

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ success: true, published: result.published, publishedAt: result.publishedAt })
  } catch (error) {
    console.error('publish error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
