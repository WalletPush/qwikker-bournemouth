import type { Stage } from '@/lib/listing-engine/pipeline-stage'

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
  rating: number | null
  reviewCount: number | null
  hasWebsite: boolean
  hasPlaceId: boolean
  category: string | null
  stage: Stage
  confidence: number | null
  flags: string[]
  sentAt: string | null
  reviewAction: string | null
  enrichment: RowEnrichment | null
}
