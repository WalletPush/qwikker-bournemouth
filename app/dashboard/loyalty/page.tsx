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

  const actionItemsCount = calculateActionItemsCount(profile)

  return (
    <DashboardLayout currentSection="loyalty" profile={profile} actionItemsCount={actionItemsCount}>
      <LoyaltyPageClient profile={profile} />
    </DashboardLayout>
  )
}