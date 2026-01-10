import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { OffersPage } from '@/components/dashboard/offers-page'
import { LockedFeaturePage } from '@/components/dashboard/locked-feature-page'
import { Profile } from '@/types/profiles'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'

export default async function DashboardOffersPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  const { data: profileData, error: profileError } = await supabase
    .from('business_profiles')
    .select(`
      *,
      business_offers!business_id (
        id,
        offer_name,
        offer_type,
        offer_value,
        offer_claim_amount,
        offer_terms,
        offer_start_date,
        offer_end_date,
        offer_image,
        status,
        display_order,
        created_at
      )
    `)
    .eq('user_id', data.claims.sub)
    .single()

  if (profileError || !profileData) {
    console.error('Error fetching profile:', profileError)
    redirect('/onboarding')
  }

  // Get the plan from profiles table
  const { data: profilePlan } = await supabase
    .from('profiles')
    .select('plan')
    .eq('user_id', data.claims.sub)
    .single()

  // Add plan to profile data
  const profile: Profile = {
    ...profileData,
    plan: profilePlan?.plan || 'starter'
  }
  const actionItemsCount = calculateActionItemsCount(profile)

  // 🔒 CRITICAL: Check if claimed_free status - show locked page
  if (profileData.status === 'claimed_free') {
    return (
      <DashboardLayout currentSection="offers" profile={profile} actionItemsCount={actionItemsCount}>
        <LockedFeaturePage 
          featureName="Exclusive Offers" 
          description="Create and manage limited-time offers to attract new customers. Track redemptions, set expiry dates, and boost engagement with exclusive deals."
          benefits={[
            'Create unlimited offers with custom expiry dates',
            'Track redemptions and engagement in real-time',
            'Appear in AI-powered recommendations',
            'Boost visibility with exclusive deals'
          ]}
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout currentSection="offers" profile={profile} actionItemsCount={actionItemsCount}>
      <OffersPage profile={profile} />
    </DashboardLayout>
  )
}
