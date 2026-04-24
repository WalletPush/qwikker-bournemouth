import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export interface CityStatus {
  city_name: string
  city_slug: string
  country?: string
  status: 'live' | 'reserved' | 'claimed' | 'available'
  claimed_by?: string
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    const [franchisesResult, claimsResult] = await Promise.all([
      supabase
        .from('franchise_crm_configs')
        .select('city, display_name, subdomain, status, country_name')
        .in('status', ['active', 'coming_soon', 'pending_setup']),
      supabase
        .from('partner_claims')
        .select('city_name, city_slug, country, status, full_name, expires_at')
        .eq('status', 'claimed')
    ])

    const cities: CityStatus[] = []

    for (const f of franchisesResult.data || []) {
      cities.push({
        city_name: f.display_name || f.city,
        city_slug: f.city,
        country: f.country_name || undefined,
        status: f.status === 'active' ? 'live' : 'reserved',
      })
    }

    for (const c of claimsResult.data || []) {
      const isExpired = new Date(c.expires_at) < new Date()
      if (isExpired) continue

      const alreadyListed = cities.some(city => city.city_slug === c.city_slug)
      if (alreadyListed) continue

      cities.push({
        city_name: c.city_name,
        city_slug: c.city_slug,
        country: c.country || undefined,
        status: 'claimed',
        claimed_by: c.full_name?.split(' ')[0],
      })
    }

    cities.sort((a, b) => a.city_name.localeCompare(b.city_name))

    return NextResponse.json({ cities })
  } catch (error) {
    console.error('Partners cities API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    )
  }
}
