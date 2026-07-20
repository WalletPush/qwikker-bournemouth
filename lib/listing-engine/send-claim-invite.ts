/**
 * Shared claim-invitation builder + sender.
 *
 * Both the single-send route (/api/admin/send-claim-email) and the bulk-send route
 * (/api/admin/offer-engine/send-bulk) use these helpers so the email content, the
 * social-proof/offer grounding, and the "record sent_at" behaviour stay identical
 * no matter how the invite is triggered. Caller is responsible for auth + tenant
 * (city) checks before invoking.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { sendFranchiseEmail, getFranchiseBaseUrl, getFranchiseSupportEmail } from '@/lib/email/send-franchise-email'
import { createClaimInvitationEmail } from '@/lib/email/templates/business-notifications'

type AdminClient = ReturnType<typeof createAdminClient>

export interface InviteBusiness {
  id: string
  business_name: string | null
  email: string | null
  city: string | null
  status: string | null
  owner_user_id: string | null
  rating: number | null
  review_count: number | null
}

export interface InviteContent {
  listingTeaser?: { tagline?: string | null; description?: string | null }
  offers?: Array<{ name: string; value: string; rationale?: string | null }>
}

/** True when a business must NOT be invited (already owned/live). */
export function isAlreadyClaimed(b: Pick<InviteBusiness, 'owner_user_id' | 'status'>): boolean {
  return !!b.owner_user_id || b.status === 'approved' || b.status === 'live'
}

/**
 * Pull the AI-drafted listing teaser + offers (respecting per-field "declined"
 * decisions and admin edits) so the invite showcases exactly what we built.
 * Non-fatal: returns an empty object if there's no draft or it can't be read.
 */
export async function getInviteContent(supabaseAdmin: AdminClient, businessId: string): Promise<InviteContent> {
  const out: InviteContent = {}
  try {
    const { data: enrichment } = await supabaseAdmin
      .from('business_enrichments')
      .select('draft, decisions, edits')
      .eq('business_id', businessId)
      .maybeSingle()

    if (!enrichment?.draft) return out

    const draft = enrichment.draft as {
      listing?: { business_tagline?: { value?: string }; business_description?: { value?: string } }
      offers?: Array<{ offer_name?: string; offer_value?: string; rationale?: string }>
    }
    const decisions = (enrichment.decisions || {}) as Record<string, string>
    const edits = (enrichment.edits || {}) as Record<string, string>

    const tagline =
      decisions['tagline'] === 'declined' ? null : edits.tagline ?? draft.listing?.business_tagline?.value ?? null
    const description =
      decisions['description'] === 'declined'
        ? null
        : edits.description ?? draft.listing?.business_description?.value ?? null
    if (tagline || description) out.listingTeaser = { tagline, description }

    const offers = (draft.offers || [])
      .map((o, i) => ({ offer: o, declined: decisions[`offer-${i}`] === 'declined' }))
      .filter((x) => !x.declined && x.offer?.offer_name && x.offer?.offer_value)
      .map((x) => ({
        name: String(x.offer.offer_name),
        value: String(x.offer.offer_value),
        rationale: x.offer.rationale ? String(x.offer.rationale) : null,
      }))
    if (offers.length > 0) out.offers = offers
  } catch (e) {
    console.warn('send-claim-invite: could not load enrichment draft', e)
  }
  return out
}

/** Build the branded claim-invitation email (pure — no side effects). */
export function buildClaimTemplate(business: InviteBusiness, city: string, content: InviteContent) {
  const baseUrl = getFranchiseBaseUrl(city)
  const supportEmail = getFranchiseSupportEmail(city)
  return createClaimInvitationEmail({
    businessName: business.business_name || 'your business',
    city,
    claimUrl: `${baseUrl}/claim?business_id=${business.id}`,
    forBusinessUrl: `${baseUrl}/for-business`,
    supportEmail,
    listingTeaser: content.listingTeaser,
    offers: content.offers,
    // Real Google social proof — only passed through, never invented.
    socialProof: { rating: business.rating, reviewCount: business.review_count },
  })
}

/**
 * Send ONE claim invite and record sent_at. Returns a per-business outcome so a
 * bulk caller can report which succeeded. Guards claimed/no-email defensively.
 */
export async function sendClaimInvite(
  supabaseAdmin: AdminClient,
  business: InviteBusiness,
  adminId: string
): Promise<{ ok: boolean; to?: string; error?: string }> {
  if (!business.email) return { ok: false, error: 'No email on file' }
  if (isAlreadyClaimed(business)) return { ok: false, error: 'Already claimed' }

  const city = business.city || ''
  const content = await getInviteContent(supabaseAdmin, business.id)
  const template = buildClaimTemplate(business, city, content)

  const emailResult = await sendFranchiseEmail({
    city,
    to: business.email,
    template,
    tags: [{ name: 'type', value: 'claim_invitation' }],
  })

  if (!emailResult.success) {
    console.error(`❌ [${city}] Claim invite failed for ${business.email}: ${emailResult.error}`)
    return { ok: false, error: emailResult.error || 'Failed to send email' }
  }

  try {
    const nowIso = new Date().toISOString()
    await supabaseAdmin
      .from('business_enrichments')
      .update({ sent_at: nowIso, sent_by: adminId, updated_at: nowIso })
      .eq('business_id', business.id)
  } catch (e) {
    console.warn('send-claim-invite: could not record sent_at', e)
  }

  console.log(`📧 [${city}] Claim invite sent to ${business.email} (${business.business_name})`)
  return { ok: true, to: business.email }
}
