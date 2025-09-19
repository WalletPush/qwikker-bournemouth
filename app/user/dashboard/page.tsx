import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserDashboardHome } from '@/components/user/user-dashboard-home'
import { createClient } from '@/lib/supabase/server'
import { mockBusinesses, mockOffers } from '@/lib/mock-data/user-mock-data'
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "QWIKKER - User Dashboard",
  description: "Discover amazing local businesses, exclusive offers, and secret menus in Bournemouth",
}

export default async function UserDashboardPage() {
  const supabase = await createClient()
  
  // Fetch approved businesses from database
  const { data: approvedBusinesses, error } = await supabase
    .from('profiles')
    .select(`
      id,
      business_name,
      offer_name,
      offer_type,
      offer_value,
      menu_preview,
      plan,
      status
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
  
  // Count businesses with secret menus (real businesses don't have secret menus yet)
  const mockSecretMenus = mockBusinesses.filter(b => b.hasSecretMenu).length
  const totalSecretMenus = mockSecretMenus // Real businesses don't have secret menus yet
  
  const stats = {
    totalBusinesses,
    totalOffers,
    totalSecretMenus,
    realBusinesses: realBusinesses.length,
    realOffers
  }
  
  return (
    <UserDashboardLayout currentSection="dashboard">
      <UserDashboardHome stats={stats} />
    </UserDashboardLayout>
  )
}
