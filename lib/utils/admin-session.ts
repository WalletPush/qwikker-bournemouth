import { cookies } from 'next/headers'
import { getAdminById, type AdminUser } from './admin-auth'
import { getCityFromRequest } from './city-detection'
import { headers } from 'next/headers'

/**
 * Get current admin from session cookie (for API routes)
 * Returns admin user with city, or null if not authenticated.
 */
export async function getAdminFromSession(): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('qwikker_admin_session')
    if (!sessionCookie?.value) return null

    const session = JSON.parse(sessionCookie.value)
    if (!session?.adminId) return null

    const admin = await getAdminById(session.adminId)
    if (!admin || !admin.is_active) return null

    return admin
  } catch {
    return null
  }
}
