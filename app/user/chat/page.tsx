import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserChatPage } from '@/components/user/user-chat-page'
// Removed service role import for security
import { createTenantAwareClient, getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'

export default async function ChatPage({
  searchParams
}: {
  searchParams: Promise<{ wallet_pass_id?: string; user_id?: string }>
}) {
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

  const params = await searchParams
  const urlWalletPassId = params.wallet_pass_id
  const urlUserId = params.user_id // Support old system
  
  // Get wallet pass ID from URL or cookie
  let cookieWalletPassId = null
  try {
    cookieWalletPassId = await getWalletPassCookie()
  } catch (error) {
    console.log('Cookie read error (safe to ignore):', error)
  }
  
  // Priority: URL wallet_pass_id > URL user_id > cookie
  const userId = urlWalletPassId || urlUserId || cookieWalletPassId || null
  
  // Get current user for personalized chat
  let currentUser = null
  
  try {
    const { data: user } = await supabase
      .from('app_users')
      .select('name, level, tier, total_points, city, preferred_categories')
      .eq('wallet_pass_id', userId)
      .eq('city', currentCity) // Explicit city filter for extra safety
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
      <UserChatPage currentUser={{ ...currentUser, wallet_pass_id: userId }} />
    </UserDashboardLayout>
  )
}
