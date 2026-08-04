import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { coveredCitiesFor } from '@/lib/offer-engine/generate-offers'

/**
 * GET  ?businessId= — fetch a saved enrichment draft + review decisions (drawer).
 * PATCH { businessId, decisions } — persist per-field Accept/Decline decisions.
 * Both are city-scoped to the admin's covered cities.
 */

async function assertBusinessInCity(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  city: string
): Promise<boolean> {
  const { data } = await supabase
    .from('business_profiles')
    .select('city')
    .eq('id', businessId)
    .single()
  if (!data) return false
  const covered = coveredCitiesFor(city).map((c) => c.toLowerCase())
  return !data.city || covered.length === 0 || covered.includes(String(data.city).toLowerCase())
}

export async function GET(request: NextRequest) {
  const guard = await requireCityAdmin(request)
  if ('error' in guard) return guard.error
  const { city } = guard.ctx

  try {
    const businessId = new URL(request.url).searchParams.get('businessId') || ''
    if (!businessId) return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })

    const supabase = createAdminClient()
    if (!(await assertBusinessInCity(supabase, businessId, city))) {
      return NextResponse.json({ error: 'Business is outside your franchise area' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('business_enrichments')
      .select(
        'business_id, status, draft, decisions, edits, generated_at, updated_at, published_at, sent_at, sent_to_email, claim_link_clicked_at, claim_link_click_count, demo_link_clicked_at, demo_link_click_count'
      )
      .eq('business_id', businessId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ enrichment: data || null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireCityAdmin(request)
  if ('error' in guard) return guard.error
  const { city } = guard.ctx

  try {
    const body = await request.json().catch(() => ({}))
    const businessId: string | undefined = body?.businessId
    const decisions = body?.decisions
    const edits = body?.edits
    const hasDecisions = typeof decisions === 'object' && decisions !== null
    const hasEdits = typeof edits === 'object' && edits !== null
    if (!businessId || (!hasDecisions && !hasEdits)) {
      return NextResponse.json({ error: 'Missing businessId or decisions/edits' }, { status: 400 })
    }

    const supabase = createAdminClient()
    if (!(await assertBusinessInCity(supabase, businessId, city))) {
      return NextResponse.json({ error: 'Business is outside your franchise area' }, { status: 403 })
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (hasDecisions) update.decisions = decisions
    if (hasEdits) update.edits = edits

    const { error } = await supabase
      .from('business_enrichments')
      .update(update)
      .eq('business_id', businessId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
