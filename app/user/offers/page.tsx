import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserOffersPage } from '@/components/user/user-offers-page'
import { createTenantAwareClient, getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getCityDisplayName } from '@/lib/utils/city-detection'

export const dynamic = 'force-dynamic'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'
import { updatePassActivity } from '@/lib/utils/pass-status-tracker'
import { getFranchiseCity } from '@/lib/utils/franchise-areas'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'
import { Suspense } from 'react'

interface OffersPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
    user_id?: string // Support old system parameter
  }>
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  // SECURITY: Validate franchise first
  let currentCity: string
  let cityDisplayName: string
  try {
    currentCity = await getSafeCurrentCity()
    cityDisplayName = getCityDisplayName(currentCity as any)
  } catch (error) {
    console.error('❌ Invalid franchise access:', error)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-zinc-500">Invalid franchise location detected.</p>
        </div>
      </div>
    )
  }

  const supabase = await createTenantAwareClient()
  console.log('✅ Using tenant-aware client with fixed business_offers RLS')

  const resolvedSearchParams = await searchParams
  const urlWalletPassId = resolvedSearchParams.wallet_pass_id
  const urlUserId = resolvedSearchParams.user_id // Support old system
  
  // Get wallet pass ID from URL or cookie
  let cookieWalletPassId = null
  try {
    cookieWalletPassId = await getWalletPassCookie()
  } catch (error) {
    console.log('Cookie read error (safe to ignore):', error)
  }
  
  // Priority: URL wallet_pass_id > URL user_id > cookie
  const walletPassId = urlWalletPassId || urlUserId || cookieWalletPassId || null
  
  // 🎯 TRACK: Update pass activity when user visits (indicates pass is still installed)
  if (walletPassId) {
    updatePassActivity(walletPassId).catch(console.error)
  }

  const { createServiceRoleClient } = await import('@/lib/supabase/server')
  const supabaseUser = createServiceRoleClient()
  
  // Get current user for the layout
  let currentUser = null
  if (walletPassId) {
    try {
      const { data: user } = await supabaseUser
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
          level: user.level
        }
      }
    } catch (error) {
      // Silently handle user fetch errors
    }
  }
  
  // Fetch approved businesses and their offers from the new business_offers table
  let businessOffers = []
  let error = null
  
  // 🎯 SIMPLIFIED FRANCHISE SYSTEM: Use validated current city
  const userCity = currentUser?.city || currentCity
  const franchiseCity = currentCity // Use validated city directly
  
  // Offers tab = city marketplace, not AI Tier-1 only.
  // Tier 1 (chat_eligible): paid + active free trial (excludes expired trials).
  // Free listings (claimed_free): Tier 2 — on Discover/profile but NOT in chat_eligible.
  // Union both so free-listing offers appear here too.
  const [{ data: paidOrTrial }, { data: freeListings }] = await Promise.all([
    supabase
      .from('business_profiles_chat_eligible')
      .select('id')
      .eq('city', franchiseCity),
    supabase
      .from('business_profiles')
      .select('id')
      .eq('city', franchiseCity)
      .eq('status', 'claimed_free'),
  ])

  const businessIds = Array.from(
    new Set([...(paidOrTrial || []), ...(freeListings || [])].map((b) => b.id))
  )
  
  // Then get offers for those businesses
  
  const { data, error: fetchError } = await supabase
    .from('business_offers')
    .select(`
      id,
      offer_name,
      offer_type,
      offer_value,
      offer_description,
      offer_terms,
      offer_start_date,
      offer_end_date,
      offer_image,
      offer_claim_amount,
      activation_window_minutes,
      display_order,
      created_at,
      business_id,
      status,
      business_profiles (
        id,
        business_name,
        system_category,
        display_category,
        business_category,
        business_type,
        business_images,
        plan,
        logo,
        rating,
        business_address,
        business_town,
        business_hours
      )
    `)
    .eq('status', 'approved')
    .in('business_id', businessIds.length > 0 ? businessIds : ['no-matches'])
    .order('created_at', { ascending: false })
  
  console.log(`📊 Offers Page: business_offers query result:`, {
    data,
    error: fetchError,
    queryBusinessIds: businessIds,
    queryStatus: 'approved'
  })
  
  businessOffers = data || []
  error = fetchError
  
  if (error) {
    console.error('Error fetching business offers:', error)
  }
  
  // Filter out expired and not-yet-started offers
  const now = new Date()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const activeOffers = (businessOffers || []).filter(offer => {
    if (offer.offer_end_date && new Date(offer.offer_end_date) < todayStart) return false
    if (offer.offer_start_date && new Date(offer.offer_start_date) > now) return false
    return true
  })

  // Transform offers to match expected format
  const realOffers = activeOffers.map(offer => ({
    id: offer.id,
    businessId: offer.business_profiles?.id,
    businessName: offer.business_profiles?.business_name,
    businessCategory: offer.business_profiles?.display_category || 
                      offer.business_profiles?.business_category || 
                      offer.business_profiles?.business_type || 
                      'Other',
    businessLogo: offer.business_profiles?.logo,
    businessRating: offer.business_profiles?.rating ?? null,
    businessTier: offer.business_profiles?.plan, // Add plan/tier for badges
    title: offer.offer_name,
    description: offer.offer_description || offer.offer_terms || `${offer.offer_type} offer from ${offer.business_profiles?.business_name}`,
    type: offer.offer_type?.toLowerCase().replace(' ', '_') || 'discount',
    value: offer.offer_value,
    originalPrice: null, // Real offers don't have original price tracking yet
    discountedPrice: null,
    image: offer.offer_image || offer.business_profiles?.business_images?.[0] || offer.business_profiles?.logo,
    isPopular: (offer.business_profiles?.rating || 0) > 4.0,
    isEndingSoon: offer.offer_end_date ? new Date(offer.offer_end_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : false,
    validUntil: offer.offer_end_date ? new Date(offer.offer_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
    termsAndConditions: offer.offer_terms || 'Standard terms and conditions apply.',
    businessAddress: offer.business_profiles?.business_address,
    businessTown: offer.business_profiles?.business_town,
    businessHours: offer.business_profiles?.business_hours,
    // Pass through raw fields for new modal component
    offer_description: offer.offer_description,
    offer_terms: offer.offer_terms,
    offer_start_date: offer.offer_start_date,
    offer_end_date: offer.offer_end_date,
    claimType: offer.offer_claim_amount || 'single',
    offer_claim_amount: offer.offer_claim_amount || 'single',
    activationWindowMinutes: offer.activation_window_minutes || 60,
  }))
  
  // Debug: Log tier info for first few offers
  console.log('🎯 Offer tiers:', realOffers.slice(0, 3).map(o => ({ 
    business: o.businessName, 
    tier: o.businessTier 
  })))
  
  
  return (
    <UserDashboardLayout 
      currentSection="offers"
      walletPassId={walletPassId}
      currentUser={currentUser}
      currentCity={currentCity}
      cityDisplayName={cityDisplayName}
    >
      <Suspense fallback={
        <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
          <div className="h-28 rounded-2xl bg-zinc-800 border border-zinc-700/80" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-16 rounded-2xl bg-zinc-800" />
            <div className="h-16 rounded-2xl bg-zinc-800" />
            <div className="h-16 rounded-2xl bg-zinc-800" />
          </div>
          <div className="h-40 rounded-2xl bg-zinc-800/80" />
        </div>
      }>
        <UserOffersPage 
          realOffers={realOffers} 
          walletPassId={walletPassId}
          currentCity={currentCity}
          cityDisplayName={cityDisplayName}
        />
      </Suspense>
    </UserDashboardLayout>
  )
}
