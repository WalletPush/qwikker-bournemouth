/**
 * Resolve business audiences for Email Suite campaigns / bulk send.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export type AudiencePreset =
  | 'business_ids'
  | 'live'
  | 'unclaimed_with_email'
  | 'incomplete'
  | 'expired_trial'
  | 'free_tier'

export interface AudienceBusiness {
  id: string
  business_name: string
  email: string
  first_name: string | null
  status: string | null
}

export async function resolveAudience(params: {
  city: string
  preset: AudiencePreset
  businessIds?: string[]
  limit?: number
}): Promise<AudienceBusiness[]> {
  const supabase = createAdminClient()
  const city = params.city.toLowerCase()
  const limit = Math.min(params.limit || 200, 200)

  if (params.preset === 'business_ids') {
    const ids = params.businessIds || []
    if (ids.length === 0) return []
    const { data } = await supabase
      .from('business_profiles')
      .select('id, business_name, email, first_name, status')
      .eq('city', city)
      .in('id', ids)
      .not('email', 'is', null)
    return ((data || []) as AudienceBusiness[]).filter((b) => Boolean(b.email?.trim()))
  }

  let query = supabase
    .from('business_profiles')
    .select('id, business_name, email, first_name, status')
    .eq('city', city)
    .not('email', 'is', null)
    .limit(limit)

  switch (params.preset) {
    case 'live':
      query = query.eq('status', 'approved')
      break
    case 'unclaimed_with_email':
      query = query.eq('status', 'unclaimed')
      break
    case 'incomplete':
      query = query.in('status', ['incomplete', 'pending'])
      break
    case 'expired_trial':
      // Best-effort: businesses marked expired / trial_expired if present
      query = query.in('status', ['expired', 'trial_expired', 'approved'])
      break
    case 'free_tier':
      query = query.eq('status', 'approved')
      break
    default:
      break
  }

  const { data } = await query
  let rows = ((data || []) as AudienceBusiness[]).filter((b) => Boolean(b.email?.trim()))

  if (params.preset === 'expired_trial' || params.preset === 'free_tier') {
    const ids = rows.map((r) => r.id)
    if (ids.length === 0) return []
    const { data: subs } = await supabase
      .from('business_subscriptions')
      .select('business_id, status, plan_type, trial_ends_at')
      .in('business_id', ids)

    const byBiz = new Map((subs || []).map((s: { business_id: string }) => [s.business_id, s]))
    rows = rows.filter((b) => {
      const sub = byBiz.get(b.id) as
        | { status?: string; plan_type?: string; trial_ends_at?: string | null }
        | undefined
      if (params.preset === 'expired_trial') {
        if (!sub) return b.status === 'expired' || b.status === 'trial_expired'
        if (sub.status === 'expired' || sub.status === 'trial_expired') return true
        if (sub.trial_ends_at && new Date(sub.trial_ends_at) < new Date()) return true
        return false
      }
      // free_tier
      if (!sub) return true
      const plan = (sub.plan_type || '').toLowerCase()
      return plan === 'free' || plan === '' || sub.status === 'free'
    })
  }

  return rows.slice(0, limit)
}
