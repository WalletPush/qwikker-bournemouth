import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventsPage } from '@/components/dashboard/events-page'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { LockedFeaturePage } from '@/components/dashboard/locked-feature-page'

export default async function Events() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get business profile
  const { data: profile, error } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !profile) {
    redirect('/onboarding')
  }

  // 🔒 CRITICAL: Check if claimed_free status - show locked page
  if (profile.status === 'claimed_free') {
    return (
      <DashboardLayout currentSection="events" profile={profile}>
        <LockedFeaturePage 
          featureName="Events" 
          description="Promote upcoming events and build community engagement. Share special nights, live music, themed events, and more with your customers."
          benefits={[
            'Create and promote unlimited events',
            'Add event details, dates, and ticketing info',
            'Increase foot traffic with event visibility',
            'Engage customers with community experiences'
          ]}
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout currentSection="events" profile={profile}>
      <EventsPage businessId={profile.id} businessName={profile.business_name} />
    </DashboardLayout>
  )
}

