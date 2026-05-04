'use client'

import { useState, useEffect } from 'react'

interface StripeConnectSectionProps {
  city: string
}

export function StripeConnectSection({ city }: StripeConnectSectionProps) {
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [stripeOnboarded, setStripeOnboarded] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe_success')) {
      setMessage({ type: 'success', text: 'Stripe account connected successfully!' })
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('stripe_pending')) {
      setMessage({ type: 'error', text: 'Stripe account linked but onboarding not complete. Please click "Connect with Stripe" to finish setup.' })
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('stripe_error')) {
      setMessage({ type: 'error', text: decodeURIComponent(params.get('stripe_error')!) })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    async function loadStripeStatus() {
      try {
        const res = await fetch(`/api/admin/setup?city=${city}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.config) {
            setStripeAccountId(data.config.stripe_account_id || null)
            setStripeOnboarded(data.config.stripe_onboarding_completed || false)
          }
        }
      } catch (err) {
        console.error('Failed to load Stripe status:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStripeStatus()
  }, [city])

  const handleConnect = async () => {
    setConnecting(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/billing/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city })
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to connect Stripe' })
        setConnecting(false)
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to initiate Stripe connection' })
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="border-2 border-slate-700/50 rounded-xl p-6 bg-slate-800/30 animate-pulse">
        <div className="h-12 bg-slate-700/50 rounded-lg w-1/3" />
      </div>
    )
  }

  return (
    <div className="border-2 border-slate-700/50 rounded-xl p-6 bg-slate-800/30">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-[#635BFF] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg">Payment Processing</h3>
          <p className="text-slate-400 text-sm">Connect your Stripe account to receive subscription payments from businesses</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-500/20 border border-green-500/30 text-green-400'
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {stripeAccountId && stripeOnboarded ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-green-400 font-semibold text-lg">Stripe Connected</p>
                <p className="text-slate-400 text-sm">Your account is ready to accept payments</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-xs uppercase tracking-wide">Account ID</p>
                <p className="text-slate-300 font-mono text-sm">{stripeAccountId}</p>
              </div>
            </div>
          </div>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Stripe Dashboard
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">
            Connect your Stripe account to accept subscription payments from businesses. Payments go directly to your account with no platform fees.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] hover:from-[#5851DB] hover:to-[#7C3AED] text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50"
          >
            {connecting ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                </svg>
                Connect with Stripe
              </>
            )}
          </button>
          <p className="text-center text-slate-500 text-xs">
            Don&apos;t have a Stripe account? You&apos;ll create one during the connection process.
          </p>
        </div>
      )}
    </div>
  )
}
