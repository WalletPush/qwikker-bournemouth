import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { NotificationsPageClient } from '@/components/user/notifications-page-client'
import { createTenantAwareClient, getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getCityDisplayName } from '@/lib/utils/city-detection'
import { getWalletPassCookie, setWalletPassCookie } from '@/lib/utils/wallet-session'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'
import type { Metadata } from "next"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "QWIKKER - Notifications",
  description: "View your notification history from local businesses",
}

interface NotificationsPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
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

  // SECURITY: Use tenant-aware client
  let supabase
  try {
    supabase = await createTenantAwareClient()
  } catch (error) {
    const { createServiceRoleClient } = await import('@/lib/supabase/server')
    supabase = createServiceRoleClient()
  }
  
  // Wallet pass authentication
  const resolvedSearchParams = await searchParams
  const urlWalletPassId = resolvedSearchParams.wallet_pass_id
  
  let cookieWalletPassId = null
  try {
    cookieWalletPassId = await getWalletPassCookie()
  } catch (error) {
    // Cookie read error (safe to ignore)
  }
  
  let walletPassId = urlWalletPassId || cookieWalletPassId || null
  
  // Save to cookie if we got it from URL
  if (urlWalletPassId && urlWalletPassId !== cookieWalletPassId) {
    try {
      await setWalletPassCookie(urlWalletPassId)
    } catch (error) {
      // Ignore cookie errors
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
  }

  return (
    <UserDashboardLayout
      currentSection="notifications"
      currentUser={currentUser}
      walletPassId={walletPassId || undefined}
      currentCity={currentCity}
      cityDisplayName={cityDisplayName}
    >
      <NotificationsPageClient
        currentUser={currentUser}
        currentCity={currentCity}
        cityDisplayName={cityDisplayName}
      />
    </UserDashboardLayout>
  )
}
