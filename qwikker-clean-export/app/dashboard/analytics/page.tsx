import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'
import { AnalyticsPageClient } from '@/components/dashboard/analytics-page-client'

export default async function AnalyticsPage() {
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

  const actionItemsCount = calculateActionItemsCount(profile)

  return (
    <DashboardLayout currentSection="analytics" profile={profile} actionItemsCount={actionItemsCount}>
      <AnalyticsPageClient profile={profile} />
    </DashboardLayout>
  )
}
