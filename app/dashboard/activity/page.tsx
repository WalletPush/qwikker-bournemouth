import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'
import { ActivityPage } from '@/components/dashboard/activity-page'

export default async function DashboardActivityPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', data.claims.sub)
    .single()

  const { data: subscription } = await supabase
    .from('business_subscriptions')
    .select(`
      *,
      subscription_tiers (
        id,
        tier_name,
        tier_display_name,
        features
      )
    `)
    .eq('business_id', profile?.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const enrichedProfile = {
    ...profile,
    subscription: subscription || null,
  }

  const actionItemsCount = calculateActionItemsCount(enrichedProfile)

  return (
    <DashboardLayout currentSection="activity" profile={enrichedProfile} actionItemsCount={actionItemsCount}>
      <ActivityPage />
    </DashboardLayout>
  )
}
