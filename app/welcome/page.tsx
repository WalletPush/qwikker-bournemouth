import { Suspense } from 'react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { WelcomePageContent } from '@/components/welcome/welcome-page-content'
import { getCityFromHostname, getCityDisplayName } from '@/lib/utils/city-detection'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const city = await getCityFromHostname(host, { allowUnsafeFallbacks: true })
  const cityName = getCityDisplayName(city)
  return {
    title: 'Welcome to Qwikker - Start Saving Today!',
    description: `Welcome to Qwikker! Discover exclusive offers, secret menus, and amazing local businesses in ${cityName}.`,
  }
}

interface WelcomePageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
    name?: string
    returnTo?: string
  }>
}

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const resolvedSearchParams = await searchParams
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading your welcome experience...</div>
      </div>
    }>
      <WelcomePageContent searchParams={resolvedSearchParams} />
    </Suspense>
  )
}
