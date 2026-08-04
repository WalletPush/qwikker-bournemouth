/**
 * First-party tracked links for claim-invite CTAs (/r/{code}).
 * Mirrors the QR scan pattern: create codes at send time, log clicks on redirect.
 */

import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

type DbClient = SupabaseClient

export type OutreachLinkType = 'claim' | 'demo'

function generateOutreachCode(): string {
  // 10 bytes → ~16 url-safe chars; unique index retries if collision
  return randomBytes(10).toString('base64url')
}

export interface CreatedOutreachLink {
  code: string
  trackedUrl: string
  linkType: OutreachLinkType
  targetUrl: string
}

/**
 * Insert claim + demo tracked links for a business and return public /r/ URLs.
 */
export async function createClaimInviteTrackedLinks(
  supabaseAdmin: DbClient,
  opts: {
    businessId: string
    city: string
    publicBaseUrl: string
    claimTargetUrl: string
    demoTargetUrl: string
    createdBy?: string | null
    resendMessageId?: string | null
  }
): Promise<{ claim: CreatedOutreachLink; demo: CreatedOutreachLink }> {
  const base = opts.publicBaseUrl.replace(/\/$/, '')
  const city = opts.city.toLowerCase()

  const rows: Array<{
    code: string
    business_id: string
    city: string
    link_type: OutreachLinkType
    target_url: string
    created_by: string | null
    resend_message_id: string | null
  }> = [
    {
      code: generateOutreachCode(),
      business_id: opts.businessId,
      city,
      link_type: 'claim',
      target_url: opts.claimTargetUrl,
      created_by: opts.createdBy ?? null,
      resend_message_id: opts.resendMessageId ?? null,
    },
    {
      code: generateOutreachCode(),
      business_id: opts.businessId,
      city,
      link_type: 'demo',
      target_url: opts.demoTargetUrl,
      created_by: opts.createdBy ?? null,
      resend_message_id: opts.resendMessageId ?? null,
    },
  ]

  // Rare collision retry
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabaseAdmin.from('outreach_tracked_links').insert(rows)
    if (!error) {
      return {
        claim: {
          code: rows[0].code,
          trackedUrl: `${base}/r/${rows[0].code}`,
          linkType: 'claim',
          targetUrl: rows[0].target_url,
        },
        demo: {
          code: rows[1].code,
          trackedUrl: `${base}/r/${rows[1].code}`,
          linkType: 'demo',
          targetUrl: rows[1].target_url,
        },
      }
    }
    if (!error.message?.toLowerCase().includes('duplicate') && error.code !== '23505') {
      throw error
    }
    rows[0].code = generateOutreachCode()
    rows[1].code = generateOutreachCode()
  }

  throw new Error('Could not allocate unique outreach link codes')
}

/**
 * Record a click and bump link + enrichment rollups. Best-effort; never throws to caller
 * after redirect target is known — callers should still redirect even if logging fails.
 */
export async function recordOutreachLinkClick(
  supabaseAdmin: DbClient,
  link: {
    id: string
    business_id: string
    city: string
    link_type: OutreachLinkType
    click_count: number | null
  },
  meta: { userAgent?: string | null; ipAddress?: string | null; deviceType?: string | null }
): Promise<void> {
  const nowIso = new Date().toISOString()
  const nextCount = (link.click_count || 0) + 1

  await supabaseAdmin.from('outreach_link_clicks').insert({
    link_id: link.id,
    clicked_at: nowIso,
    city: link.city,
    user_agent: meta.userAgent ?? null,
    ip_address: meta.ipAddress ?? null,
    device_type: meta.deviceType ?? null,
  })

  await supabaseAdmin
    .from('outreach_tracked_links')
    .update({ click_count: nextCount, last_clicked_at: nowIso })
    .eq('id', link.id)

  // Aggregate clicks across all sends of this link type for the business
  const { data: typeLinks } = await supabaseAdmin
    .from('outreach_tracked_links')
    .select('click_count')
    .eq('business_id', link.business_id)
    .eq('link_type', link.link_type)

  const total = (typeLinks || []).reduce((sum, r) => sum + (r.click_count || 0), 0)

  const enrichmentUpdate =
    link.link_type === 'claim'
      ? {
          claim_link_clicked_at: nowIso,
          claim_link_click_count: total,
          updated_at: nowIso,
        }
      : {
          demo_link_clicked_at: nowIso,
          demo_link_click_count: total,
          updated_at: nowIso,
        }

  await supabaseAdmin
    .from('business_enrichments')
    .update(enrichmentUpdate)
    .eq('business_id', link.business_id)
}
