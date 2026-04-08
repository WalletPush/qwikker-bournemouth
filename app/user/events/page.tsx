import { createServiceRoleClient } from '@/lib/supabase/server'
import { UserEventsPage } from '@/components/user/user-events-page'
import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { getWalletPassCookie, setWalletPassCookie } from '@/lib/utils/wallet-session'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getCityDisplayName } from '@/lib/utils/city-detection'

export const dynamic = 'force-dynamic'

interface EventsPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function Events({ searchParams }: EventsPageProps) {
  let currentCity: string
  let cityDisplayName: string
  try {
    currentCity = await getSafeCurrentCity()
    cityDisplayName = getCityDisplayName(currentCity as any)
  } catch (error) {
    console.error('Invalid franchise access:', error)
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-slate-400">Invalid franchise location detected.</p>
        </div>
      </div>
    )
  }

  const resolvedSearchParams = await searchParams
  const urlWalletPassId = resolvedSearchParams.wallet_pass_id

  let cookieWalletPassId: string | null = null
  try {
    cookieWalletPassId = await getWalletPassCookie()
  } catch {}

  const walletPassId = urlWalletPassId || cookieWalletPassId || null

  if (urlWalletPassId && urlWalletPassId !== cookieWalletPassId) {
    try { await setWalletPassCookie(urlWalletPassId) } catch {}
  }

  const { user: validatedUser, isValid } = await getValidatedUser(walletPassId)

  let currentUser = null
  if (isValid && validatedUser) {
    currentUser = {
      id: validatedUser.id,
      wallet_pass_id: validatedUser.wallet_pass_id,
      name: validatedUser.name,
      email: validatedUser.email,
      city: validatedUser.city,
      tier: validatedUser.tier || 'explorer',
      level: validatedUser.level || 1,
    }
  } else {
    currentUser = {
      id: 'user-processing',
      wallet_pass_id: walletPassId,
      name: walletPassId ? 'New User' : 'Guest',
      email: null,
      city: currentCity,
      tier: 'explorer',
      level: 1,
    }
  }

  const supabase = createServiceRoleClient()

  const { data: eventsData } = await supabase
    .from('upcoming_events_with_business')
    .select('*')
    .eq('city', currentCity)
    .order('event_date', { ascending: true })

  const events = eventsData || []

  return (
    <UserDashboardLayout 
      currentSection="events" 
      currentUser={currentUser}
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

