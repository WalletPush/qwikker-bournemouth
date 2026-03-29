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
    .from('business_profiles')
    .select('*')
    .eq('user_id', data.claims.sub)
    .single()

  // Get subscription status to determine if truly in trial vs paid
  let isInFreeTrial = false
  let stripeSubscriptionId: string | null = null
  if (profile) {
    const { data: subscription } = await supabase
      .from('business_subscriptions')
      .select('is_in_free_trial, status, stripe_subscription_id')
      .eq('business_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    isInFreeTrial = subscription?.is_in_free_trial === true && !subscription?.stripe_subscription_id
    stripeSubscriptionId = subscription?.stripe_subscription_id || null
  }

  const actionItemsCount = calculateActionItemsCount(profile)

  return (
    <DashboardLayout currentSection="settings" profile={profile} actionItemsCount={actionItemsCount}>
      <SettingsPage profile={profile} isInFreeTrial={isInFreeTrial} stripeSubscriptionId={stripeSubscriptionId} />
    </DashboardLayout>
  )
}
