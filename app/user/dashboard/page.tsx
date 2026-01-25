import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserDashboardHome } from '@/components/user/user-dashboard-home'
import { createTenantAwareClient, getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getCityDisplayName } from '@/lib/utils/city-detection'

export const dynamic = 'force-dynamic'
import { getWalletPassCookie, setWalletPassCookie } from '@/lib/utils/wallet-session'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'
import { filterActiveOffers } from '@/lib/utils/offer-helpers'
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

  // SECURITY: Use tenant-aware client with service role fallback for user lookup
  let supabase
  try {
    supabase = await createTenantAwareClient()
  } catch (error) {
    console.warn('⚠️ Dashboard: Falling back to service role client for user lookup:', error)
    const { createServiceRoleClient } = await import('@/lib/supabase/server')
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
    // Cookie read error (safe to ignore)
  }
  
  // URL parameter ALWAYS takes priority over cookie (for new signups)
  let walletPassId = urlWalletPassId || cookieWalletPassId || null
  
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
  // Use consistent city detection like other pages
  
  // Fetch approved businesses from database (franchise-filtered) with subscription data
  // ✅ CRITICAL: Include subscription data to filter out expired trials
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
        offer_end_date,
        offer_start_date,
        status
      ),
      business_subscriptions!business_subscriptions_business_id_fkey(
        is_in_free_trial,
        free_trial_end_date,
        status
      )
    `)
    .in('status', ['approved', 'unclaimed', 'claimed_free']) // Include all discoverable businesses
    .eq('city', currentCity) // SECURITY: Filter by franchise city
    .not('business_name', 'is', null)
  
  if (error) {
    console.error('❌ Error fetching businesses:', error, JSON.stringify(error))
  }
  
  // ✅ CRITICAL: Filter out expired trials (same logic as discover page)
  const activeBusinesses = (approvedBusinesses || []).filter(business => {
    // If no subscription data, assume active (legacy/unclaimed businesses)
    if (!business.business_subscriptions || !Array.isArray(business.business_subscriptions) || business.business_subscriptions.length === 0) {
      return true
    }
    
    const sub = business.business_subscriptions[0]
    
    // If not in trial, they're active (paid customers)
    if (!sub.is_in_free_trial) {
      return true
    }
    
    // If in trial, check if expired
    if (sub.free_trial_end_date) {
      const endDate = new Date(sub.free_trial_end_date)
      const now = new Date()
      return endDate >= now // Only show if trial NOT expired
    }
    
    return true // Default to showing if we can't determine
  })
  
  // Calculate stats (NO MOCK DATA - 100% database-driven)
  const totalBusinesses = activeBusinesses.length
  
  // Count active offers (filter by date)
  const totalOffers = activeBusinesses.reduce((total, b) => {
    const activeOffers = filterActiveOffers(b.business_offers || [])
    return total + activeOffers.length
  }, 0)
  
  // Count businesses with secret menus
  const totalSecretMenus = activeBusinesses.filter(b => {
    if (!b.additional_notes) return false
    try {
      const notes = JSON.parse(b.additional_notes)
      return notes.secret_menu_items && notes.secret_menu_items.length > 0
    } catch (e) {
      return false
    }
  }).length
  
  const stats = {
    totalBusinesses,
    totalOffers,
    totalSecretMenus
  }
  
  return (
    <UserDashboardLayout 
      currentSection="dashboard" 
      currentUser={currentUser}
      walletPassId={walletPassId}
      currentCity={currentCity}
      cityDisplayName={cityDisplayName}
    >
      <UserDashboardHome 
        stats={stats} 
        currentUser={currentUser} 
        walletPassId={walletPassId} 
        franchiseCity={currentCity}
        currentCity={currentCity}
        cityDisplayName={cityDisplayName}
      />
    </UserDashboardLayout>
  )
}
