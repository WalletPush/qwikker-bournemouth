import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { coveredCitiesFor } from '@/lib/offer-engine/generate-offers'
import { generateAcquisitionDraft } from '@/lib/listing-engine/generate-acquisition-draft'

/**
 * Admin-only Acquisition Engine — Phase 0.
 * Returns a combined listing draft + 3 offers for one business (no DB writes).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const businessId: string | undefined = body?.businessId
    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
    }

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

    const result = await generateAcquisitionDraft(businessId, city, coveredCitiesFor(city))
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('acquisition-engine error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
