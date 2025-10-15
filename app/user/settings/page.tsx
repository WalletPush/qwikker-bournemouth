import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserSettingsPage } from '@/components/user/user-settings-page'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createTenantAwareClient, getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'

interface SettingsPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
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
  
  // Use tenant-aware client instead of service role
  let supabase
  try {
    supabase = await createTenantAwareClient()
  } catch (error) {
    console.warn('⚠️ Falling back to service role client:', error)
    supabase = createServiceRoleClient()
  }
  
  let currentUser = null
  
  if (walletPassId) {
    try {
      const { data: user } = await supabase
        .from('app_users')
        .select('*')
        .eq('wallet_pass_id', walletPassId)
        .eq('wallet_pass_status', 'active')
        .eq('city', currentCity) // Explicit city filter for extra safety
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
      city: currentCity // Use validated city instead of hardcoded 'bournemouth'
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
