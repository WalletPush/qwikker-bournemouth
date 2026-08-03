import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveTerritoryAvailability } from '@/lib/partners/availability'
import { computeFoundingCounts, FOUNDING_TOTAL } from '@/lib/partners/founding'
import { isPublicReservedHold } from '@/lib/partners/claim-status'
import { resolveCityCoords } from '@/lib/partners/city-coords'

/** Always fresh — markets/claims change without a deploy */
export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface PublicCityStatus {
  city_name: string
  city_slug: string
  country?: string
  status: 'owned' | 'reserved' | 'available'
  lat?: number | null
  lng?: number | null
  thumbnail_url?: string | null
  tier?: 'hub' | 'partner'
  /** ISO time when reserved/held — for recently reserved strip only */
  reserved_at?: string | null
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    const [marketsResult, franchisesResult, claimsResult] = await Promise.all([
      supabase
        .from('partner_markets')
        .select(
          'city_name, city_slug, country, lat, lng, status, tier, thumbnail_url, blocked, manual_review_only, sort_order, updated_at, created_at'
        )
        .order('sort_order', { ascending: true }),
      supabase
        .from('franchise_crm_configs')
        .select('city, display_name, status, country_name, country_code, lat, lng')
        .in('status', ['active', 'coming_soon', 'pending_setup']),
      supabase
        .from('partner_claims')
        .select(
          'city_name, city_slug, country, status, expires_at, claimed_at, updated_at, lat, lng, is_founding_eligible, founding_slot_number'
        ),
    ])

    // Table may not exist yet pre-migration — fail soft
    const markets = marketsResult.error ? [] : marketsResult.data || []
    const franchises = franchisesResult.data || []
    const claims = claimsResult.data || []

    const bySlug = new Map<string, PublicCityStatus>()

    // Franchise slugs are the only source of truth for public "Live"
    const liveFranchiseSlugs = new Set(franchises.map((f) => f.city))

    for (const m of markets) {
      if (m.blocked) continue
      let status = m.status as 'owned' | 'reserved' | 'available'

      // Real franchise already covers this slug as Live — skip market row
      if (liveFranchiseSlugs.has(m.city_slug)) {
        continue
      }

      // HQ hubs + catalogue "owned" without a franchise are NOT Live.
      // Show them as Reserved so search ("taken") matches map/list.
      if (status === 'owned') {
        status = 'reserved'
      }

      bySlug.set(m.city_slug, {
        city_name: m.city_name,
        city_slug: m.city_slug,
        country: m.country || undefined,
        status,
        lat: m.lat != null ? Number(m.lat) : null,
        lng: m.lng != null ? Number(m.lng) : null,
        thumbnail_url: m.thumbnail_url,
        tier: m.tier === 'hub' ? 'hub' : 'partner',
        reserved_at:
          status === 'reserved' ? m.updated_at || m.created_at || null : null,
      })
    }

    for (const f of franchises) {
      const existing = bySlug.get(f.city)
      bySlug.set(f.city, {
        city_name: f.display_name || existing?.city_name || f.city,
        city_slug: f.city,
        country: f.country_name || existing?.country,
        status: 'owned',
        lat: f.lat != null ? Number(f.lat) : existing?.lat ?? null,
        lng: f.lng != null ? Number(f.lng) : existing?.lng ?? null,
        thumbnail_url: existing?.thumbnail_url ?? null,
        tier: existing?.tier || 'partner',
      })
    }

    for (const c of claims) {
      if (!isPublicReservedHold(c.status, c.expires_at)) continue
      const existing = bySlug.get(c.city_slug)
      // Don't downgrade owned hubs
      if (existing?.status === 'owned') continue
      bySlug.set(c.city_slug, {
        city_name: c.city_name || existing?.city_name || c.city_slug,
        city_slug: c.city_slug,
        country: c.country || existing?.country,
        status: 'reserved',
        lat: c.lat != null ? Number(c.lat) : existing?.lat ?? null,
        lng: c.lng != null ? Number(c.lng) : existing?.lng ?? null,
        thumbnail_url: existing?.thumbnail_url ?? null,
        tier: existing?.tier || 'partner',
        reserved_at: c.updated_at || c.claimed_at || null,
      })
    }

    const cities = Array.from(bySlug.values())
      .map((c) => {
        const coords = resolveCityCoords(c.city_slug, c.lat, c.lng)
        return coords ? { ...c, lat: coords.lat, lng: coords.lng } : c
      })
      .sort((a, b) => a.city_name.localeCompare(b.city_name))

    const recentlyReserved = cities
      .filter((c) => c.status === 'reserved')
      .sort((a, b) => {
        const ta = a.reserved_at ? new Date(a.reserved_at).getTime() : 0
        const tb = b.reserved_at ? new Date(b.reserved_at).getTime() : 0
        return tb - ta
      })
      .slice(0, 12)
      .map(({ reserved_at: _r, ...rest }) => rest)

    const liveOwnedSlugs = cities
      .filter((c) => c.status === 'owned')
      .map((c) => c.city_slug)
    const founding = computeFoundingCounts(claims, liveOwnedSlugs)

    // Public proof metrics — counts only, no PII. Fail soft if a column/table differs.
    // Business count is platform-wide (every franchise/location) via service role.
    let businessProfiles: number | null = null
    try {
      const profilesCountResult = await supabase
        .from('business_profiles')
        .select('id', { count: 'exact', head: true })
      if (!profilesCountResult.error && typeof profilesCountResult.count === 'number') {
        businessProfiles = profilesCountResult.count
      }
    } catch {
      // territory proof still works from cities[]
    }

    // Countries with at least one live franchise (not map-wide / reserved)
    const liveCountries = new Set(
      franchises
        .map((f) => (f.country_code || f.country_name || '').trim().toUpperCase())
        .filter((c): c is string => Boolean(c))
    )
    const live = cities.filter((c) => c.status === 'owned').length
    const reserved = cities.filter((c) => c.status === 'reserved').length

    return NextResponse.json(
      {
        cities,
        recently_reserved: recentlyReserved,
        founding: {
          secured: founding.securedCount,
          converted: founding.convertedFoundingCount,
          live: founding.liveOwnedCount,
          total: FOUNDING_TOTAL,
          open: founding.foundingOpen,
        },
        proof: {
          live_territories: live,
          reserved_territories: reserved,
          countries: liveCountries.size,
          founding_secured: founding.securedCount,
          founding_total: FOUNDING_TOTAL,
          business_profiles: businessProfiles,
          imported_profiles: null,
          wallet_passes: null,
        },
        map: {
          // Public token for Mapbox — same env as Atlas/import
          token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || null,
          style:
            process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL || 'mapbox://styles/mapbox/dark-v11',
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Partners cities API error:', error)
    return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 })
  }
}

/** Server helper for claim route availability checks */
export async function checkCityAvailability(citySlug: string) {
  const supabase = createServiceRoleClient()
  const [franchisesResult, holdsResult, marketResult] = await Promise.all([
    supabase
      .from('franchise_crm_configs')
      .select('city, status')
      .eq('city', citySlug)
      .maybeSingle(),
    supabase
      .from('partner_claims')
      .select('city_slug, status, expires_at')
      .eq('city_slug', citySlug),
    supabase
      .from('partner_markets')
      .select('city_slug, status, tier, blocked, manual_review_only')
      .eq('city_slug', citySlug)
      .maybeSingle(),
  ])

  const franchises = franchisesResult.data ? [franchisesResult.data] : []
  const holds = holdsResult.data || []
  const market = marketResult.data

  return resolveTerritoryAvailability({
    citySlug,
    franchises: franchises.map((f) => ({
      ...f,
      is_hub: market?.tier === 'hub',
    })),
    holds,
    flags: market
      ? {
          is_hub: market.tier === 'hub',
          market_status: market.status as 'owned' | 'reserved' | 'available',
          blocked: market.blocked,
          manual_review_only: market.manual_review_only,
        }
      : undefined,
  })
}
