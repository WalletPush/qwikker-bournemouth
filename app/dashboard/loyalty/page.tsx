import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'
import { LoyaltyPageClient } from '@/components/dashboard/loyalty-page-client'

export default async function LoyaltyPage() {
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

  // Get subscription data (for tier access control)
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
    .eq('business_id', data.claims.sub)
    .single()

  // Add subscription to profile
  const enrichedProfile = {
    ...profile,
    subscription: subscription || null
  }

  const actionItemsCount = calculateActionItemsCount(enrichedProfile)

  return (
    <DashboardLayout currentSection="loyalty" profile={enrichedProfile} actionItemsCount={actionItemsCount}>
      <LoyaltyPageClient profile={enrichedProfile} />
    </DashboardLayout>
  )
}