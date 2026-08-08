/**
 * Load AI-drafted offers from Acquisition Engine enrichments for offer_suggestions emails.
 * Does NOT re-run AI — uses existing draft. Re-enrich separately in Acquisition Engine.
 */

import { getInviteContent } from '@/lib/listing-engine/send-claim-invite'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SuiteOfferIdea } from '@/lib/email/suite-templates'

export async function loadSuiteOfferIdeas(businessId: string): Promise<{
  offers: SuiteOfferIdea[]
  source: 'enrichment' | 'none'
}> {
  try {
    const supabase = createAdminClient()
    const content = await getInviteContent(supabase, businessId)
    if (content.offers && content.offers.length > 0) {
      return {
        offers: content.offers.map((o) => ({
          name: o.name,
          value: o.value,
          rationale: o.rationale,
        })),
        source: 'enrichment',
      }
    }
  } catch (e) {
    console.warn('suite-offers: load failed', e)
  }
  return { offers: [], source: 'none' }
}
