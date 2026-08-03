import { Suspense } from 'react'
import { PartnersVerifyClient } from '@/components/partners/partners-verify-client'

export const metadata = {
  title: 'Verify email | Qwikker Territory Partners',
  robots: { index: false, follow: false },
}

export default function PartnersVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] text-[#8a8a8a] flex items-center justify-center">
          Verifying…
        </div>
      }
    >
      <PartnersVerifyClient />
    </Suspense>
  )
}
