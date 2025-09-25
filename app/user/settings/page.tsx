import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserSettingsPage } from '@/components/user/user-settings-page'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'

interface SettingsPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
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
  
  // Get user data
  const supabase = createServiceRoleClient()
  let currentUser = null
  
  if (walletPassId) {
    try {
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
          city: user.city
        }
      }
    } catch (error) {
      console.log('No user found for settings page')
    }
  }
  
  // Fallback for users without wallet pass ID
  if (!currentUser) {
    currentUser = {
      id: 'anonymous-user',
      wallet_pass_id: walletPassId,
      name: 'Qwikker User',
      email: 'user@qwikker.com',
      city: 'bournemouth'
    }
  }
  
  return (
    <UserDashboardLayout 
      currentSection="settings"
      walletPassId={walletPassId}
      currentUser={currentUser}
    >
      <UserSettingsPage currentUser={currentUser} />
    </UserDashboardLayout>
  )
}
