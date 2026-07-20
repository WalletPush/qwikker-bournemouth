import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { getCityFromRequest, getCityDisplayName } from '@/lib/utils/city-detection'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { AcquisitionEngine } from '@/components/admin/acquisition-engine'

// Force dynamic rendering (city detection requires headers)
export const dynamic = 'force-dynamic'

export default async function OfferLabPage() {
  const headersList = await headers()
  const currentCity = await getCityFromRequest(headersList)

  const cookieStore = await cookies()
  const adminSessionCookie = cookieStore.get('qwikker_admin_session')
  if (!adminSessionCookie?.value) {
    redirect('/admin/login')
  }

  let adminSession
  try {
    adminSession = JSON.parse(adminSessionCookie.value)
  } catch {
    redirect('/admin/login')
  }

  const admin = await getAdminById(adminSession.adminId)
  const hasAccess = await isAdminForCity(adminSession.adminId, currentCity)
  if (!admin || !hasAccess) {
    redirect('/admin/login')
  }

  return <AcquisitionEngine cityDisplayName={getCityDisplayName(currentCity)} />
}
