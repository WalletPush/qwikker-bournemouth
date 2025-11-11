import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ImprovedDashboardHome } from '@/components/dashboard/improved-dashboard-home'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  // Get user profile data with business offers
  const { data: profile } = await supabase
    .from('business_profiles')
    .select(`
      *,
      business_offers!left(
        id,
        offer_name,
        offer_type,
        offer_value,
        offer_image,
        status,
        created_at
      )
    `)
    .eq('user_id', data.claims.sub)
    .single()

  // Get approved menus count for this business
  const { count: approvedMenusCount, error: menusError } = await supabase
    .from('menus')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', profile?.id)
    .eq('status', 'approved')

  // Debug logging
  console.log('📊 Dashboard Menu Count Debug:', {
    businessId: profile?.id,
    businessName: profile?.business_name,
    approvedMenusCount,
    menusError
  })

  // Add menus count to profile for action items logic
  const enrichedProfile = {
    ...profile,
    approved_menus_count: approvedMenusCount || 0
  }

  // Calculate action items count using shared utility
  const actionItemsCount = calculateActionItemsCount(enrichedProfile)

  return (
    <DashboardLayout currentSection="dashboard" profile={enrichedProfile} actionItemsCount={actionItemsCount}>
      <ImprovedDashboardHome profile={enrichedProfile} />
    </DashboardLayout>
  )
}
