import { Suspense } from 'react'
import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { SimpleBadgesPage } from '@/components/user/simple-badges-page'
import { createServiceRoleClient } from '@/lib/supabase/server'
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
  const supabase = createServiceRoleClient()
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
