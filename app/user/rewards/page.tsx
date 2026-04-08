import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getCityDisplayName } from '@/lib/utils/city-detection'
import { getWalletPassCookie, setWalletPassCookie } from '@/lib/utils/wallet-session'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'
import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserRewardsPage } from '@/components/user/user-rewards-page'

export const dynamic = 'force-dynamic'

interface RewardsPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function RewardsPage({ searchParams }: RewardsPageProps) {
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

  const resolvedSearchParams = await searchParams
  const urlWalletPassId = resolvedSearchParams.wallet_pass_id

  let cookieWalletPassId: string | null = null
  try {
    cookieWalletPassId = await getWalletPassCookie()
  } catch {}

  const walletPassId = urlWalletPassId || cookieWalletPassId || null

  if (urlWalletPassId && urlWalletPassId !== cookieWalletPassId) {
    try { await setWalletPassCookie(urlWalletPassId) } catch {}
  }

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

  const { user: validatedUser, isValid } = await getValidatedUser(walletPassId)

  let currentUser = null
  if (isValid && validatedUser) {
    currentUser = {
      id: validatedUser.id,
      wallet_pass_id: validatedUser.wallet_pass_id,
      name: validatedUser.name,
      email: validatedUser.email,
      city: validatedUser.city,
      tier: validatedUser.tier || 'explorer',
      level: validatedUser.level || 1,
    }
  } else {
    currentUser = {
      id: 'user-processing',
      wallet_pass_id: walletPassId,
      name: walletPassId ? 'New User' : 'Guest',
      email: null,
      city: currentCity,
      tier: 'explorer',
      level: 1,
    }
  }

  return (
    <UserDashboardLayout
      currentSection="rewards"
      currentUser={currentUser}
      walletPassId={walletPassId}
      currentCity={currentCity}
      cityDisplayName={cityDisplayName}
    >
      <UserRewardsPage walletPassId={walletPassId} />
    </UserDashboardLayout>
  )
}
