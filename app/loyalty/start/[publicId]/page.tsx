import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'
import { redirect } from 'next/navigation'
import { StartPageUnauth } from '@/components/loyalty/start-page-unauth'

export const dynamic = 'force-dynamic'

interface StartPageProps {
  params: Promise<{ publicId: string }>
  searchParams: Promise<{ mode?: string; t?: string; wallet_pass_id?: string }>
}

export default async function LoyaltyStartPage({ params, searchParams }: StartPageProps) {
  const { publicId } = await params
  const { mode, t: token, wallet_pass_id: urlWalletPassId } = await searchParams

  if (!publicId) {
    return <StartError message="Invalid link." />
  }

  let city: string
  try {
    city = await getSafeCurrentCity()
  } catch {
    return <StartError message="Could not determine your location." />
  }

  const serviceRole = createServiceRoleClient()

  const { data: program } = await serviceRole
    .from('loyalty_programs')
    .select('id, public_id, program_name, reward_description, reward_threshold, stamp_label, status, business_profiles!inner(business_name, logo, city)')
    .eq('public_id', publicId)
    .single()

  if (!program) {
    return <StartError message="Loyalty program not found." />
  }

  const bp = (program as any).business_profiles
  if (bp.city !== city) {
    return <StartError message="This loyalty program is not available in your area." />
  }

  if (!['active', 'submitted'].includes(program.status)) {
    return <StartError message="This loyalty program is not currently active." />
  }

  const walletPassId = urlWalletPassId || await getWalletPassCookie()

  // --- Authenticated user ---
  if (walletPassId) {
    const wpParam = `wallet_pass_id=${encodeURIComponent(walletPassId)}`

    const { data: membership } = await serviceRole
      .from('loyalty_memberships')
      .select('id')
      .eq('program_id', program.id)
      .eq('user_wallet_pass_id', walletPassId)
      .single()

    if (!membership) {
      redirect(`/loyalty/join/${publicId}?${wpParam}`)
    }

    if (mode === 'earn' && token) {
      redirect(`/loyalty/earn/${publicId}?t=${encodeURIComponent(token)}&${wpParam}`)
    }

    redirect(`/user/rewards?${wpParam}`)
  }

  // --- Unauthenticated user ---
  const returnPath = mode === 'earn' && token
    ? `/loyalty/earn/${publicId}?t=${encodeURIComponent(token)}`
    : `/loyalty/join/${publicId}`

  const joinUrl = `/join?returnTo=${encodeURIComponent(returnPath)}`

  return (
    <StartPageUnauth
      publicId={publicId}
      joinUrl={joinUrl}
      businessName={bp.business_name || 'this business'}
      businessLogo={bp.logo}
      rewardThreshold={program.reward_threshold}
      stampLabel={program.stamp_label || 'stamps'}
      rewardDescription={program.reward_description}
      returnPath={returnPath}
    />
  )
}

function StartError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-white font-semibold text-lg mb-1">Something went wrong</p>
        <p className="text-zinc-400 text-sm">{message}</p>
      </div>
    </div>
  )
}
