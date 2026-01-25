import { createServiceRoleClient } from '@/lib/supabase/server'
import { UserEventsPage } from '@/components/user/user-events-page'
import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { cookies } from 'next/headers'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getCityDisplayName } from '@/lib/utils/city-detection'

export default async function Events() {
  // SECURITY: Validate franchise first
  let currentCity: string
  let cityDisplayName: string
  try {
    currentCity = await getSafeCurrentCity()
    cityDisplayName = getCityDisplayName(currentCity as any)
  } catch (error) {
    console.error('❌ Invalid franchise access:', error)
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-slate-400">Invalid franchise location detected.</p>
        </div>
      </div>
    )
  }

  const supabase = createServiceRoleClient()
  
  // Get wallet pass ID from cookies
  const cookieStore = await cookies()
  const walletPassId = cookieStore.get('wallet_pass_id')?.value

  // Fetch upcoming approved events with business details - FILTERED by current city
  const { data: eventsData, error } = await supabase
    .from('upcoming_events_with_business')
    .select('*')
    .eq('city', currentCity) // Filter by franchise city
    .order('event_date', { ascending: true })

  const events = eventsData || []

  return (
    <UserDashboardLayout 
      currentSection="events" 
      walletPassId={walletPassId}
      currentCity={currentCity}
      cityDisplayName={cityDisplayName}
    >
      <UserEventsPage 
        events={events} 
        walletPassId={walletPassId} 
        city={cityDisplayName} 
      />
    </UserDashboardLayout>
  )
}

