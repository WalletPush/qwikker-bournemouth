import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { coveredCitiesFor } from '@/lib/offer-engine/generate-offers'
import { generateAcquisitionDraft } from '@/lib/listing-engine/generate-acquisition-draft'
import { scoreConfidence } from '@/lib/listing-engine/score-confidence'

/**
 * Generate an Acquisition draft for ONE business and persist it to
 * business_enrichments (status = ready). Called by the pipeline table, one
 * business at a time (the client drives the batch queue for visible progress
 * and cost control). Per-city, uses the franchise's own keys.
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

    // Optional per-field selection from enrich-on-import. The draft is always
    // generated in full (one LLM call produces listing + offers), but any field
    // the admin unticked is pre-marked "declined" so it won't publish live or be
    // shown at claim. Defaults to everything included.
    const include = {
      description: body?.include?.description !== false,
      tagline: body?.include?.tagline !== false,
      featuredItems: body?.include?.featuredItems !== false,
      offers: body?.include?.offers !== false,
    }

    const result = await generateAcquisitionDraft(businessId, city, coveredCitiesFor(city))

    // Seed review decisions for anything the admin opted out of at import time.
    const decisions: Record<string, string> = {}
    if (!include.description) decisions.description = 'declined'
    if (!include.tagline) decisions.tagline = 'declined'
    if (!include.featuredItems) {
      result.listing.featured_items.forEach((_, i) => {
        decisions[`feat-${i}`] = 'declined'
      })
    }
    if (!include.offers) {
      result.offers.forEach((_, i) => {
        decisions[`offer-${i}`] = 'declined'
      })
    }

    // Explainable confidence from the real grounding signals (no LLM call).
    const confidence = scoreConfidence(result)

    const supabase = createAdminClient()
    const now = new Date().toISOString()
    const upsertPayload: Record<string, unknown> = {
      business_id: businessId,
      city: result.business.city,
      status: 'ready',
      draft: result,
      confidence: confidence.score,
      confidence_signals: { signals: confidence.signals, flags: confidence.flags },
      model: result.meta.model,
      cost_estimate_usd: result.meta.costEstimateUsd,
      error: null,
      generated_by: adminId,
      generated_at: now,
      updated_at: now,
      // Regeneration invalidates any prior review/send decision so the card
      // re-enters the pipeline at Needs Review / Ready to Send based on the new score.
      review_action: null,
      reviewed_at: null,
      reviewed_by: null,
      sent_at: null,
      sent_by: null,
    }
    // Only seed decisions when the admin opted fields out; otherwise leave any
    // existing per-field decisions intact (a full re-enrich shouldn't wipe review).
    if (Object.keys(decisions).length > 0) upsertPayload.decisions = decisions

    const { error: upsertError } = await supabase
      .from('business_enrichments')
      .upsert(upsertPayload, { onConflict: 'business_id' })

    if (upsertError) {
      console.error('enrich upsert error:', upsertError)
      return NextResponse.json({ error: `Saved draft failed: ${upsertError.message}` }, { status: 500 })
    }

    // Discover contact email while we already have the site scanned — so outreach
    // is a single click later. Auto-save the best candidate ONLY if the business
    // has no email on file (never overwrite a real one). Candidates are returned
    // so the admin can still pick a different one in the outreach step.
    const candidates = result.contact?.emails || []
    let savedEmail: string | null = null
    try {
      const { data: bp } = await supabase
        .from('business_profiles')
        .select('email')
        .eq('id', businessId)
        .single()

      if (bp && !bp.email && candidates.length > 0) {
        await supabase.from('business_profiles').update({ email: candidates[0] }).eq('id', businessId)
        savedEmail = candidates[0]
      } else {
        savedEmail = bp?.email || null
      }
    } catch (e) {
      console.warn('enrich: email auto-save skipped', e)
    }

    return NextResponse.json({
      success: true,
      result,
      savedEmail,
      emailCandidates: candidates,
      confidence: confidence.score,
      flags: confidence.flags,
    })
  } catch (error) {
    console.error('enrich error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'

    // Best-effort: record the failure so the table can show an error state.
    try {
      const body = await request.clone().json().catch(() => ({}))
      if (body?.businessId) {
        const supabase = createAdminClient()
        await supabase
          .from('business_enrichments')
          .upsert(
            { business_id: body.businessId, status: 'error', error: message, updated_at: new Date().toISOString() },
            { onConflict: 'business_id' }
          )
      }
    } catch {
      /* ignore */
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
