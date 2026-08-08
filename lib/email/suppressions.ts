import { createAdminClient } from '@/lib/supabase/admin'

export type SuppressionScope = 'all_marketing' | 'digests' | 'campaigns'

export async function isEmailSuppressed(params: {
  city: string
  email: string
  scope?: SuppressionScope
}): Promise<boolean> {
  const supabase = createAdminClient()
  const email = params.email.trim().toLowerCase()
  const city = params.city.toLowerCase()
  const scopes: SuppressionScope[] =
    params.scope === 'all_marketing' || !params.scope
      ? ['all_marketing']
      : ['all_marketing', params.scope]

  const { data } = await supabase
    .from('email_suppressions')
    .select('id')
    .eq('city', city)
    .eq('email', email)
    .in('scope', scopes)
    .limit(1)

  return (data?.length || 0) > 0
}

export async function suppressEmail(params: {
  city: string
  email: string
  businessId?: string | null
  scope?: SuppressionScope
  reason?: string
  sourceSendId?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('email_suppressions').upsert(
    {
      city: params.city.toLowerCase(),
      email: params.email.trim().toLowerCase(),
      business_id: params.businessId || null,
      scope: params.scope || 'all_marketing',
      reason: params.reason || 'unsubscribe',
      source_send_id: params.sourceSendId || null,
      unsubscribed_at: new Date().toISOString(),
    },
    { onConflict: 'city,email,scope' }
  )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function filterSuppressedRecipients(params: {
  city: string
  emails: string[]
  scope?: SuppressionScope
}): Promise<{ allowed: string[]; skipped: string[] }> {
  const allowed: string[] = []
  const skipped: string[] = []
  for (const email of params.emails) {
    const blocked = await isEmailSuppressed({
      city: params.city,
      email,
      scope: params.scope,
    })
    if (blocked) skipped.push(email)
    else allowed.push(email)
  }
  return { allowed, skipped }
}
