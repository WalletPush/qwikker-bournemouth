import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { SecretMenuPage } from '@/components/dashboard/secret-menu-page'
import { Profile } from '@/types/profiles'

export default async function DashboardSecretMenuPage() {
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
    <DashboardLayout currentSection="secret-menu" profile={profile}>
      <SecretMenuPage profile={profile} />
    </DashboardLayout>
  )
}
