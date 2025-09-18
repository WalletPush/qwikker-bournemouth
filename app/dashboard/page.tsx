import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { DashboardHome } from '@/components/dashboard/dashboard-home'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  // Get user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', data.claims.sub)
    .single()

  // Calculate action items count (required fields for user dashboard)
  let actionItemsCount = 0
  if (profile) {
    if (!profile.business_name) actionItemsCount++
    if (!profile.business_hours) actionItemsCount++
    if (!profile.business_description) actionItemsCount++
    if (!profile.business_tagline) actionItemsCount++
    if (!profile.business_address || !profile.business_town) actionItemsCount++
    if (!profile.business_category) actionItemsCount++
    if (!profile.logo) actionItemsCount++
    if (!profile.business_images || (Array.isArray(profile.business_images) && profile.business_images.length === 0)) actionItemsCount++
    if (!profile.menu_url) actionItemsCount++ // Full menu upload (for AI)
    if (!profile.menu_preview || (Array.isArray(profile.menu_preview) && profile.menu_preview.length === 0)) actionItemsCount++ // Featured items (for display)
  }

  return (
    <DashboardLayout currentSection="dashboard" profile={profile} actionItemsCount={actionItemsCount}>
      <DashboardHome profile={profile} />
    </DashboardLayout>
  )
}
