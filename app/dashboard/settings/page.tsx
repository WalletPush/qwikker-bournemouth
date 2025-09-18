import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { SettingsPage } from '@/components/dashboard/settings-page'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'

export default async function Settings() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  // Get user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', data.claims.sub)
    .single()

  const actionItemsCount = calculateActionItemsCount(profile)

  return (
    <DashboardLayout currentSection="settings" profile={profile} actionItemsCount={actionItemsCount}>
      <SettingsPage profile={profile} />
    </DashboardLayout>
  )
}
