import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ActionItemsPage } from '@/components/dashboard/action-items-page'
import { Profile } from '@/types/profiles'

export default async function DashboardActionItemsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', data.claims.sub)
    .single()

  if (profileError || !profileData) {
    console.error('Error fetching profile:', profileError)
    redirect('/onboarding')
  }

  const profile: Profile = profileData

  return (
    <DashboardLayout currentSection="action-items" profile={profile}>
      <ActionItemsPage profile={profile} />
    </DashboardLayout>
  )
}
