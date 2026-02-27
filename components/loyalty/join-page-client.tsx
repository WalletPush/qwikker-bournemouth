'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { StampGrid } from './stamp-grid'
import { STAMP_ICONS } from '@/lib/loyalty/loyalty-utils'
import type { StampIconKey } from '@/lib/loyalty/loyalty-utils'
import { Loader2, CheckCircle2, Gift, RefreshCw, QrCode, ArrowRight, Smartphone } from 'lucide-react'
import Link from 'next/link'

interface JoinPageClientProps {
  publicId: string
  walletPassId: string
  program: {
    program_name: string
    reward_description: string
    reward_threshold: number
    stamp_icon: string
    stamp_label: string
    earn_mode: string
    primary_color: string
    background_color: string
    earn_instructions: string | null
    logo_url: string | null
    business_name: string
    max_earns_per_day: number
    min_gap_minutes: number
  }
  prefill: {
    firstName: string
    lastName: string
    email: string
    hasDob: boolean
  }
}

type JoinState = 'form' | 'joining' | 'success' | 'already_member' | 'error'

export function JoinPageClient({ publicId, walletPassId, program, prefill }: JoinPageClientProps) {
  const [state, setState] = useState<JoinState>('form')
  const [firstName, setFirstName] = useState(prefill.firstName)
  const [lastName, setLastName] = useState(prefill.lastName)
  const [email, setEmail] = useState(prefill.email)
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [walletUrls, setWalletUrls] = useState<{ appleUrl: string | null; googleUrl: string | null }>({ appleUrl: null, googleUrl: null })
  const [hasWalletPass, setHasWalletPass] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetryPass = useCallback(async () => {
    setIsRetrying(true)
    try {
      const res = await fetch('/api/loyalty/retry-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId, walletPassId }),
      })
      const data = await res.json()
      if (data.appleUrl || data.googleUrl) {
        setWalletUrls({ appleUrl: data.appleUrl, googleUrl: data.googleUrl })
        setHasWalletPass(true)
      }
    } catch {} finally {
      setIsRetrying(false)
    }
  }, [publicId, walletPassId])

  const stampIconName = STAMP_ICONS[program.stamp_icon as StampIconKey]?.icon || 'Stamp'

  const earnModeBase = program.earn_mode === 'per_visit' ? '1 stamp per visit' : '1 stamp per purchase'
  const gapText = program.min_gap_minutes > 0 ? ` (min ${program.min_gap_minutes} min between stamps)` : ''
  const earnModeText = `${earnModeBase}${gapText}`

  const handleJoin = useCallback(async () => {
    setState('joining')

    try {
      const res = await fetch('/api/loyalty/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicId,
          walletPassId,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          email: email.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
        }),
      })

      const data = await res.json()

      if (res.status === 409 || data.alreadyMember) {
        setState('already_member')
        return
      }

      if (!res.ok) {
        setErrorMessage(data.error || 'Something went wrong')
        setState('error')
        return
      }

      setWalletUrls({ appleUrl: data.appleUrl, googleUrl: data.googleUrl })
      setHasWalletPass(data.hasWalletPass)
      setState('success')
    } catch {
      setErrorMessage('Connection failed. Please try again.')
      setState('error')
    }
  }, [publicId, walletPassId, firstName, lastName, email, dateOfBirth])

  return (
    <div className="min-h-screen bg-[#0b0f14] flex flex-col items-center px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        {program.logo_url && (
          <img src={program.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover bg-zinc-800" />
        )}
        <div>
          <p className="text-white font-semibold text-xl leading-tight">{program.business_name}</p>
          <p className="text-zinc-500 text-sm">{program.program_name}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Form state */}
        {(state === 'form' || state === 'joining') && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-sm w-full mt-6 space-y-6"
          >
            {/* How it works */}
            <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-4 h-4 text-emerald-400" />
                <p className="text-white text-sm font-medium">How it works</p>
              </div>
              <StampGrid
                stampIcon={stampIconName}
                filled={0}
                threshold={Math.min(program.reward_threshold, 12)}
                size={22}
                className="justify-center"
              />
              <p className="text-zinc-400 text-xs text-center">
                Collect {program.reward_threshold} {program.stamp_label.toLowerCase()} to earn{' '}
                <span className="text-emerald-400 font-medium">{program.reward_description}</span>
              </p>
              <p className="text-zinc-600 text-xs text-center">{earnModeText}</p>
            </div>

            {/* Mini form */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">First name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-white h-9 text-sm"
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Last name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-white h-9 text-sm"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700 text-white h-9 text-sm"
                  placeholder="your@email.com"
                />
              </div>

              {!prefill.hasDob && (
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">
                    Birthday <span className="text-zinc-600">(optional)</span>
                  </Label>
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-white h-9 text-sm"
                  />
                  <p className="text-zinc-600 text-xs">
                    Add your birthday for a special treat from {program.business_name}.
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={handleJoin}
              disabled={state === 'joining'}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-sm font-medium"
            >
              {state === 'joining' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Join & Start Earning
            </Button>
          </motion.div>
        )}

        {/* Success */}
        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-sm w-full mt-6 flex flex-col items-center gap-5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
            >
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </motion.div>

            <div className="text-center">
              <p className="text-white text-xl font-semibold">Welcome to {program.business_name}</p>
              <p className="text-zinc-400 text-sm mt-1">
                You&apos;ve joined the {program.program_name} loyalty program.
              </p>
            </div>

            {/* Stamp card preview */}
            <div className="w-full bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-white text-sm font-medium">Your stamp card</p>
              </div>
              <StampGrid
                stampIcon={stampIconName}
                filled={0}
                threshold={Math.min(program.reward_threshold, 12)}
                size={22}
                className="justify-center"
              />
              <p className="text-zinc-400 text-xs text-center">
                Collect {program.reward_threshold} {program.stamp_label.toLowerCase()} to earn{' '}
                <span className="text-emerald-400 font-medium">{program.reward_description}</span>
              </p>
            </div>

            {/* How to earn */}
            <div className="w-full bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 space-y-3">
              <p className="text-white text-sm font-medium">How to earn</p>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center shrink-0 mt-0.5">
                  <QrCode className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-zinc-300 text-sm">Scan the QR code at the till</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{earnModeText}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-zinc-300 text-sm">Or use the in-app scanner</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    Open your rewards page and tap &quot;Scan to Earn&quot;
                  </p>
                </div>
              </div>
              {program.earn_instructions && (
                <p className="text-zinc-500 text-xs border-t border-zinc-700/50 pt-2 mt-1">
                  {program.earn_instructions}
                </p>
              )}
            </div>

            {/* Wallet pass buttons */}
            {hasWalletPass && (walletUrls.appleUrl || walletUrls.googleUrl) && (
              <div className="flex flex-col gap-2 w-full">
                {walletUrls.appleUrl && (
                  <a
                    href={walletUrls.appleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-12 bg-black border border-zinc-700 rounded-xl text-white text-sm font-semibold hover:bg-zinc-900 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                    Add to Apple Wallet
                  </a>
                )}
                {walletUrls.googleUrl && (
                  <a
                    href={walletUrls.googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-12 bg-white border border-zinc-200 rounded-xl text-black text-sm font-semibold hover:bg-zinc-100 transition-colors"
                  >
                    Add to Google Wallet
                  </a>
                )}
              </div>
            )}

            {!hasWalletPass && (
              <div className="space-y-3 w-full">
                <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 text-center">
                  <p className="text-zinc-300 text-sm">
                    Your wallet pass is being set up.
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">
                    You can start earning right away by scanning the QR at {program.business_name}.
                  </p>
                </div>
                <button
                  onClick={handleRetryPass}
                  disabled={isRetrying}
                  className="w-full flex items-center justify-center gap-2 h-10 text-zinc-400 hover:text-white text-sm border border-zinc-800 hover:border-zinc-700 rounded-xl transition-colors"
                >
                  {isRetrying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Didn&apos;t get your pass? Tap to retry
                </button>
              </div>
            )}

            {/* View rewards CTA */}
            <Link
              href={`/user/rewards?wallet_pass_id=${encodeURIComponent(walletPassId)}`}
              className="w-full flex items-center justify-center gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              View my rewards
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}

        {/* Already member */}
        {state === 'already_member' && (
          <motion.div
            key="already"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-sm w-full mt-6 flex flex-col items-center gap-5"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>

            <div className="text-center">
              <p className="text-white text-xl font-semibold">You&apos;re already a member</p>
              <p className="text-zinc-400 text-sm mt-1">
                You&apos;re part of {program.business_name}&apos;s {program.program_name}.
              </p>
            </div>

            {/* Stamp card preview */}
            <div className="w-full bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-white text-sm font-medium">Your stamp card</p>
              </div>
              <StampGrid
                stampIcon={stampIconName}
                filled={0}
                threshold={Math.min(program.reward_threshold, 12)}
                size={22}
                className="justify-center"
              />
              <p className="text-zinc-400 text-xs text-center">
                Collect {program.reward_threshold} {program.stamp_label.toLowerCase()} to earn{' '}
                <span className="text-emerald-400 font-medium">{program.reward_description}</span>
              </p>
            </div>

            {/* How to earn */}
            <div className="w-full bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 space-y-3">
              <p className="text-white text-sm font-medium">How to earn</p>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center shrink-0 mt-0.5">
                  <QrCode className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-zinc-300 text-sm">Scan the QR code at the till</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{earnModeText}</p>
                </div>
              </div>
              {program.earn_instructions && (
                <p className="text-zinc-500 text-xs border-t border-zinc-700/50 pt-2 mt-1">
                  {program.earn_instructions}
                </p>
              )}
            </div>

            {/* Primary CTA */}
            <Link
              href={`/user/rewards?wallet_pass_id=${encodeURIComponent(walletPassId)}`}
              className="w-full flex items-center justify-center gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              View my rewards
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handleRetryPass}
              disabled={isRetrying}
              className="flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
            >
              {isRetrying ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Didn&apos;t get a wallet pass? Tap to retry
            </button>
          </motion.div>
        )}

        {/* Error */}
        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-sm w-full mt-8 flex flex-col items-center gap-5"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white text-lg font-semibold">Couldn&apos;t join</p>
              <p className="text-zinc-400 text-sm mt-1">{errorMessage}</p>
            </div>
            <Button
              onClick={() => setState('form')}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Try again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
