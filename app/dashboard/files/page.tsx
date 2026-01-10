import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { FilesPage } from '@/components/dashboard/files-page'
import { LockedFeaturePage } from '@/components/dashboard/locked-feature-page'
import { Profile } from '@/types/profiles'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'

export default async function DashboardFilesPage() {
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

  const profile: Profile = profileData
  const actionItemsCount = calculateActionItemsCount(profile)

  // 🔒 CRITICAL: Check if claimed_free status - show locked page
  if (profileData.status === 'claimed_free') {
    return (
      <DashboardLayout currentSection="files" profile={profile} actionItemsCount={actionItemsCount}>
        <LockedFeaturePage 
          featureName="Files & Menus" 
          description="Let customers find you based on what they're craving. Upload your full menu and our AI will recommend your specific dishes and items based on exactly what customers are looking for."
          benefits={[
            'Upload unlimited menus and photos',
            'AI learns your entire menu catalog',
            'Smart recommendations for specific items',
            'Customers discover you through menu search',
            'Keep content fresh and up-to-date'
          ]}
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout currentSection="files" profile={profile} actionItemsCount={actionItemsCount}>
      <FilesPage profile={profile} />
    </DashboardLayout>
  )
}
