import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserHowItWorksPage } from '@/components/user/user-how-it-works-page'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'

interface HowItWorksPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function HowItWorksPage({ searchParams }: HowItWorksPageProps) {
  const resolvedSearchParams = await searchParams
  const urlWalletPassId = resolvedSearchParams.wallet_pass_id
  
  // Get wallet pass ID from URL or cookie
  let cookieWalletPassId = null
  try {
    cookieWalletPassId = await getWalletPassCookie()
  } catch (error) {
    console.log('Cookie read error (safe to ignore):', error)
  }
  
  const walletPassId = urlWalletPassId || cookieWalletPassId || null
  
  return (
    <UserDashboardLayout 
      currentSection="how-it-works"
      walletPassId={walletPassId}
    >
      <UserHowItWorksPage walletPassId={walletPassId} />
    </UserDashboardLayout>
  )
}
