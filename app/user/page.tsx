import { redirect } from 'next/navigation'
import type { Metadata } from "next"
import { headers } from 'next/headers'
import { getCityFromHostname, getCityDisplayName } from '@/lib/utils/city-detection'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const city = await getCityFromHostname(host, { allowUnsafeFallbacks: true })
  const cityName = getCityDisplayName(city)
  return {
    title: "QWIKKER - User Dashboard",
    description: `Discover amazing local businesses, exclusive offers, and secret menus in ${cityName}`,
  }
}

interface UserPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

// Redirect /user to /user/dashboard with wallet_pass_id preserved
export default async function UserPage({ searchParams }: UserPageProps) {
  const resolvedSearchParams = await searchParams
  const walletPassId = resolvedSearchParams.wallet_pass_id
  
  if (walletPassId) {
    redirect(`/user/dashboard?wallet_pass_id=${walletPassId}`)
  } else {
    redirect('/user/dashboard')
  }
}
