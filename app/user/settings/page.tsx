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
  
  // Get stats for city badge (use franchise `city` column, not `business_town`)
  // Use service role to get accurate counts regardless of RLS
  const { createServiceRoleClient } = await import('@/lib/supabase/server')
  const supabaseAdmin = createServiceRoleClient()

  const { data: businesses } = await supabaseAdmin
    .from('business_profiles')
    .select('id, additional_notes, business_offers!left(id, status, offer_end_date)')
    .eq('city', currentCity)
    .in('status', ['approved', 'claimed_free', 'unclaimed'])
  
  const now = new Date()

  // Fetch subscriptions to exclude expired trials
  const businessIds = (businesses || []).map(b => b.id)
  const { data: subscriptions } = businessIds.length > 0
    ? await supabaseAdmin
        .from('business_subscriptions')
        .select('business_id, is_in_free_trial, free_trial_end_date')
        .in('business_id', businessIds)
    : { data: [] }

  const expiredTrialIds = new Set(
    (subscriptions || [])
      .filter(s => s.is_in_free_trial && s.free_trial_end_date && new Date(s.free_trial_end_date) < now)
      .map(s => s.business_id)
  )

  // Exclude expired trials
  const liveBusinesses = (businesses || []).filter(b => !expiredTrialIds.has(b.id))

  const totalBusinesses = liveBusinesses.length
  const totalOffers = liveBusinesses.reduce((total, b) => {
    const activeOffers = (b.business_offers || []).filter((offer: { status: string; offer_end_date?: string }) => 
      offer.status === 'approved' && 
      (!offer.offer_end_date || new Date(offer.offer_end_date) >= now)
    )
    return total + activeOffers.length
  }, 0)
  const totalSecretMenuItems = liveBusinesses.reduce((total, b) => {
    try {
      const raw = b.additional_notes
      const notes = typeof raw === 'string' ? JSON.parse(raw) : raw
      const items = (notes?.secret_menu_items as unknown[]) || []
      return total + items.length
    } catch {
      return total
    }
  }, 0)

  // Get upcoming approved events for this city
  const { count: totalEvents } = await supabaseAdmin
    .from('business_events')
    .select('*, business_profiles!inner(city)', { count: 'exact', head: true })
    .eq('status', 'approved')
    .eq('business_profiles.city', currentCity)
    .gte('event_date', now.toISOString().split('T')[0])
  
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
        stats={{ totalBusinesses, totalOffers, totalSecretMenuItems, totalEvents: totalEvents || 0 }}
      />
    </UserDashboardLayout>
  )
}
