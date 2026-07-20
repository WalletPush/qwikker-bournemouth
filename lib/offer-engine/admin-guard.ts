import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { getCityFromHostname } from '@/lib/utils/city-detection'

export interface AdminContext {
  city: string
  adminId: string
  adminEmail: string | null
}

type GuardResult = { ctx: AdminContext } | { error: NextResponse }

/**
 * Shared admin gate for Acquisition Engine routes.
 * Verifies the qwikker_admin_session cookie and that the admin owns the
 * hostname-derived city. Returns either a ready-to-use context or a NextResponse
 * error to return directly.
 */
export async function requireCityAdmin(request: NextRequest): Promise<GuardResult> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('qwikker_admin_session')
  if (!cookie?.value) {
    return { error: NextResponse.json({ error: 'Admin authentication required' }, { status: 401 }) }
  }

  let session: { adminId?: string }
  try {
    session = JSON.parse(cookie.value)
  } catch {
    return { error: NextResponse.json({ error: 'Invalid admin session' }, { status: 401 }) }
  }
  if (!session.adminId) {
    return { error: NextResponse.json({ error: 'Invalid admin session' }, { status: 401 }) }
  }

  const city = await getCityFromHostname(request.headers.get('host') || '')
  const admin = await getAdminById(session.adminId)
  const hasAccess = await isAdminForCity(session.adminId, city)
  if (!admin || !hasAccess) {
    return { error: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) }
  }

  return { ctx: { city, adminId: admin.id, adminEmail: admin.email } }
}
