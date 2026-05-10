import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'

/**
 * Shared layout for ALL /user/* pages.
 * Validates the wallet pass cookie against the database on every request.
 * If the cookie references a deleted/inactive pass, clears it and redirects to /join.
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
    // Stale cookie — pass was deleted or deactivated. Clear it and bounce to /join.
    const cookieStore = await cookies()
    cookieStore.delete('qwikker_wallet_pass_id')
    redirect('/join')
  }

  return <>{children}</>
}
