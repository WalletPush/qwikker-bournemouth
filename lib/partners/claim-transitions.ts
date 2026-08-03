import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ClaimStatus } from '@/lib/partners/claim-status'
import { canTransitionClaimStatus, normalizeClaimStatus } from '@/lib/partners/claim-status'

export async function writeClaimAudit(opts: {
  claimId: string
  actor?: string
  fromStatus: string | null
  toStatus: string
  note?: string
  meta?: Record<string, unknown>
}) {
  const supabase = createServiceRoleClient()
  await supabase.from('partner_claim_audit').insert({
    claim_id: opts.claimId,
    actor: opts.actor || 'system',
    from_status: opts.fromStatus,
    to_status: opts.toStatus,
    note: opts.note || null,
    meta: opts.meta || {},
  })
}

export async function transitionClaimStatus(opts: {
  claimId: string
  toStatus: ClaimStatus
  actor: string
  patch?: Record<string, unknown>
  note?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceRoleClient()
  const { data: claim, error } = await supabase
    .from('partner_claims')
    .select('*')
    .eq('id', opts.claimId)
    .single()

  if (error || !claim) return { ok: false, error: 'Claim not found' }

  const from = normalizeClaimStatus(claim.status)
  if (!from) return { ok: false, error: 'Invalid current status' }
  if (!canTransitionClaimStatus(from, opts.toStatus)) {
    return { ok: false, error: `Cannot transition from ${from} to ${opts.toStatus}` }
  }

  const { error: updateError } = await supabase
    .from('partner_claims')
    .update({
      status: opts.toStatus,
      updated_at: new Date().toISOString(),
      ...(opts.patch || {}),
    })
    .eq('id', opts.claimId)
    .eq('status', claim.status) // optimistic concurrency

  if (updateError) {
    console.error('transitionClaimStatus update failed:', updateError)
    return { ok: false, error: updateError.message || 'Update failed' }
  }

  await writeClaimAudit({
    claimId: opts.claimId,
    actor: opts.actor,
    fromStatus: claim.status,
    toStatus: opts.toStatus,
    note: opts.note,
  })

  return { ok: true }
}
