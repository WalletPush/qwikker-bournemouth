import { getUserSavedItems } from '@/lib/actions/user-saved-actions'
import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserSavedPage } from '@/components/user/user-saved-page'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getCityDisplayName } from '@/lib/utils/city-detection'

export const dynamic = 'force-dynamic'

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<{ wallet_pass_id?: string }>
}) {
  // SECURITY: Validate franchise first
  let currentCity: string
  let cityDisplayName: string
  try {
    currentCity = await getSafeCurrentCity()
    cityDisplayName = getCityDisplayName(currentCity as any)
  } catch (error) {
    console.error('❌ Invalid franchise access:', error)
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
  const walletPassId = resolvedSearchParams.wallet_pass_id

  // Get validated user
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
      points_balance: 0,
      badges_earned: [],
      total_visits: 0,
      offers_claimed: 0,
      secret_menus_unlocked: 0,
      favorite_categories: []
    }
  } else {
    currentUser = {
      id: 'user-processing',
      wallet_pass_id: walletPassId,
      name: 'Qwikker User',
      email: 'user@qwikker.com',
      city: currentCity,
      tier: 'explorer',
      level: 1,
      points_balance: 0,
      badges_earned: [],
      total_visits: 0,
      offers_claimed: 0,
      secret_menus_unlocked: 0,
      favorite_categories: []
    }
  }

  // Get saved items
  const savedResult = await getUserSavedItems(walletPassId)

  return (
    <UserDashboardLayout
      currentSection="saved"
      currentUser={currentUser}
      walletPassId={walletPassId}
      currentCity={currentCity}
      cityDisplayName={cityDisplayName}
    >
      <UserSavedPage
        savedItems={savedResult.items || []}
        walletPassId={walletPassId}
      />
    </UserDashboardLayout>
  )
}

