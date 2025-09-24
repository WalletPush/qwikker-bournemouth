import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserDashboardHome } from '@/components/user/user-dashboard-home'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { mockBusinesses, mockOffers } from '@/lib/mock-data/user-mock-data'
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
  // Get wallet pass ID from URL param or default to David for demo
  const resolvedSearchParams = await searchParams
  const walletPassId = resolvedSearchParams.wallet_pass_id || 'QWIK-BOURNEMOUTH-DAVID-2024'
  let currentUser = null
  
  // Try to get user by wallet pass ID
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
        points_balance: user.points_balance,
        badges_earned: user.badges_earned || [],
        total_visits: user.total_visits || 0,
        offers_claimed: user.offers_claimed || 0,
        secret_menus_unlocked: user.secret_menus_unlocked || 0,
        favorite_categories: user.preferences?.favorite_categories || []
      }
    }
    console.log('✅ Found user by wallet pass ID:', user?.name, 'ID:', walletPassId)
  } catch (error) {
    console.log('No user found with wallet pass ID:', walletPassId, 'using static mock data')
    
    // If user doesn't exist, it might be a race condition - workflow still processing
    if (walletPassId !== 'QWIK-BOURNEMOUTH-DAVID-2024') {
      console.log('🔄 User might still be processing in GHL workflow...')
    }
    
    // Create mock user for testing
    currentUser = {
      id: 'user-mock',
      wallet_pass_id: walletPassId,
      name: 'David (Demo User)',
      email: 'david@demo.com',
      city: 'bournemouth',
      tier: 'explorer',
      level: 2,
      points_balance: 150,
      badges_earned: ['early_adopter', 'local_explorer'],
      total_visits: 8,
      offers_claimed: 3,
      secret_menus_unlocked: 2,
      favorite_categories: ['Restaurant', 'Cafe']
    }
  }
  
  // Fetch approved businesses from database
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
    <UserDashboardLayout currentSection="dashboard" currentUser={currentUser}>
      <UserDashboardHome stats={stats} currentUser={currentUser} />
    </UserDashboardLayout>
  )
}
