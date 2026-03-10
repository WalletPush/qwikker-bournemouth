import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserDashboardHome } from '@/components/user/user-dashboard-home'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getCityDisplayName } from '@/lib/utils/city-detection'
import { buildHomeFeed } from '@/lib/home-feed/feed-builder'
import { getWalletPassCookie, setWalletPassCookie } from '@/lib/utils/wallet-session'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'QWIKKER',
  description: 'Discover amazing local businesses, exclusive offers, and secret menus',
}

interface UserDashboardPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function UserDashboardPage({ searchParams }: UserDashboardPageProps) {
  let currentCity: string
  let cityDisplayName: string
  try {
    currentCity = await getSafeCurrentCity()
    cityDisplayName = getCityDisplayName(currentCity as any)
  } catch (error) {
    console.error('Invalid franchise access:', error)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-slate-400">Invalid franchise location detected.</p>
        </div>
      </div>
    )
  }

  // Wallet pass authentication
  const resolvedSearchParams = await searchParams
  const urlWalletPassId = resolvedSearchParams.wallet_pass_id

  let cookieWalletPassId = null
  try {
    cookieWalletPassId = await getWalletPassCookie()
  } catch {
    // Safe to ignore
  }

  let walletPassId = urlWalletPassId || cookieWalletPassId || null

  if (urlWalletPassId && urlWalletPassId !== cookieWalletPassId) {
    try {
      await setWalletPassCookie(urlWalletPassId)
    } catch {
      // Safe to ignore
    }
  }

  // Validate user
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

  // Build the home feed (all ranking happens server-side)
  let feed = null
  try {
    feed = await buildHomeFeed({
      city: currentCity,
      walletPassId,
    })
  } catch (error) {
    console.error('[dashboard] Failed to build home feed:', error)
  }

  return (
    <UserDashboardLayout
      currentSection="dashboard"
      currentUser={currentUser}
      walletPassId={walletPassId}
      currentCity={currentCity}
      cityDisplayName={cityDisplayName}
    >
      <UserDashboardHome
        feed={feed}
        walletPassId={walletPassId}
        currentCity={currentCity}
        cityDisplayName={cityDisplayName}
        userName={currentUser?.name || 'Guest'}
      />
    </UserDashboardLayout>
  )
}
