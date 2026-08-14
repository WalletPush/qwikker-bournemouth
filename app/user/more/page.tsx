import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserMorePage } from '@/components/user/user-more-page'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getCityDisplayName } from '@/lib/utils/city-detection'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'

export const dynamic = 'force-dynamic'

interface MorePageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function MorePage({ searchParams }: MorePageProps) {
  let currentCity: string
  let cityDisplayName: string
  try {
    currentCity = await getSafeCurrentCity()
    cityDisplayName = getCityDisplayName(currentCity as Parameters<typeof getCityDisplayName>[0])
  } catch (error) {
    console.error('❌ Invalid franchise access:', error)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-zinc-500">Invalid franchise location detected.</p>
        </div>
      </div>
    )
  }

  const resolvedSearchParams = await searchParams
  const urlWalletPassId = resolvedSearchParams.wallet_pass_id

  let cookieWalletPassId: string | null = null
  try {
    cookieWalletPassId = await getWalletPassCookie()
  } catch (error) {
    console.log('Cookie read error (safe to ignore):', error)
  }

  const walletPassId = urlWalletPassId || cookieWalletPassId || null

  const { createServiceRoleClient } = await import('@/lib/supabase/server')
  const supabase = createServiceRoleClient()

  let currentUser: {
    id: string
    wallet_pass_id: string | null
    name: string
    email: string
    city: string
  } | null = null
  let notifBadge = 0

  if (walletPassId) {
    try {
      const { data: user } = await supabase
        .from('app_users')
        .select('*')
        .eq('wallet_pass_id', walletPassId)
        .eq('wallet_pass_status', 'active')
        .eq('city', currentCity)
        .single()

      if (user) {
        currentUser = {
          id: user.id,
          wallet_pass_id: user.wallet_pass_id,
          name: user.name,
          email: user.email,
          city: user.city,
        }

        const { count } = await supabase
          .from('push_notification_recipients')
          .select('*', { count: 'exact', head: true })
          .eq('wallet_pass_id', walletPassId)
          .eq('status', 'sent')
          .is('read_at', null)

        notifBadge = count || 0
      }
    } catch {
      console.log('No user found for more page')
    }
  }

  if (!currentUser) {
    currentUser = {
      id: 'anonymous-user',
      wallet_pass_id: walletPassId,
      name: 'Qwikker User',
      email: 'user@qwikker.com',
      city: currentCity,
    }
  }

  return (
    <UserDashboardLayout
      currentSection="more"
      walletPassId={walletPassId || undefined}
      currentUser={currentUser}
      currentCity={currentCity}
      cityDisplayName={cityDisplayName}
    >
      <UserMorePage
        walletPassId={walletPassId}
        cityDisplayName={cityDisplayName}
        userName={currentUser.name}
        notifBadge={notifBadge}
      />
    </UserDashboardLayout>
  )
}
