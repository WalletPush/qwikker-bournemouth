import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 300 // 5 mins (Next.js Data Cache)

/**
 * Franchise public info shape (matches client-city-detection.ts)
 */
type FranchisePublic = {
  subdomain: string
  display_name: string
  status: 'active' | 'coming_soon'
}

/**
 * Type-safe response helper
 * Prevents accidental payload shape drift (e.g., returning { cities: [] })
 */
function jsonFranchises(franchises: FranchisePublic[], headers?: HeadersInit) {
  return NextResponse.json({ franchises }, headers ? { headers } : undefined)
}

/**
 * Public endpoint: Returns list of valid franchise cities/subdomains
 * Used by client-side city detection to validate subdomains without hardcoding
 * 
 * Data source: franchise_public_info view (safe for public access)
 */
export async function GET() {
  // Use anon client (public view, no secrets)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials for franchise cities endpoint')
    return jsonFranchises([])
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { data, error } = await supabase
    .from('franchise_public_info')
    .select('city, subdomain, display_name, status')

  if (error) {
    console.error('Error fetching franchise cities:', error)
    return jsonFranchises([])
  }

  // IMPORTANT: Return subdomains (what browser validates), not internal city names
  // Include both active (full access) and coming_soon (landing page access)
  const franchises = (data ?? [])
    .filter(r => r.status === 'active' || r.status === 'coming_soon')
    .map(r => {
      // Data hygiene: trim, lowercase, remove empties
      const subdomain = (r.subdomain || r.city || '').trim().toLowerCase()
      const display_name = (r.display_name || '').trim()
      
      return {
        subdomain,
        display_name: display_name || subdomain, // Fallback to subdomain if no display_name
        status: r.status as 'active' | 'coming_soon'
      }
    })
    .filter(f => f.subdomain.length > 0) // Remove empty subdomains

  // Dedupe by subdomain (in case of DB duplicates or both city+subdomain pointing to same place)
  const uniqueFranchises = Array.from(
    new Map(franchises.map(f => [f.subdomain, f])).values()
  )

  return jsonFranchises(
    uniqueFranchises,
    {
      // Let browser/CDN cache naturally (5min fresh, 1hr stale-while-revalidate)
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    }
  )
}
