import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserSettingsPage } from '@/components/user/user-settings-page'
// Removed service role import for security
import { createTenantAwareClient, getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getCityDisplayName } from '@/lib/utils/city-detection'

export const dynamic = 'force-dynamic'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'

interface SettingsPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  // SECURITY: Validate franchise first
  let currentCity: string
  let cityDisplayName: string
  try {
    currentCity = await getSafeCurrentCity()
    cityDisplayName = getCityDisplayName(currentCity as any)
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
  
  // SECURITY: Use tenant-aware client (no service role fallback)
  const supabase = await createTenantAwareClient()
  
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
  
  // Get stats for city badge
  const { data: businesses } = await supabase
    .from('business_profiles')
    .select('id, business_offers!left(id, status, offer_end_date)')
    .eq('city', currentCity)
    .in('status', ['approved', 'unclaimed', 'claimed_free'])
  
  const totalBusinesses = businesses?.length || 0
  const totalOffers = businesses?.reduce((total, b) => {
    const activeOffers = (b.business_offers || []).filter(offer => 
      offer.status === 'active' && 
      (!offer.offer_end_date || new Date(offer.offer_end_date) >= new Date())
    )
    return total + activeOffers.length
  }, 0) || 0
  
  return (
    <UserDashboardLayout 
      currentSection="settings"
      walletPassId={walletPassId}
      currentUser={currentUser}
      currentCity={currentCity}
      cityDisplayName={cityDisplayName}
    >
      <UserSettingsPage 
        currentUser={currentUser}
        currentCity={currentCity}
        cityDisplayName={cityDisplayName}
        stats={{ totalBusinesses, totalOffers }}
      />
    </UserDashboardLayout>
  )
}
