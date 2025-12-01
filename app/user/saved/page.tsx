import { getUserSavedItems } from '@/lib/actions/user-saved-actions'
import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserSavedPage } from '@/components/user/user-saved-page'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'

export const dynamic = 'force-dynamic'

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<{ wallet_pass_id?: string }>
}) {
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
      city: 'bournemouth',
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
    >
      <UserSavedPage
        savedItems={savedResult.items || []}
        walletPassId={walletPassId}
      />
    </UserDashboardLayout>
  )
}

