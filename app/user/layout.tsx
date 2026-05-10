import { redirect } from 'next/navigation'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'

/**
 * Shared layout for ALL /user/* pages.
 * Validates the wallet pass cookie against the database on every request.
 * If the cookie references a deleted/inactive pass, redirects to a small
 * API route that clears the stale cookie then bounces to /join.
 * The middleware already gates on cookie *existence*; this layer gates on *validity*.
 */
export default async function UserLayout({ children }: { children: React.ReactNode }) {
  let walletPassId: string | null = null

  try {
    walletPassId = await getWalletPassCookie()
  } catch {
    // Cookie read error
  }

  if (!walletPassId) {
    redirect('/join')
  }

  const { isValid } = await getValidatedUser(walletPassId)

  if (!isValid) {
    // Stale cookie — can't delete in a Server Component, so redirect through
    // an API route that clears the cookie then bounces to /join.
    redirect('/api/auth/clear-wallet-pass')
  }

  return <>{children}</>
}
