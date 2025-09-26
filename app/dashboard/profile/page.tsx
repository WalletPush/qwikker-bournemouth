import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { CleanProfilePage } from '@/components/dashboard/clean-profile-page'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'

export default async function DashboardProfilePage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  // Get user profile data
  const { data: profile } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', data.claims.sub)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  // Calculate action items count using shared utility
  const actionItemsCount = calculateActionItemsCount(profile)

  return (
    <DashboardLayout currentSection="profile" profile={profile} actionItemsCount={actionItemsCount}>
      <CleanProfilePage profile={profile} />
    </DashboardLayout>
  )
}
