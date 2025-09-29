import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserOffersPage } from '@/components/user/user-offers-page'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'
import { updatePassActivity } from '@/lib/utils/pass-status-tracker'
import { getFranchiseCity } from '@/lib/utils/franchise-areas'
import { Suspense } from 'react'

interface OffersPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
    user_id?: string // Support old system parameter
  }>
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const supabase = createServiceRoleClient()
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
      }
    } catch (error) {
      console.log('No user found for offers page')
    }
  }
  
  // Fetch approved businesses with offers (city-scoped)
  let approvedBusinesses = []
  let error = null
  
  // 🎯 SIMPLIFIED FRANCHISE SYSTEM: Use user's city or default to 'bournemouth' for anonymous users
  const userCity = currentUser?.city || 'bournemouth'
  const franchiseCity = getFranchiseCity(userCity)
  
  console.log(`📊 Offers Page: User city: ${userCity}, Franchise city: ${franchiseCity}`)
  
  // 🔍 DEBUG: Check what city values exist in database
  const { data: cityCheck } = await supabase
    .from('business_profiles')
    .select('business_name, city, business_town, status')
    .eq('status', 'approved')
    .not('offer_name', 'is', null)
  
  console.log('🔍 DEBUG: Current city values in database:', cityCheck?.map(b => `${b.business_name}: city="${b.city}", town="${b.business_town}"`))
  
  const { data, error: fetchError } = await supabase
    .from('business_profiles')
    .select(`
      id,
      business_name,
      business_type,
      business_category,
      business_town,
      business_address,
      business_tagline,
      business_description,
      business_hours,
      business_images,
      logo,
      offer_name,
      offer_type,
      offer_value,
      offer_terms,
      offer_start_date,
      offer_end_date,
      offer_image,
      rating,
      review_count,
      created_at
    `)
    .eq('status', 'approved')
    .eq('city', franchiseCity) // 🎯 FRANCHISE FILTERING: Use city field for franchise
    .not('offer_name', 'is', null) // Only businesses with offers
    .not('business_name', 'is', null)
    .order('created_at', { ascending: false })
  
  approvedBusinesses = data || []
  error = fetchError
  
  if (error) {
    console.error('Error fetching businesses with offers:', error)
  } else {
    console.log(`📊 Offers Page: Found ${approvedBusinesses.length} approved businesses with offers`)
    console.log('📊 Business names:', approvedBusinesses.map(b => `${b.business_name} (${b.business_town}) - Offer: ${b.offer_name}`))
  }
  
  // Filter out expired offers
  const activeBusinesses = (approvedBusinesses || []).filter(business => {
    // If no end date, offer is always active
    if (!business.offer_end_date) return true
    
    // Check if offer hasn't expired
    const endDate = new Date(business.offer_end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today
    
    return endDate >= today
  })

  console.log(`📊 Offers Page: After expiry filter: ${activeBusinesses.length} active businesses`)
  if (activeBusinesses.length !== approvedBusinesses.length) {
    console.log('📊 Filtered out expired offers:', approvedBusinesses.filter(b => !activeBusinesses.includes(b)).map(b => `${b.business_name} - Expired: ${b.offer_end_date}`))
  }

  // Transform real offers to match expected format
  const realOffers = activeBusinesses.map(business => ({
    id: `${business.id}-offer`,
    businessId: business.id,
    businessName: business.business_name,
    businessCategory: business.business_category,
    businessLogo: business.logo,
    businessRating: business.rating || 4.5,
    title: business.offer_name,
    description: business.offer_terms || `${business.offer_type} offer from ${business.business_name}`,
    type: business.offer_type?.toLowerCase().replace(' ', '_') || 'discount',
    value: business.offer_value,
    originalPrice: null, // Real offers don't have original price tracking yet
    discountedPrice: null,
    image: business.offer_image || business.business_images?.[0] || business.logo,
    isPopular: business.rating > 4.0,
    isEndingSoon: business.offer_end_date ? new Date(business.offer_end_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : false,
    validUntil: business.offer_end_date ? new Date(business.offer_end_date).toLocaleDateString() : null,
    termsAndConditions: business.offer_terms || 'Standard terms and conditions apply.',
    businessAddress: business.business_address,
    businessTown: business.business_town,
    businessHours: business.business_hours
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
