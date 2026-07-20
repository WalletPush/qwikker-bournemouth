/**
 * Acquisition Engine v2 — pipeline stage model (client-safe).
 *
 * The pipeline STAGE is derived from primitives, never stored, so it can't drift:
 *   claimed (owner set) > sent (sent_at) > enriching/error (status) >
 *   ready: rejected > sent > approved|high-confidence => ready_to_send > needs_review >
 *   imported (no enrichment yet)
 *
 * This module has NO server imports so both the pipeline API route and the client
 * board component can share the exact same derivation + column config.
 */

/** Score at/above which a draft is auto-qualified for Ready to Send (no manual review). */
export const HIGH_CONFIDENCE = 85

export type Stage =
  | 'imported'
  | 'enriching'
  | 'needs_review'
  | 'ready_to_send'
  | 'sent'
  | 'claimed'
  | 'rejected'
  | 'error'

export interface StageInput {
  claimed: boolean
  hasEnrichment: boolean
  status?: string | null
  confidence?: number | null
  reviewAction?: string | null
  sentAt?: string | null
}

export function deriveStage(i: StageInput): Stage {
  if (i.claimed) return 'claimed'
  if (!i.hasEnrichment || i.status == null || i.status === 'pending') return 'imported'
  if (i.status === 'generating') return 'enriching'
  if (i.status === 'error') return 'error'
  // status === 'ready'
  if (i.reviewAction === 'rejected') return 'rejected'
  if (i.sentAt) return 'sent'
  if (i.reviewAction === 'approved' || (i.confidence ?? 0) >= HIGH_CONFIDENCE) return 'ready_to_send'
  return 'needs_review'
}

export interface BoardColumn {
  key: string
  label: string
  /** Stages that render in this column (error folds into Needs Review — it needs a human). */
  stages: Stage[]
}

/** Left-to-right board columns. 'rejected' is intentionally not shown (counted separately). */
export const BOARD_COLUMNS: BoardColumn[] = [
  { key: 'imported', label: 'Imported', stages: ['imported'] },
  { key: 'enriching', label: 'Enriching', stages: ['enriching'] },
  { key: 'needs_review', label: 'Needs Review', stages: ['needs_review', 'error'] },
  { key: 'ready_to_send', label: 'Ready to Send', stages: ['ready_to_send'] },
  { key: 'sent', label: 'Sent', stages: ['sent'] },
  { key: 'claimed', label: 'Claimed', stages: ['claimed'] },
]

export function columnForStage(stage: Stage): string {
  return BOARD_COLUMNS.find((c) => c.stages.includes(stage))?.key ?? 'imported'
}
