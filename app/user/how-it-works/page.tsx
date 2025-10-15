import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserHowItWorksPage } from '@/components/user/user-how-it-works-page'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'
// Removed service role import for security

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
  
  // Get current user for the layout
  let currentUser = null
  if (walletPassId) {
    try {
      // SECURITY: Use tenant-aware client (no service role fallback)
      const { createTenantAwareClient } = await import('@/lib/utils/tenant-security')
      const supabase = await createTenantAwareClient()
      const { data: user } = await supabase
        .from('app_users')
        .select('*')
        .eq('wallet_pass_id', walletPassId)
        .eq('wallet_pass_status', 'active')
        .single()
      
      if (user) {
        currentUser = {
          id: user.id,
          wallet_pass_id: user.wallet_pass_id,
          name: user.name,
          email: user.email,
          city: user.city,
          tier: user.tier,
          level: user.level
        }
      }
    } catch (error) {
      console.log('No user found for how-it-works page')
    }
  }
  
  return (
    <UserDashboardLayout 
      currentSection="how-it-works"
      walletPassId={walletPassId}
      currentUser={currentUser}
    >
      <UserHowItWorksPage walletPassId={walletPassId} />
    </UserDashboardLayout>
  )
}
