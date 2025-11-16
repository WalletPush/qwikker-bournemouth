import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'
import { ProfilePreviewPage } from '@/components/dashboard/profile-preview-page'

export default async function DashboardProfilePreviewPage() {
  const supabase = await createClient()

  const { data: claimsResult, error: claimsError } = await supabase.auth.getClaims()
  if (claimsError || !claimsResult?.claims) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('business_profiles')
    .select(`
      *,
      business_offers (
        id,
        offer_name,
        offer_type,
        offer_value,
        offer_terms,
        offer_start_date,
        offer_end_date,
        offer_image,
        status
      )
    `)
    .eq('user_id', claimsResult.claims.sub)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  const actionItemsCount = calculateActionItemsCount(profile)

  return (
    <DashboardLayout currentSection="profile" profile={profile} actionItemsCount={actionItemsCount}>
      <ProfilePreviewPage profile={profile} />
    </DashboardLayout>
  )
}
