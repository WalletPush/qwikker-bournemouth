import { Suspense } from 'react'
import { WaitingForPassContent } from '@/components/waiting-for-pass/waiting-for-pass-content'

export const metadata = {
  title: 'Creating Your Wallet Pass - Qwikker',
  description: 'Please wait while we create your personalized Qwikker wallet pass.',
}

interface WaitingForPassPageProps {
  searchParams: Promise<{
    email?: string
    name?: string
  }>
}

export default async function WaitingForPassPage({ searchParams }: WaitingForPassPageProps) {
  const resolvedSearchParams = await searchParams
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    }>
      <WaitingForPassContent searchParams={resolvedSearchParams} />
    </Suspense>
  )
}
