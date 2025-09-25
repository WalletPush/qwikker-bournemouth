import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'

export default async function ChatPage({
  searchParams
}: {
  searchParams: Promise<{ wallet_pass_id?: string }>
}) {
  const supabase = createServiceRoleClient()
  const params = await searchParams
  const urlWalletPassId = params.wallet_pass_id
  
  // Get wallet pass ID from URL or cookie
  let cookieWalletPassId = null
  try {
    cookieWalletPassId = await getWalletPassCookie()
  } catch (error) {
    console.log('Cookie read error (safe to ignore):', error)
  }
  
  const userId = urlWalletPassId || cookieWalletPassId || null
  
  // Get current user for personalized chat
  let currentUser = null
  
  try {
    const { data: user } = await supabase
      .from('app_users')
      .select('name, level, tier, total_points, city, preferred_categories')
      .eq('wallet_pass_id', userId)
      .single()
    currentUser = user
  } catch (error) {
    console.log('No user found, using generic chat')
  }
  
  return (
    <UserDashboardLayout 
      currentSection="chat" 
      currentUser={currentUser}
      walletPassId={userId}
    >
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-white mb-2">AI Chat Coming Soon</h2>
          <p className="text-slate-400">We're working on integrating your AI companion</p>
        </div>
      </div>
    </UserDashboardLayout>
  )
}
