import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { coveredCitiesFor } from '@/lib/offer-engine/generate-offers'

/**
 * Review-by-exception decisions for the Acquisition Engine.
 *
 * POST { businessIds: string[], action: 'approved' | 'skipped' | 'rejected' }
 *   - approved  -> forces the card to Ready to Send (used by "Approve all high-confidence")
 *   - skipped   -> leaves it in Needs Review, marks it looked-at
 *   - rejected  -> removes it from the board (won't be sent)
 *
 * Handles both a single id and a bulk array. City-scoped: only businesses in the
 * admin's covered cities are touched.
 */
const VALID_ACTIONS = new Set(['approved', 'skipped', 'rejected'])

export async function POST(request: NextRequest) {
  const guard = await requireCityAdmin(request)
  if ('error' in guard) return guard.error
  const { city, adminId } = guard.ctx

  try {
    const body = await request.json().catch(() => ({}))
    const action: string = body?.action
    const rawIds: unknown = body?.businessIds ?? (body?.businessId ? [body.businessId] : [])

    if (!VALID_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    const ids = Array.isArray(rawIds) ? rawIds.filter((x): x is string => typeof x === 'string') : []
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No businessIds provided' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // City scope: keep only ids whose business_profiles.city is covered.
    const covered = coveredCitiesFor(city).map((c) => c.toLowerCase())
    const { data: bizRows } = await supabase.from('business_profiles').select('id, city').in('id', ids)
    const allowedIds = (bizRows || [])
      .filter((b) => !b.city || covered.length === 0 || covered.includes(String(b.city).toLowerCase()))
      .map((b) => b.id)

    if (allowedIds.length === 0) {
      return NextResponse.json({ error: 'No businesses in your franchise area' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('business_enrichments')
      .update({ review_action: action, reviewed_at: now, reviewed_by: adminId, updated_at: now })
      .in('business_id', allowedIds)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, updated: allowedIds.length, action })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
