import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { SocialWizardPageClient } from '@/components/dashboard/social-wizard-page-client'
import { Profile } from '@/types/profiles'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'

export default async function SocialWizardRoute() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  const { data: profileData, error: profileError } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', data.claims.sub)
    .single()

  if (profileError || !profileData) {
    console.error('Error fetching profile:', profileError)
    redirect('/onboarding')
  }

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
    .eq('business_id', profileData?.id) // ✅ FIX: Use business profile ID, not user ID
    .single()

  // Get approved menus count for action items
  const { count: approvedMenusCount } = await supabase
    .from('menus')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', profileData?.id)
    .eq('status', 'approved')

  const profile: Profile = {
    ...profileData,
    approved_menus_count: approvedMenusCount || 0,
    subscription: subscription || null
  }
  
  const actionItemsCount = calculateActionItemsCount(profile)

  return (
    <DashboardLayout currentSection="social-wizard" profile={profile} actionItemsCount={actionItemsCount}>
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-slate-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Social Wizard</h1>
        <p className="text-slate-400 mb-2">Coming Soon</p>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          AI-powered social content generation is being rebuilt from the ground up. 
          Create branded posts for Instagram, Facebook, and more — all matched to your business.
        </p>
      </div>
    </DashboardLayout>
  )
}

