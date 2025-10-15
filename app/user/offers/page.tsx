import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserOffersPage } from '@/components/user/user-offers-page'
import { createTenantAwareClient, getSafeCurrentCity } from '@/lib/utils/tenant-security'

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

  // Use tenant-aware client with fixed RLS policies
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
  
  // 🐛 DEBUG: Log wallet pass ID resolution
  console.log('🔍 Offers page wallet_pass_id resolution:', {
    urlWalletPassId,
    urlUserId,
    cookieWalletPassId,
    finalWalletPassId: walletPassId
  })
  
  // 🎯 TRACK: Update pass activity when user visits (indicates pass is still installed)
  if (walletPassId) {
    updatePassActivity(walletPassId).catch(console.error)
  }
  
  // Get current user for the layout
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
          level: user.level
        }
        console.log('✅ Offers page found user:', user.name, 'with wallet_pass_id:', walletPassId)
      } else {
        console.log('❌ Offers page: User query returned null for wallet_pass_id:', walletPassId)
      }
    } catch (error) {
      console.log('❌ Offers page: Error fetching user for wallet_pass_id:', walletPassId, 'Error:', error)
    }
  }
  
  // Fetch approved businesses and their offers from the new business_offers table
  let businessOffers = []
  let error = null
  
  // 🎯 SIMPLIFIED FRANCHISE SYSTEM: Use validated current city
  const userCity = currentUser?.city || currentCity
  const franchiseCity = currentCity // Use validated city directly
  
  console.log(`📊 Offers Page: User city: ${userCity}, Franchise city: ${franchiseCity}`)
  
  // First get approved businesses for this franchise
  const { data: franchiseBusinesses, error: businessError } = await supabase
    .from('business_profiles')
    .select('id, business_name, city, status')
    .eq('city', franchiseCity)
    .eq('status', 'approved')
  
  console.log(`📊 Offers Page: Business query result:`, {
    franchiseBusinesses,
    businessError,
    franchiseCity,
    count: franchiseBusinesses?.length || 0
  })
  
  const businessIds = franchiseBusinesses?.map(b => b.id) || []
  console.log(`📊 Offers Page: Business IDs for offers query:`, businessIds)
  
  // Then get offers for those businesses
  console.log(`📊 Offers Page: Querying business_offers with businessIds:`, businessIds)
  
  const { data, error: fetchError } = await supabase
    .from('business_offers')
    .select(`
      id,
      offer_name,
      offer_type,
      offer_value,
      offer_terms,
      offer_start_date,
      offer_end_date,
      offer_image,
      display_order,
      created_at,
      business_id,
      status,
      business_profiles (
        id,
        business_name,
        business_images,
        business_tier
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
  } else {
    console.log(`📊 Offers Page: Found ${businessOffers.length} approved offers`)
    console.log('📊 Offers:', businessOffers.map(offer => `${offer.offer_name} at ${offer.business_profiles?.business_name || 'Unknown'} (${offer.business_profiles?.business_tier || 'N/A'})`))
  }
  
  // Filter out expired offers
  const activeOffers = (businessOffers || []).filter(offer => {
    // If no end date, offer is always active
    if (!offer.offer_end_date) return true
    
    // Check if offer hasn't expired
    const endDate = new Date(offer.offer_end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today
    
    return endDate >= today
  })

  console.log(`📊 Offers Page: After expiry filter: ${activeOffers.length} active offers`)
  if (activeOffers.length !== businessOffers.length) {
    console.log('📊 Filtered out expired offers:', businessOffers.filter(o => !activeOffers.includes(o)).map(o => `${o.offer_name} - Expired: ${o.offer_end_date}`))
  }

  // Transform offers to match expected format
  const realOffers = activeOffers.map(offer => ({
    id: offer.id,
    businessId: offer.business?.id,
    businessName: offer.business?.business_name,
    businessCategory: offer.business?.business_category,
    businessLogo: offer.business?.logo,
    businessRating: offer.business?.rating || 4.5,
    title: offer.offer_name,
    description: offer.offer_terms || `${offer.offer_type} offer from ${offer.business?.business_name}`,
    type: offer.offer_type?.toLowerCase().replace(' ', '_') || 'discount',
    value: offer.offer_value,
    originalPrice: null, // Real offers don't have original price tracking yet
    discountedPrice: null,
    image: offer.offer_image || offer.business?.business_images?.[0] || offer.business?.logo,
    isPopular: (offer.business?.rating || 0) > 4.0,
    isEndingSoon: offer.offer_end_date ? new Date(offer.offer_end_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : false,
    validUntil: offer.offer_end_date ? new Date(offer.offer_end_date).toLocaleDateString() : null,
    termsAndConditions: offer.offer_terms || 'Standard terms and conditions apply.',
    businessAddress: offer.business?.business_address,
    businessTown: offer.business?.business_town,
    businessHours: offer.business?.business_hours
  }))
  
  return (
    <UserDashboardLayout 
      currentSection="offers"
      walletPassId={walletPassId}
      currentUser={currentUser}
    >
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-slate-400">Loading offers...</div>
        </div>
      }>
        <UserOffersPage realOffers={realOffers} walletPassId={walletPassId} />
      </Suspense>
    </UserDashboardLayout>
  )
}
