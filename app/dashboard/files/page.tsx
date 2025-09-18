import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { FilesPage } from '@/components/dashboard/files-page'
import { Profile } from '@/types/profiles'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'

export default async function DashboardFilesPage() {
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
  const actionItemsCount = calculateActionItemsCount(profile)

  return (
    <DashboardLayout currentSection="files" profile={profile} actionItemsCount={actionItemsCount}>
      <FilesPage profile={profile} />
    </DashboardLayout>
  )
}
