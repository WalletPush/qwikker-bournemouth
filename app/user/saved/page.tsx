import { getUserSavedItems } from '@/lib/actions/user-saved-actions'
import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserSavedPage } from '@/components/user/user-saved-page'
import { getCurrentUserProfile } from '@/lib/actions/user-profile-actions'

export const dynamic = 'force-dynamic'

export default async function SavedPage({
  searchParams,
}: {
  searchParams: { wallet_pass_id?: string }
}) {
  const walletPassId = searchParams.wallet_pass_id

  // Get current user
  const currentUser = await getCurrentUserProfile(walletPassId)

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

