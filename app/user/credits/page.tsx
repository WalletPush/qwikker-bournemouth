import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserCreditsPage } from '@/components/user/user-credits-page'

interface CreditsPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function CreditsPage({ searchParams }: CreditsPageProps) {
  const resolvedSearchParams = await searchParams
  const walletPassId = resolvedSearchParams.wallet_pass_id
  
  return (
    <UserDashboardLayout 
      currentSection="credits"
      walletPassId={walletPassId}
    >
      <UserCreditsPage walletPassId={walletPassId} />
    </UserDashboardLayout>
  )
}
