import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventsPage } from '@/components/dashboard/events-page'

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

  return <EventsPage businessId={profile.id} businessName={profile.business_name} />
}

