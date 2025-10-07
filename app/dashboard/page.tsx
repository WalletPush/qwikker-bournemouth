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

  // Calculate action items count using shared utility
  const actionItemsCount = calculateActionItemsCount(profile)

  return (
    <DashboardLayout currentSection="dashboard" profile={profile} actionItemsCount={actionItemsCount}>
      <ImprovedDashboardHome profile={profile} />
    </DashboardLayout>
  )
}
