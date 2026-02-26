import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getCityDisplayName } from '@/lib/utils/city-detection'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'
import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserRewardsPage } from '@/components/user/user-rewards-page'

export const dynamic = 'force-dynamic'

export default async function RewardsPage() {
  let currentCity: string
  let cityDisplayName: string
  try {
    currentCity = await getSafeCurrentCity()
    cityDisplayName = getCityDisplayName(currentCity as any)
  } catch {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-slate-400">Invalid franchise location detected.</p>
        </div>
      </div>
    )
  }

  const walletPassId = await getWalletPassCookie()

  if (!walletPassId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Install Qwikker First</h1>
          <p className="text-slate-400">You need a Qwikker pass to view your rewards.</p>
        </div>
      </div>
    )
  }

  return (
    <UserDashboardLayout
      currentSection="rewards"
      walletPassId={walletPassId}
      currentCity={currentCity}
      cityDisplayName={cityDisplayName}
    >
      <UserRewardsPage walletPassId={walletPassId} />
    </UserDashboardLayout>
  )
}
