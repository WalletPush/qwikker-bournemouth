'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { commercialCopy } from '@/lib/partners/commercial-copy'
import { trackPartnersEvent } from '@/lib/partners/analytics'

const LOGO_URL =
  'https://res.cloudinary.com/dsh32kke7/image/upload/f_png,q_auto,w_320/v1768348190/Qwikker_Logo_web_lbql19.svg'

export function PartnersVerifyClient() {
  const params = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [cityName, setCityName] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage('Invalid or expired link')
      return
    }

    let cancelled = false
    fetch(`/api/partners/verify?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json()
        if (cancelled) return
        if (!r.ok) {
          setState('error')
          setMessage(data.error || 'Invalid or expired link')
          return
        }
        setCityName(data.city_name || '')
        setState('ok')
        trackPartnersEvent('partners_email_verified')
      })
      .catch(() => {
        if (!cancelled) {
          setState('error')
          setMessage('Something went wrong. Please try again.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center px-6">
      <img src={LOGO_URL} alt="QWIKKER" className="h-8 mb-10 opacity-90" />
      {state === 'loading' && <p className="text-[#8a8a8a]">Verifying your email…</p>}
      {state === 'ok' && (
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Email verified</h1>
          <p className="text-[#8a8a8a] leading-relaxed">
            {cityName ? (
              <>
                Your enquiry for <span className="text-white">{cityName}</span> is with our team.
              </>
            ) : (
              <>Your enquiry is with our team.</>
            )}
          </p>
          <p className="text-sm text-[#5c5c5c] leading-relaxed">{commercialCopy.slaReviewCopy}</p>
          <a
            href="/partners"
            className="inline-flex mt-4 rounded-lg bg-[#00C46A] px-5 py-2.5 text-sm font-semibold text-[#050505] hover:bg-[#00d878] transition-colors"
          >
            Back to partners
          </a>
        </div>
      )}
      {state === 'error' && (
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Unable to verify</h1>
          <p className="text-[#8a8a8a]">{message}</p>
          <a href="/partners#reserve" className="text-[#00C46A] text-sm hover:underline">
            Return to reserve form
          </a>
        </div>
      )}
    </div>
  )
}
