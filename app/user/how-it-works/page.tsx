import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserHowItWorksPage } from '@/components/user/user-how-it-works-page'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'
import { createTenantAwareClient, getSafeCurrentCity } from '@/lib/utils/tenant-security'

export const dynamic = 'force-dynamic'

interface HowItWorksPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

async function getCityExploreStats(city: string) {
  const supabase = await createTenantAwareClient()
  const now = new Date()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [{ count: partnerVenues }, { data: offers }, { data: businessesWithNotes }] = await Promise.all([
    supabase
      .from('business_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('city', city)
      .in('status', ['approved', 'unclaimed', 'claimed_free'])
      .not('business_name', 'is', null),
    supabase
      .from('business_offers')
      .select(`
        id,
        offer_start_date,
        offer_end_date,
        status,
        business_profiles!inner(city)
      `)
      .eq('status', 'approved')
      .eq('business_profiles.city', city),
    supabase
      .from('business_profiles')
      .select('id, additional_notes')
      .eq('city', city)
      .in('status', ['approved', 'unclaimed', 'claimed_free']),
  ])

  const liveOffers = (offers || []).filter((offer: {
    offer_start_date?: string | null
    offer_end_date?: string | null
  }) => {
    if (offer.offer_end_date && new Date(offer.offer_end_date) < todayStart) return false
    if (offer.offer_start_date && new Date(offer.offer_start_date) > now) return false
    return true
  }).length

  const secretMenus = (businessesWithNotes || []).filter((b: { additional_notes?: unknown }) => {
    const raw = b.additional_notes
    if (!raw) return false
    try {
      const notes = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (!notes || typeof notes !== 'object') return false
      const items = (notes as { secret_menu_items?: unknown }).secret_menu_items
      return Array.isArray(items) && items.length > 0
    } catch {
      return false
    }
  }).length

  return {
    partnerVenues: partnerVenues || 0,
    secretMenus,
    liveOffers,
    totalBadges: 17,
  }
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

  let currentCity = 'bournemouth'
  try {
    currentCity = await getSafeCurrentCity()
  } catch {
    /* keep default for local */
  }

  const stats = await getCityExploreStats(currentCity).catch(() => ({
    partnerVenues: 0,
    secretMenus: 0,
    liveOffers: 0,
    totalBadges: 17,
  }))
  
  // Get current user for the layout
  let currentUser = null
  if (walletPassId) {
    try {
      const { createServiceRoleClient } = await import('@/lib/supabase/server')
      const supabase = createServiceRoleClient()
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
      <UserHowItWorksPage walletPassId={walletPassId} stats={stats} />
    </UserDashboardLayout>
  )
}
