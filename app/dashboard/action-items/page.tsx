import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ActionItemsPage } from '@/components/dashboard/action-items-page'
import { Profile } from '@/types/profiles'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'

export default async function DashboardActionItemsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  const { data: profileData, error: profileError } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', data.claims.sub)
    .single()

  if (profileError || !profileData) {
    console.error('Error fetching profile:', profileError)
    redirect('/onboarding')
  }

  // Get approved menus count for this business
  const { count: approvedMenusCount } = await supabase
    .from('menus')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', profileData?.id)
    .eq('status', 'approved')

  // Add menus count to profile for action items logic
  const profile: Profile = {
    ...profileData,
    approved_menus_count: approvedMenusCount || 0
  }
  
  const actionItemsCount = calculateActionItemsCount(profile)

  return (
    <DashboardLayout currentSection="action-items" profile={profile} actionItemsCount={actionItemsCount}>
      <ActionItemsPage profile={profile} />
    </DashboardLayout>
  )
}
