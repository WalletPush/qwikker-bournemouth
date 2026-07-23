/**
 * Idempotently register the launch-pack QR codes for a business in the REAL QR
 * system (the `qr_codes` table shown in the admin QR management tab).
 *
 * Each launch material (window sticker, table tent, counter display, review
 * card) gets one named, business-linked, dynamic QR code. The printed/preview
 * QR encodes the tracked scan URL (`/api/qr/scan/<code>`), so:
 *   - scans show up in QR analytics,
 *   - the destination can be re-pointed AFTER printing (business_dynamic),
 *   - the wallet-pass gate is applied automatically by the scan route.
 *
 * Idempotent: we look codes up by (business_id + name) and reuse them, so
 * repeatedly opening the demo never creates duplicate rows. Best-effort — any
 * failure returns null and callers fall back to direct deep links.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getFranchisePublicUrl } from '@/lib/utils/franchise-url'

export interface LaunchQrUrls {
  window: string
  table: string
  counter: string
  review: string
}

type AssetKey = keyof LaunchQrUrls

const ASSETS: { key: AssetKey; label: string; category: string; target: 'listing' | 'review' }[] = [
  { key: 'window', label: 'Window Sticker', category: 'window_stickers', target: 'listing' },
  { key: 'table', label: 'Table Tent', category: 'table_tents', target: 'listing' },
  { key: 'counter', label: 'Counter Display', category: 'counter_cards', target: 'listing' },
  { key: 'review', label: 'Review Card', category: 'review_cards', target: 'review' },
]

/**
 * Mirror the slug the discover/business-detail routes derive at runtime, so the
 * QR codes + demo deep links we build point at the SAME public listing URL the
 * live app resolves. Keep in sync with getDemoData's toBusinessSlug.
 */
function toBusinessSlug(name: string, fallbackId: string): string {
  return (
    (name || '')
      .toLowerCase()
      .replace(/[''']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || fallbackId
  )
}

export interface LaunchLinks {
  slug: string
  publicBase: string
  /** Live public listing (wallet-gated) — what the window/table/counter QR encode. */
  listingUrl: string
  /** "Install the wallet pass, then land on your listing" deep link. */
  walletTryUrl: string
  /** Listing's "What People Think" tab (Qwikker Vibes) — the review-card target. */
  reviewUrl: string
}

/**
 * Single source of truth for the recipient-facing launch-pack / demo deep links
 * for a business, so the enrichment step (which registers the QR codes) and the
 * demo page (which reads them back) always agree on the target URLs.
 */
export function buildLaunchLinks(biz: {
  id: string
  business_name: string | null
  city: string | null
}): LaunchLinks {
  const slug = toBusinessSlug(biz.business_name || '', biz.id)
  const publicBase = getFranchisePublicUrl(biz.city || '')
  return {
    slug,
    publicBase,
    listingUrl: `${publicBase}/user/business/${slug}?highlight=true`,
    walletTryUrl: `${publicBase}/join?returnTo=${encodeURIComponent(`/user/business/${slug}`)}`,
    reviewUrl: `${publicBase}/user/business/${slug}?tab=reviews`,
  }
}

function genCode(city: string, category: string): string {
  const c = (city || 'xxx').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'XXX'
  const cat = (category || 'gen').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'GEN'
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `QWK-${c}-DYN-${cat}-${rand}`
}

/**
 * READ-ONLY: return the tracked scan URLs for a business's already-registered
 * launch-pack QR codes (created at enrichment time). Never creates rows — the
 * demo page uses this so opening a demo doesn't spawn duplicate codes. Returns
 * null when the business has no launch codes yet (caller falls back to direct
 * deep links).
 */
export async function getLaunchPackQrCodes(
  supabase: SupabaseClient,
  opts: { businessId: string; businessName: string; publicBase: string }
): Promise<LaunchQrUrls | null> {
  const { businessId, businessName, publicBase } = opts
  if (!businessId) return null

  try {
    const { data: existing } = await supabase
      .from('qr_codes')
      .select('qr_code, name')
      .eq('business_id', businessId)

    if (!existing || existing.length === 0) return null

    const byName = new Map<string, string>(
      existing.map((r: { name: string; qr_code: string }) => [r.name, r.qr_code])
    )

    const scanUrl = (code: string) => `${publicBase}/api/qr/scan/${code}`
    const result = {} as Partial<LaunchQrUrls>
    let found = 0
    for (const asset of ASSETS) {
      const code = byName.get(`${businessName} — ${asset.label}`)
      if (code) {
        result[asset.key] = scanUrl(code)
        found++
      }
    }

    // Require the full set so the launch pack renders consistently; otherwise the
    // caller falls back to direct deep links for all materials.
    return found === ASSETS.length ? (result as LaunchQrUrls) : null
  } catch {
    return null
  }
}

export async function ensureLaunchPackQrCodes(
  supabase: SupabaseClient,
  opts: {
    businessId: string
    businessName: string
    city: string
    publicBase: string
    listingUrl: string
    reviewUrl: string
  }
): Promise<LaunchQrUrls | null> {
  const { businessId, businessName, city, publicBase, listingUrl, reviewUrl } = opts
  if (!businessId) return null

  try {
    // Existing launch-pack codes for this business (idempotency by name).
    const { data: existing } = await supabase
      .from('qr_codes')
      .select('qr_code, name')
      .eq('business_id', businessId)

    const byName = new Map<string, string>(
      (existing || []).map((r: { name: string; qr_code: string }) => [r.name, r.qr_code])
    )

    const scanUrl = (code: string) => `${publicBase}/api/qr/scan/${code}`
    const result = {} as LaunchQrUrls

    for (const asset of ASSETS) {
      const name = `${businessName} — ${asset.label}`
      let code = byName.get(name)

      if (!code) {
        code = genCode(city, asset.category)
        const target = asset.target === 'review' ? reviewUrl : listingUrl
        const { error } = await supabase.from('qr_codes').insert({
          qr_code: code,
          qr_type: 'business_dynamic',
          name,
          description: `Launch pack ${asset.label} for ${businessName}`,
          category: asset.category,
          current_target_url: target,
          default_target_url: target,
          business_id: businessId,
          city: (city || '').toLowerCase(),
          status: 'active',
        })
        if (error) {
          // Non-fatal: fall back to the direct deep link for this asset.
          result[asset.key] = asset.target === 'review' ? reviewUrl : listingUrl
          continue
        }
      }

      result[asset.key] = scanUrl(code)
    }

    return result
  } catch {
    return null
  }
}
