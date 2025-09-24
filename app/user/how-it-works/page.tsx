import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserHowItWorksPage } from '@/components/user/user-how-it-works-page'

interface HowItWorksPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function HowItWorksPage({ searchParams }: HowItWorksPageProps) {
  const resolvedSearchParams = await searchParams
  const walletPassId = resolvedSearchParams.wallet_pass_id
  
  return (
    <UserDashboardLayout 
      currentSection="how-it-works"
      walletPassId={walletPassId}
    >
      <UserHowItWorksPage walletPassId={walletPassId} />
    </UserDashboardLayout>
  )
}
