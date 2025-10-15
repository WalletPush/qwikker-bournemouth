import { Suspense } from 'react'
import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { SimpleBadgesPage } from '@/components/user/simple-badges-page'
// Removed service role import for security
import { createTenantAwareClient, getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'

export const metadata = {
  title: 'Your Qwikker Achievements - Unlock Your Potential!',
  description: 'Track your progress and unlock achievements as you explore Qwikker.',
}

interface BadgesPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function BadgesPage({ searchParams }: BadgesPageProps) {
  // SECURITY: Validate franchise first
  let currentCity: string
  try {
    currentCity = await getSafeCurrentCity()
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

  // SECURITY: Use tenant-aware client (no service role fallback)
  const supabase = await createTenantAwareClient()

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

  // Get current user data for the layout
  let currentUser = null
  if (walletPassId) {
    try {
      const { data: user } = await supabase
        .from('app_users')
        .select('*')
        .eq('wallet_pass_id', walletPassId)
        .single()

      if (user) {
        currentUser = {
          id: user.id,
          wallet_pass_id: user.wallet_pass_id,
          name: user.name,
          email: user.email,
          city: user.city,
          tier: user.tier,
          level: user.level,
          points_balance: user.total_points || 0,
          badges_earned: user.badges || [],
          total_visits: user.stats?.businessesVisited || 0,
          offers_claimed: user.stats?.offersRedeemed || 0,
          secret_menus_unlocked: user.stats?.secretItemsUnlocked || 0,
          favorite_categories: user.preferred_categories || []
        }
      }
    } catch (error) {
      console.error('Error fetching user for badges page:', error)
    }
  }

  return (
    <UserDashboardLayout 
      currentSection="badges"
      currentUser={currentUser}
      walletPassId={walletPassId}
    >
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      }>
        <SimpleBadgesPage walletPassId={walletPassId} />
      </Suspense>
    </UserDashboardLayout>
  )
}
