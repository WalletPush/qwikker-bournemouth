import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'
import { NotificationsPageClient } from '@/components/dashboard/notifications-page-client'

export default async function NotificationsPage() {
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

  // Get subscription data (for tier access control) - GET LATEST ONLY!
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
    .eq('business_id', profile?.id) // ✅ FIX: Use business profile ID, not user ID
    .order('updated_at', { ascending: false})
    .limit(1)
    .maybeSingle()

  // Add subscription to profile
  const enrichedProfile = {
    ...profile,
    subscription: subscription || null
  }

  const actionItemsCount = calculateActionItemsCount(enrichedProfile)

  return (
    <DashboardLayout currentSection="notifications" profile={enrichedProfile} actionItemsCount={actionItemsCount}>
      <NotificationsPageClient profile={enrichedProfile} />
    </DashboardLayout>
  )
}