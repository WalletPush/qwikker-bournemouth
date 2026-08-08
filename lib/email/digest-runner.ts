/**
 * Weekly ROI digest automation — OFF by default per city (email_automations.enabled).
 * Safe: city-scoped, suppressions, idempotent per business/week.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { sendFranchiseEmail } from '@/lib/email/send-franchise-email'
import { renderSuiteTemplate } from '@/lib/email/suite-templates'
import { isEmailSuppressed } from '@/lib/email/suppressions'
import { isCityEmailConfigured } from '@/lib/email/suite-config'

function weekKey(d = new Date()): string {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = start.getUTCDay() || 7
  start.setUTCDate(start.getUTCDate() - day + 1)
  return start.toISOString().slice(0, 10)
}

async function digestStats(businessId: string, days = 7) {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [visits, claims] = await Promise.all([
    supabase
      .from('user_business_visits')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('visit_date', since),
    supabase
      .from('user_offer_claims')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('claimed_at', since),
  ])

  const { count: saveCount } = await supabase
    .from('user_saved_items')
    .select('id', { count: 'exact', head: true })
    .eq('item_type', 'business')
    .eq('item_id', businessId)
    .gte('saved_at', since)

  return {
    profileViews: visits.count || 0,
    offerClaims: claims.count || 0,
    saves: saveCount || 0,
    periodDays: days,
  }
}

export async function runWeeklyDigestForCity(city: string): Promise<{
  city: string
  sent: number
  skipped: number
  errors: string[]
}> {
  const errors: string[] = []
  let sent = 0
  let skipped = 0
  const cityKey = city.toLowerCase()

  const configured = await isCityEmailConfigured(cityKey)
  if (!configured.configured) {
    return { city: cityKey, sent: 0, skipped: 0, errors: ['Email not configured'] }
  }

  const supabase = createAdminClient()
  const { data: automation } = await supabase
    .from('email_automations')
    .select('*')
    .eq('city', cityKey)
    .eq('automation_key', 'weekly_digest')
    .maybeSingle()

  if (!automation?.enabled) {
    return { city: cityKey, sent: 0, skipped: 0, errors: [] }
  }

  const wk = weekKey()
  const { data: businesses } = await supabase
    .from('business_profiles')
    .select('id, business_name, email, first_name, status')
    .eq('city', cityKey)
    .eq('status', 'approved')
    .not('email', 'is', null)
    .limit(200)

  for (const biz of businesses || []) {
    const email = (biz.email || '').trim().toLowerCase()
    if (!email) {
      skipped++
      continue
    }

    const suppressed = await isEmailSuppressed({
      city: cityKey,
      email,
      scope: 'digests',
    })
    if (suppressed) {
      skipped++
      continue
    }

    // Idempotency: already sent this week for this business
    const weekStart = `${wk}T00:00:00.000Z`
    const { data: existing } = await supabase
      .from('email_sends')
      .select('id')
      .eq('city', cityKey)
      .eq('business_id', biz.id)
      .eq('template_key', 'weekly_digest')
      .gte('created_at', weekStart)
      .limit(1)

    if (existing && existing.length > 0) {
      skipped++
      continue
    }

    try {
      const stats = await digestStats(biz.id, 7)
      // Skip empty digests unless config forces
      const forceEmpty = Boolean((automation.config as { send_empty?: boolean })?.send_empty)
      if (!forceEmpty && stats.profileViews === 0 && stats.offerClaims === 0 && stats.saves === 0) {
        skipped++
        continue
      }

      const template = renderSuiteTemplate('weekly_digest', {
        city: cityKey,
        businessName: biz.business_name,
        firstName: biz.first_name,
        email,
        businessId: biz.id,
        stats,
      })

      const result = await sendFranchiseEmail({
        city: cityKey,
        to: email,
        template,
        tags: [
          { name: 'type', value: 'weekly_digest' },
          { name: 'automation', value: 'weekly_digest' },
        ],
        logMeta: {
          businessId: biz.id,
          templateKey: 'weekly_digest',
          category: 'digest',
          sentBy: 'automation:weekly_digest',
        },
      })

      if (result.success) sent++
      else {
        skipped++
        if (result.error) errors.push(`${biz.id}: ${result.error}`)
      }
    } catch (e) {
      skipped++
      errors.push(`${biz.id}: ${e instanceof Error ? e.message : 'error'}`)
    }
  }

  await supabase
    .from('email_automations')
    .update({ last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('city', cityKey)
    .eq('automation_key', 'weekly_digest')

  return { city: cityKey, sent, skipped, errors: errors.slice(0, 20) }
}

export async function runWeeklyDigestAllCities(): Promise<
  Array<{ city: string; sent: number; skipped: number; errors: string[] }>
> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('email_automations')
    .select('city')
    .eq('automation_key', 'weekly_digest')
    .eq('enabled', true)

  const cities = [...new Set((data || []).map((r: { city: string }) => r.city))]
  const results = []
  for (const city of cities) {
    results.push(await runWeeklyDigestForCity(city))
  }
  return results
}
