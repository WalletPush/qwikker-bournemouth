import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { SocialWizardPageClient } from '@/components/dashboard/social-wizard-page-client'
import { Profile } from '@/types/profiles'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'

export default async function SocialWizardRoute() {
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

  // Get approved menus count for action items
  const { count: approvedMenusCount } = await supabase
    .from('menus')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', profileData?.id)
    .eq('status', 'approved')

  const profile: Profile = {
    ...profileData,
    approved_menus_count: approvedMenusCount || 0
  }
  
  const actionItemsCount = calculateActionItemsCount(profile)

  return (
    <DashboardLayout currentSection="social-wizard" profile={profile} actionItemsCount={actionItemsCount}>
      <SocialWizardPageClient profile={profile} />
    </DashboardLayout>
  )
}

