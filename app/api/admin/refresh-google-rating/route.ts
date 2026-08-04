import { NextRequest, NextResponse } from 'next/server'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { refreshBusinessRating, refreshRatingsForCity } from '@/lib/google/refresh-business-rating'

/**
 * POST /api/admin/refresh-google-rating
 *
 * Body:
 *   { businessId } — refresh one business
 *   { all: true, limit?, offset? } — batch page of ALL listings with a Place ID
 *   { staleOnly: true, limit?, staleDays?, offset? } — batch page of stale only
 *
 * Admin UI "Refresh all ratings" loops { all: true } until hasMore is false.
 */
export async function POST(request: NextRequest) {
  const guard = await requireCityAdmin(request)
  if ('error' in guard) return guard.error
  const { city } = guard.ctx

  try {
    const body = await request.json().catch(() => ({}))
    const businessId = typeof body?.businessId === 'string' ? body.businessId : null

    if (businessId) {
      const result = await refreshBusinessRating(businessId)
      if (!result.ok) {
        return NextResponse.json({ error: result.error || 'Refresh failed', result }, { status: 400 })
      }
      return NextResponse.json({ success: true, result })
    }

    if (body?.all || body?.staleOnly) {
      const limit = Math.min(Math.max(parseInt(String(body.limit || '25'), 10) || 25, 1), 50)
      const offset = Math.max(parseInt(String(body.offset || '0'), 10) || 0, 0)
      const staleDays = Math.min(Math.max(parseInt(String(body.staleDays || '7'), 10) || 7, 1), 90)
      const batch = await refreshRatingsForCity({
        city,
        mode: body.all ? 'all' : 'stale',
        limit,
        offset,
        staleDays,
      })
      return NextResponse.json({ success: true, city, ...batch })
    }

    return NextResponse.json(
      { error: 'Provide businessId, { all: true }, or { staleOnly: true }' },
      { status: 400 }
    )
  } catch (err) {
    console.error('[refresh-google-rating]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
