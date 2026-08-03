import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { coveredCitiesFor } from '@/lib/offer-engine/generate-offers'
import { publishListing } from '@/lib/listing-engine/publish-listing'
import { isAlreadyClaimed, sendClaimInvite, type InviteBusiness } from '@/lib/listing-engine/send-claim-invite'

/**
 * Bulk "Confirm & send invites" for the Acquisition Engine's Send-ready bucket.
 *
 * For each business (city-scoped): publish the accepted listing live (idempotent),
 * then send the claim invite. Skips anything claimed, already-sent, or with no
 * email. Returns per-id results so the UI can flip the ones that succeeded.
 *
 * SAFETY: this is the ONLY bulk-send path and it is always driven by an explicit
 * confirmation modal in the UI that lists every recipient. A hard cap protects
 * against a runaway request.
 */
const MAX_BULK = 200

export async function POST(request: NextRequest) {
  const guard = await requireCityAdmin(request)
  if ('error' in guard) return guard.error
  const { city, adminId } = guard.ctx

  try {
    const body = await request.json().catch(() => ({}))
    const rawIds: unknown = body?.businessIds
    const ids = Array.isArray(rawIds) ? rawIds.filter((x): x is string => typeof x === 'string').slice(0, MAX_BULK) : []
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No businessIds provided' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const covered = coveredCitiesFor(city)

    // Load only the businesses in-scope for this admin's covered cities.
    const { data: businesses, error } = await supabase
      .from('business_profiles')
      .select('id, business_name, email, city, status, owner_user_id, rating, review_count')
      .in('id', ids)
      .in('city', covered)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const byId = new Map<string, InviteBusiness>((businesses || []).map((b) => [b.id, b as InviteBusiness]))

    const results: Array<{ businessId: string; ok: boolean; sent?: boolean; error?: string }> = []
    let sent = 0

    for (const id of ids) {
      const business = byId.get(id)
      if (!business) {
        results.push({ businessId: id, ok: false, error: 'Not found or outside your area' })
        continue
      }
      if (isAlreadyClaimed(business)) {
        results.push({ businessId: id, ok: false, error: 'Already claimed' })
        continue
      }
      if (!business.email) {
        results.push({ businessId: id, ok: false, error: 'No email on file' })
        continue
      }

      // Publish the listing live first (an invite implies a visible listing).
      // Non-fatal if it fails — we still try to send, matching single-send behaviour.
      const pub = await publishListing(supabase, id, adminId, covered)
      if (!pub.ok) {
        results.push({ businessId: id, ok: false, error: pub.error || 'Publish failed' })
        continue
      }

      // Bulk sends skip the (slow) headless-Chrome PDF attachment so a large
      // batch can't blow the serverless time limit. Single "Send" attaches it.
      const outcome = await sendClaimInvite(supabase, business, adminId, { attachPdf: false })
      if (outcome.ok) {
        sent++
        results.push({ businessId: id, ok: true, sent: true })
      } else {
        results.push({ businessId: id, ok: false, error: outcome.error })
      }
    }

    return NextResponse.json({ success: true, sent, total: ids.length, results })
  } catch (error) {
    console.error('send-bulk error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
