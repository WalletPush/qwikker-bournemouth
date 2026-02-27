import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'
import { redirect } from 'next/navigation'
import { JoinPageClient } from '@/components/loyalty/join-page-client'

export const dynamic = 'force-dynamic'

interface JoinPageProps {
  params: Promise<{ publicId: string }>
  searchParams: Promise<{ wallet_pass_id?: string }>
}

export default async function JoinPage({ params, searchParams }: JoinPageProps) {
  const { publicId } = await params
  const { wallet_pass_id: urlWalletPassId } = await searchParams

  if (!publicId) {
    return <JoinError message="Invalid link." />
  }

  let city: string
  try {
    city = await getSafeCurrentCity()
  } catch {
    return <JoinError message="Could not determine your location." />
  }

  const walletPassId = urlWalletPassId || await getWalletPassCookie()

  if (!walletPassId) {
    redirect(`/loyalty/start/${publicId}`)
  }

  const serviceRole = createServiceRoleClient()

  const { data: program } = await serviceRole
    .from('loyalty_programs')
    .select('*, business_profiles!inner(business_name, logo)')
    .eq('public_id', publicId)
    .eq('city', city)
    .in('status', ['active', 'submitted'])
    .single()

  if (!program) {
    return <JoinError message="Loyalty program not found." />
  }

  const businessName = (program as any).business_profiles?.business_name || 'this business'
  const businessLogo = (program as any).business_profiles?.logo || program.logo_url

  // Pre-fill user data from app_users
  const { data: appUser } = await serviceRole
    .from('app_users')
    .select('first_name, last_name, name, email, date_of_birth')
    .eq('wallet_pass_id', walletPassId)
    .single()

  // Fallback: if last_name is null, extract from the combined name field
  let prefillLastName = appUser?.last_name || ''
  if (!prefillLastName && appUser?.name && appUser?.first_name) {
    const remainder = appUser.name.replace(appUser.first_name, '').trim()
    if (remainder) prefillLastName = remainder
  }

  return (
    <JoinPageClient
      publicId={publicId}
      walletPassId={walletPassId}
      program={{
        program_name: program.program_name,
        reward_description: program.reward_description,
        reward_threshold: program.reward_threshold,
        stamp_icon: program.stamp_icon || 'stamp',
        stamp_label: program.stamp_label || 'stamps',
        earn_mode: program.earn_mode || 'per_visit',
        primary_color: program.primary_color || '#00d083',
        background_color: program.background_color || '#0b0f14',
        earn_instructions: program.earn_instructions,
        logo_url: businessLogo,
        business_name: businessName,
        max_earns_per_day: program.max_earns_per_day,
        min_gap_minutes: program.min_gap_minutes,
      }}
      prefill={{
        firstName: appUser?.first_name || '',
        lastName: prefillLastName,
        email: appUser?.email || '',
        hasDob: !!appUser?.date_of_birth,
      }}
    />
  )
}

function JoinError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-white font-semibold text-lg mb-1">Can&apos;t join right now</p>
        <p className="text-zinc-400 text-sm">{message}</p>
      </div>
    </div>
  )
}
