import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ImprovedDashboardHome } from '@/components/dashboard/improved-dashboard-home'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  // Get user profile data with business offers
  const { data: profile } = await supabase
    .from('business_profiles')
    .select(`
      *,
      business_offers!left(
        id,
        offer_name,
        offer_type,
        offer_value,
        offer_image,
        offer_end_date,
        status,
        created_at,
        approved_at
      )
    `)
    .eq('user_id', data.claims.sub)
    .single()

  // Get subscription data (for accurate tier and trial info) - GET LATEST ONLY!
  const { data: subscription, error: subError } = await supabase
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
    .order('updated_at', { ascending: false }) // GET LATEST SUBSCRIPTION
    .limit(1)
    .maybeSingle() // Use maybeSingle to handle no subscriptions gracefully

  // Get approved menus count for this business
  const { count: approvedMenusCount } = await supabase
    .from('menus')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', profile?.id)
    .eq('status', 'approved')

  // Add menus count and subscription to profile for action items logic
  const enrichedProfile = {
    ...profile,
    approved_menus_count: approvedMenusCount || 0,
    subscription: subscription || null
  }

  // Calculate action items count using shared utility
  const actionItemsCount = calculateActionItemsCount(enrichedProfile)

  return (
    <DashboardLayout currentSection="dashboard" profile={enrichedProfile} actionItemsCount={actionItemsCount}>
      <ImprovedDashboardHome profile={enrichedProfile} />
    </DashboardLayout>
  )
}
