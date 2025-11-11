import { createServiceRoleClient } from '@/lib/supabase/server'
import { UserEventsPage } from '@/components/user/user-events-page'
import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { cookies } from 'next/headers'

export default async function Events() {
  const supabase = createServiceRoleClient()
  
  // Get wallet pass ID from cookies
  const cookieStore = await cookies()
  const walletPassId = cookieStore.get('wallet_pass_id')?.value

  // Fetch upcoming approved events with business details
  const { data: eventsData, error } = await supabase
    .from('upcoming_events_with_business')
    .select('*')
    .order('event_date', { ascending: true })

  const events = eventsData || []
  
  // Get city from first event or default to Bournemouth
  const city = events[0]?.city || 'Bournemouth'

  return (
    <UserDashboardLayout currentSection="events" walletPassId={walletPassId}>
      <UserEventsPage events={events} walletPassId={walletPassId} city={city} />
    </UserDashboardLayout>
  )
}

