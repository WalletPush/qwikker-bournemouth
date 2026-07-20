import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { createAdminClient } from '@/lib/supabase/admin'
import { coveredCitiesFor } from '@/lib/offer-engine/generate-offers'

/**
 * Admin-only business search for the Offer Lab spike.
 * Scoped to the admin's own franchise cities.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')
    if (!adminSessionCookie?.value) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    let adminSession: { adminId?: string }
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json({ error: 'Invalid admin session' }, { status: 401 })
    }
    if (!adminSession.adminId) {
      return NextResponse.json({ error: 'Invalid admin session' }, { status: 401 })
    }

    const hostname = request.headers.get('host') || ''
    const city = await getCityFromHostname(hostname)
    const admin = await getAdminById(adminSession.adminId)
    const hasAccess = await isAdminForCity(adminSession.adminId, city)
    if (!admin || !hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const q = (new URL(request.url).searchParams.get('q') || '').trim()
    const covered = coveredCitiesFor(city)

    const supabase = createAdminClient()
    let query = supabase
      .from('business_profiles')
      .select(
        'id, business_name, business_town, city, owner_user_id, rating, review_count, google_place_id, system_category, business_type'
      )
      .in('city', covered)
      .order('business_name', { ascending: true })
      .limit(20)

    if (q) {
      query = query.ilike('business_name', `%${q}%`)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const businesses = (data || []).map((b) => ({
      id: b.id,
      name: b.business_name,
      town: b.business_town,
      claimed: !!b.owner_user_id,
      rating: b.rating,
      reviewCount: b.review_count,
      hasPlaceId: !!b.google_place_id,
      category: b.system_category || b.business_type || null,
    }))

    return NextResponse.json({ businesses })
  } catch (error) {
    console.error('offer-engine businesses search error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
