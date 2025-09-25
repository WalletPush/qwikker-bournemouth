import { Suspense } from 'react'
import { VerifyPassContent } from '@/components/verify-pass/verify-pass-content'

export const metadata = {
  title: 'Verify Your Wallet Pass - Qwikker',
  description: 'Complete your Qwikker setup by installing your wallet pass.',
}

interface VerifyPassPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
    name?: string
    email?: string
  }>
}

export default async function VerifyPassPage({ searchParams }: VerifyPassPageProps) {
  const resolvedSearchParams = await searchParams
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading verification...</div>
      </div>
    }>
      <VerifyPassContent searchParams={resolvedSearchParams} />
    </Suspense>
  )
}
