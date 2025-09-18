import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ReferralsPage } from '@/components/dashboard/referrals-page'
import { Profile } from '@/types/profiles'

export default async function DashboardReferralsPage() {
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
    <DashboardLayout currentSection="referrals" profile={profile}>
      <ReferralsPage profile={profile} />
    </DashboardLayout>
  )
}
