import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserDashboardHome } from '@/components/user/user-dashboard-home'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { mockBusinesses, mockOffers } from '@/lib/mock-data/user-mock-data'
import { getWalletPassCookie, setWalletPassCookie } from '@/lib/utils/wallet-session'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
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
  // Use service role client to avoid auth token issues for wallet pass users
  const supabase = createServiceRoleClient()
  
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
  
  let currentUser = null
  
  // Try to get user by wallet pass ID (only if we have one)
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
        city: user.city,
        tier: user.tier,
        level: user.level,
        points_balance: user.total_points || 0,
        badges_earned: user.badges || [],
        total_visits: user.stats?.businessesVisited || 0,
        offers_claimed: user.stats?.offersRedeemed || 0,
        secret_menus_unlocked: user.stats?.secretItemsUnlocked || 0,
        favorite_categories: user.preferred_categories || []
      }
    }
      console.log('✅ Found user by wallet pass ID:', user?.name, 'ID:', walletPassId)
    } catch (error) {
      console.log('No user found with wallet pass ID:', walletPassId, 'creating fresh user profile')
      
      // Create fresh user profile for new users (no mock data)
      currentUser = {
        id: 'user-processing',
        wallet_pass_id: walletPassId,
        name: 'New User (Processing...)',
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
  } else {
    // No wallet pass ID at all - completely new user
    console.log('No wallet pass ID provided - creating anonymous user profile')
    currentUser = {
      id: 'anonymous-user',
      wallet_pass_id: null,
      name: 'Welcome to Qwikker!',
      email: 'anonymous@qwikker.com',
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
  const franchiseCity = getFranchiseCityFromRequest()
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
      additional_notes
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
  const realOffers = realBusinesses.filter(b => b.offer_name).length
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
      <UserDashboardHome stats={stats} currentUser={currentUser} walletPassId={walletPassId} />
    </UserDashboardLayout>
  )
}
