'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, ArrowRight } from 'lucide-react'

interface StartPageUnauthProps {
  publicId: string
  joinUrl: string
  businessName: string
  businessLogo: string | null
  rewardThreshold: number
  stampLabel: string
  rewardDescription: string
  /** Full URL path to redirect to after identification, e.g. /loyalty/join/xxx or /loyalty/earn/xxx?t=... */
  returnPath: string
}

export function StartPageUnauth({
  publicId,
  joinUrl,
  businessName,
  businessLogo,
  rewardThreshold,
  stampLabel,
  rewardDescription,
  returnPath,
}: StartPageUnauthProps) {
  const router = useRouter()
  const [showLookup, setShowLookup] = useState(false)
  const [email, setEmail] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setIsChecking(true)
    setError(null)

    try {
      const res = await fetch('/api/loyalty/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()

      if (data.found && data.walletPassId) {
        const sep = returnPath.includes('?') ? '&' : '?'
        router.push(`${returnPath}${sep}wallet_pass_id=${encodeURIComponent(data.walletPassId)}`)
      } else {
        setError('No Qwikker Pass found with that email. You can install one below.')
      }
    } catch {
      setError('Connection failed. Please try again.')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] flex flex-col items-center justify-center px-4 py-10">
      <div className="max-w-sm w-full flex flex-col items-center gap-6">
        {businessLogo && (
          <img src={businessLogo} alt="" className="w-16 h-16 rounded-2xl object-cover bg-zinc-800" />
        )}

        <div className="text-center">
          <h1 className="text-white text-2xl font-bold">
            Get {businessName} Rewards
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            Collect {rewardThreshold} {stampLabel?.toLowerCase() || 'stamps'} to earn{' '}
            <span className="text-emerald-400 font-medium">{rewardDescription}</span>
          </p>
        </div>

        {/* Already have a pass - email lookup */}
        {!showLookup ? (
          <button
            onClick={() => setShowLookup(true)}
            className="w-full flex items-center justify-center gap-2 h-12 bg-white text-zinc-900 font-semibold rounded-xl transition-colors text-sm hover:bg-zinc-100"
          >
            <Mail className="w-4 h-4" />
            I already have a Qwikker Pass
          </button>
        ) : (
          <form onSubmit={handleLookup} className="w-full space-y-3">
            <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 space-y-3">
              <p className="text-zinc-300 text-sm font-medium">
                Enter the email linked to your Qwikker Pass
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoFocus
                autoComplete="email"
                className="w-full h-11 px-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              {error && (
                <p className="text-amber-400 text-xs">{error}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isChecking || !email.trim()}
              className="w-full flex items-center justify-center gap-2 h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {isChecking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-zinc-600 text-xs">or</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Install fresh */}
        <div className="w-full space-y-3">
          <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 text-center">
            <p className="text-zinc-300 text-sm">
              New here? Install the free Qwikker Pass first, then you&apos;ll be brought straight back.
            </p>
          </div>

          <Link
            href={joinUrl}
            className="w-full flex items-center justify-center h-12 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors text-sm border border-zinc-700"
          >
            Install Qwikker Pass
          </Link>

          <p className="text-zinc-600 text-xs text-center">No app required. Takes 10 seconds.</p>
        </div>
      </div>
    </div>
  )
}
