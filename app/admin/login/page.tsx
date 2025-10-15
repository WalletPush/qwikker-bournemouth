import { headers } from 'next/headers'
import { getCityFromRequest, getCityDisplayName } from '@/lib/utils/city-detection'
import FranchiseAdminLogin from '@/components/franchise-admin-login'

// Force dynamic rendering for security (city detection requires headers)
export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  // Get city from URL subdomain
  const headersList = await headers()
  const currentCity = await getCityFromRequest(headersList)
  const cityDisplayName = getCityDisplayName(currentCity)

  return (
    <FranchiseAdminLogin 
      city={currentCity} 
      cityDisplayName={cityDisplayName}
    />
  )
}
