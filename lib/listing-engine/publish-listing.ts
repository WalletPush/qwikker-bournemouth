/**
 * Publish the ACCEPTED (non-declined) AI listing fields from an enrichment draft
 * to the live business_profiles record. Shared by the single publish route and the
 * bulk "Confirm all" route so the rules stay in one place.
 *
 * Model:
 *   - Listing fields (description, tagline, featured items) go LIVE now.
 *   - Offers are NOT published here — they're held in the draft for the owner to
 *     accept/edit/decline at claim time.
 * A field publishes unless the admin marked it "declined". Admin `edits` win over
 * the AI draft. We never overwrite a live field with an empty value.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PublishResult {
  description: boolean
  tagline: boolean
  featuredItems: number
}

export type PublishOutcome =
  | { ok: true; published: PublishResult; publishedAt: string }
  | { ok: false; status: number; error: string }

export async function publishListing(
  supabase: SupabaseClient,
  businessId: string,
  adminId: string,
  coveredCities: string[]
): Promise<PublishOutcome> {
  // City scope
  const covered = coveredCities.map((c) => c.toLowerCase())
  const { data: biz } = await supabase
    .from('business_profiles')
    .select('id, city')
    .eq('id', businessId)
    .single()
  if (!biz) return { ok: false, status: 404, error: 'Business not found' }
  if (biz.city && covered.length > 0 && !covered.includes(String(biz.city).toLowerCase())) {
    return { ok: false, status: 403, error: 'Business is outside your franchise area' }
  }

  // Load the draft + decisions + admin edits
  const { data: enrichment } = await supabase
    .from('business_enrichments')
    .select('draft, decisions, edits')
    .eq('business_id', businessId)
    .maybeSingle()

  if (!enrichment?.draft) {
    return { ok: false, status: 400, error: 'No draft to publish — enrich this business first.' }
  }

  const draft = enrichment.draft as {
    listing?: {
      business_tagline?: { value?: string }
      business_description?: { value?: string }
      featured_items?: Array<{ name?: string; description?: string; price?: string }>
    }
  }
  const decisions = (enrichment.decisions || {}) as Record<string, string>
  const edits = (enrichment.edits || {}) as Record<string, string>

  const businessUpdate: Record<string, unknown> = {}
  const published: PublishResult = { description: false, tagline: false, featuredItems: 0 }

  const description = (edits.description ?? draft.listing?.business_description?.value)?.trim()
  if (decisions['description'] !== 'declined' && description) {
    businessUpdate.business_description = description
    published.description = true
  }

  const tagline = (edits.tagline ?? draft.listing?.business_tagline?.value)?.trim()
  if (decisions['tagline'] !== 'declined' && tagline) {
    businessUpdate.business_tagline = tagline
    published.tagline = true
  }

  const featured = (draft.listing?.featured_items || [])
    .map((it, i) => ({ it, declined: decisions[`feat-${i}`] === 'declined' }))
    .filter((x) => !x.declined && x.it?.name?.trim())
    .map((x) => ({
      name: String(x.it.name).trim(),
      // Real price captured during enrichment (verbatim from source, verified
      // against the source text). Empty when the source showed no price — the
      // listing hides empty prices rather than rendering "£0.00".
      price: (typeof x.it.price === 'string' ? x.it.price.trim() : ''),
      description: (x.it.description || '').trim(),
    }))
    // Free-tier promise is "Up to 5 featured menu items" (lib/utils/tier-limits.ts).
    .slice(0, 5)
  if (featured.length > 0) {
    businessUpdate.menu_preview = featured
    published.featuredItems = featured.length
  }

  if (Object.keys(businessUpdate).length === 0) {
    return { ok: false, status: 400, error: 'Nothing to publish — all listing fields were declined or empty.' }
  }

  // Publishing a listing live also makes it (and its featured items) discoverable by
  // the Qwikker AI: it enters the Tier 3 chat fallback pool
  // (business_profiles_ai_fallback_pool requires admin_chat_fallback_approved = true).
  // No point publishing rich content the AI can't surface.
  businessUpdate.admin_chat_fallback_approved = true

  const { error: updateError } = await supabase
    .from('business_profiles')
    .update(businessUpdate)
    .eq('id', businessId)

  if (updateError) {
    return { ok: false, status: 500, error: `Publish failed: ${updateError.message}` }
  }

  const now = new Date().toISOString()
  await supabase
    .from('business_enrichments')
    .update({ published_at: now, published_by: adminId, updated_at: now })
    .eq('business_id', businessId)

  return { ok: true, published, publishedAt: now }
}
