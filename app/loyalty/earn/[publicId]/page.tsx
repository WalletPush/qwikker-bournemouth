import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'
import { redirect } from 'next/navigation'
import { EarnPageClient } from '@/components/loyalty/earn-page-client'

export const dynamic = 'force-dynamic'

interface EarnPageProps {
  params: Promise<{ publicId: string }>
  searchParams: Promise<{ t?: string }>
}

export default async function EarnPage({ params, searchParams }: EarnPageProps) {
  const { publicId } = await params
  const { t: token } = await searchParams

  if (!publicId) {
    return <EarnError message="Invalid link." />
  }

  if (!token) {
    return <EarnError message="Missing QR token. Please scan the QR code at the till." />
  }

  let city: string
  try {
    city = await getSafeCurrentCity()
  } catch {
    return <EarnError message="Could not determine your location." />
  }

  const walletPassId = await getWalletPassCookie()

  if (!walletPassId) {
    redirect(`/loyalty/start/${publicId}?mode=earn&t=${encodeURIComponent(token)}`)
  }

  const serviceRole = createServiceRoleClient()

  const { data: program } = await serviceRole
    .from('loyalty_programs')
    .select('*, business_profiles!inner(business_name, logo)')
    .eq('public_id', publicId)
    .eq('city', city)
    .single()

  if (!program) {
    return <EarnError message="Loyalty program not found." />
  }

  if (program.status !== 'active') {
    return <EarnError message="This loyalty program is not currently active." />
  }

  const businessName = (program as any).business_profiles?.business_name || 'this business'
  const businessLogo = (program as any).business_profiles?.logo || program.logo_url

  return (
    <EarnPageClient
      publicId={publicId}
      token={token}
      walletPassId={walletPassId}
      program={{
        program_name: program.program_name,
        reward_description: program.reward_description,
        reward_threshold: program.reward_threshold,
        stamp_icon: program.stamp_icon || 'stamp',
        stamp_label: program.stamp_label || 'stamps',
        primary_color: program.primary_color || '#00d083',
        background_color: program.background_color || '#0b0f14',
        earn_instructions: program.earn_instructions,
        logo_url: businessLogo,
        business_name: businessName,
      }}
    />
  )
}

function EarnError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-white font-semibold text-lg mb-1">Can&apos;t earn right now</p>
        <p className="text-zinc-400 text-sm">{message}</p>
      </div>
    </div>
  )
}
