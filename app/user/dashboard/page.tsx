import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserDashboardHome } from '@/components/user/user-dashboard-home'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createTenantAwareClient, getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { mockBusinesses, mockOffers } from '@/lib/mock-data/user-mock-data'
import { getWalletPassCookie, setWalletPassCookie } from '@/lib/utils/wallet-session'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "QWIKKER - User Dashboard",
  description: "Discover amazing local businesses, exclusive offers, and secret menus in Bournemouth",
}

interface UserDashboardPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function UserDashboardPage({ searchParams }: UserDashboardPageProps) {
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

  // Use tenant-aware client instead of service role
  let supabase
  try {
    supabase = await createTenantAwareClient()
  } catch (error) {
    console.warn('⚠️ Falling back to service role client:', error)
    supabase = createServiceRoleClient()
  }
  
  // 🎯 WALLET PASS AUTHENTICATION FLOW
  // Priority: URL param > Cookie > Default demo user
  const resolvedSearchParams = await searchParams
  const urlWalletPassId = resolvedSearchParams.wallet_pass_id
  
  let cookieWalletPassId = null
  try {
    cookieWalletPassId = await getWalletPassCookie()
  } catch (error) {
    console.log('Cookie read error (safe to ignore):', error)
  }
  
  // URL parameter ALWAYS takes priority over cookie (for new signups)
  let walletPassId = urlWalletPassId || cookieWalletPassId || null
  
  console.log('🔍 Dashboard Debug:', {
    urlWalletPassId,
    cookieWalletPassId,
    finalWalletPassId: walletPassId
  })
  
  // Save to cookie if we got it from URL (for persistence across refreshes)
  if (urlWalletPassId && urlWalletPassId !== cookieWalletPassId) {
    try {
      await setWalletPassCookie(urlWalletPassId)
      console.log('💾 Saved wallet pass ID to cookie:', urlWalletPassId)
    } catch (error) {
      console.log('Cookie save error (safe to ignore):', error)
    }
  }
  
  // 🔒 SECURITY: Validate wallet pass ID and get user securely
  const { user: validatedUser, isValid, error: validationError } = await getValidatedUser(walletPassId)
  
  let currentUser = null
  
  if (isValid && validatedUser) {
    currentUser = {
      id: validatedUser.id,
      wallet_pass_id: validatedUser.wallet_pass_id,
      name: validatedUser.name,
      email: validatedUser.email,
      city: validatedUser.city,
      tier: validatedUser.tier || 'explorer',
      level: validatedUser.level || 1,
      points_balance: 0,
      badges_earned: [],
      total_visits: 0,
      offers_claimed: 0,
      secret_menus_unlocked: 0,
      favorite_categories: []
    }
    console.log('✅ Dashboard: Validated user:', validatedUser.name)
  } else {
    // 🔒 SECURITY: Log invalid access attempts
    if (walletPassId && !isValid) {
      console.warn(`🚨 Security: Invalid wallet pass access attempt on dashboard: ${walletPassId} - ${validationError}`)
    }
    
    // Create fresh user profile for new/invalid users
    currentUser = {
      id: 'user-processing',
      wallet_pass_id: walletPassId,
      name: walletPassId ? 'New User (Processing...)' : 'Qwikker User',
      email: 'processing@qwikker.com',
      city: 'bournemouth',
      tier: 'explorer',
      level: 1,
      points_balance: 0,
      badges_earned: [],
      total_visits: 0,
      offers_claimed: 0,
      secret_menus_unlocked: 0,
      favorite_categories: []
    }
  }
  
  // 🎯 FRANCHISE SYSTEM: Get franchise city for filtering
  const franchiseCity = await getFranchiseCityFromRequest()
  console.log(`📊 Dashboard: Filtering businesses for franchise city: ${franchiseCity}`)
  
  // Fetch approved businesses from database (franchise-filtered)
  const { data: approvedBusinesses, error } = await supabase
    .from('business_profiles')
    .select(`
      id,
      business_name,
      offer_name,
      offer_type,
      offer_value,
      menu_preview,
      plan,
      status,
      additional_notes,
      business_offers!left(
        id,
        offer_name,
        offer_type,
        offer_value,
        status
      )
    `)
    .eq('status', 'approved')
    .eq('city', franchiseCity) // 🎯 FRANCHISE FILTERING: Use city field for franchise
    .not('business_name', 'is', null)
  
  if (error) {
    console.error('Error fetching businesses:', error)
  }
  
  // Calculate real stats
  const realBusinesses = approvedBusinesses || []
  const totalBusinesses = realBusinesses.length + mockBusinesses.length
  
  // Count real offers + mock offers
  const realOffers = realBusinesses.reduce((total, b) => {
    return total + (b.business_offers?.filter(offer => offer.status === 'approved')?.length || 0)
  }, 0)
  const totalOffers = realOffers + mockOffers.length
  
  // Count businesses with secret menus (both real and mock)
  const realSecretMenus = realBusinesses.filter(b => {
    if (!b.additional_notes) return false
    try {
      const notes = JSON.parse(b.additional_notes)
      return notes.secret_menu_items && notes.secret_menu_items.length > 0
    } catch (e) {
      return false
    }
  }).length
  const mockSecretMenus = mockBusinesses.filter(b => b.hasSecretMenu).length
  const totalSecretMenus = realSecretMenus + mockSecretMenus
  
  const stats = {
    totalBusinesses,
    totalOffers,
    totalSecretMenus,
    realBusinesses: realBusinesses.length,
    realOffers,
    realSecretMenus
  }
  
  return (
    <UserDashboardLayout 
      currentSection="dashboard" 
      currentUser={currentUser}
      walletPassId={walletPassId}
    >
      <UserDashboardHome stats={stats} currentUser={currentUser} walletPassId={walletPassId} franchiseCity={franchiseCity} />
    </UserDashboardLayout>
  )
}
