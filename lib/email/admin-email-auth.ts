import { NextRequest } from 'next/server'
import { requireAdminAuth } from '@/lib/utils/admin-api-auth'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { isAdminForCity } from '@/lib/utils/admin-auth'

export async function requireCityAdmin(request: NextRequest) {
  const auth = await requireAdminAuth(request)
  if (!auth.authenticated || !auth.session) {
    return { ok: false as const, status: 401, error: auth.error || 'Unauthorized' }
  }

  const hostname = request.headers.get('host') || ''
  const city = await getCityFromHostname(hostname)
  const allowed = await isAdminForCity(auth.session.adminId, city)
  if (!allowed) {
    return { ok: false as const, status: 403, error: 'Insufficient permissions' }
  }

  return {
    ok: true as const,
    adminId: auth.session.adminId,
    city: city.toLowerCase(),
    username: auth.session.username,
  }
}
