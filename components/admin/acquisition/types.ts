import type { Stage } from '@/lib/listing-engine/pipeline-stage'
import type { ContactMethod } from '@/lib/listing-engine/contact-methods'

export interface RowEnrichment {
  status: string
  offersCount: number
  hasListing: boolean
  generatedAt: string | null
  published: boolean
}

export interface PipelineRow {
  id: string
  name: string
  town: string | null
  city: string | null
  claimed: boolean
  email: string | null
  emailCandidates?: string[]
  /** WhatsApp number (digits) — explicit link or a site mobile; never a landline/Google number. */
  whatsapp?: string | null
  /** True when `whatsapp` came from an explicit wa.me/WhatsApp link (vs an inferred mobile). */
  whatsappVerified?: boolean
  /** Phone on file (site tel: or Google) — WhatsApp fallback / manual call. */
  phone?: string | null
  /** Franchise country dialing code for normalizing national-format numbers. */
  dialCode?: string
  /** Unified outreach channels discovered on enrich (email/whatsapp/phone/socials). */
  contactMethods?: ContactMethod[]
  rating: number | null
  reviewCount: number | null
  hasWebsite: boolean
  hasPlaceId: boolean
  category: string | null
  stage: Stage
  confidence: number | null
  flags: string[]
  sentAt: string | null
  /** Recipient snapshot at invite send time (fallback to `email` for older rows). */
  sentToEmail: string | null
  claimLinkClickedAt: string | null
  claimLinkClickCount: number
  demoLinkClickedAt: string | null
  demoLinkClickCount: number
  reviewAction: string | null
  enrichment: RowEnrichment | null
}
