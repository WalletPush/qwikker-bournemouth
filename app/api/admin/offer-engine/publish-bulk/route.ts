import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { coveredCitiesFor } from '@/lib/offer-engine/generate-offers'
import { publishListing } from '@/lib/listing-engine/publish-listing'

/**
 * Bulk "Confirm all" — publish the accepted listing fields for many businesses at
 * once (used by "Confirm all high-confidence"). City-scoped; each business is
 * published independently and per-id results are returned so the UI can flip the
 * ones that succeeded to Live without a full reload.
 */
export async function POST(request: NextRequest) {
  const guard = await requireCityAdmin(request)
  if ('error' in guard) return guard.error
  const { city, adminId } = guard.ctx

  try {
    const body = await request.json().catch(() => ({}))
    const rawIds: unknown = body?.businessIds
    const ids = Array.isArray(rawIds) ? rawIds.filter((x): x is string => typeof x === 'string') : []
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No businessIds provided' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const covered = coveredCitiesFor(city)

    const results: Array<{ businessId: string; ok: boolean; error?: string }> = []
    let published = 0
    for (const businessId of ids) {
      const outcome = await publishListing(supabase, businessId, adminId, covered)
      if (outcome.ok) {
        published++
        results.push({ businessId, ok: true })
      } else {
        results.push({ businessId, ok: false, error: outcome.error })
      }
    }

    return NextResponse.json({ success: true, published, total: ids.length, results })
  } catch (error) {
    console.error('publish-bulk error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
