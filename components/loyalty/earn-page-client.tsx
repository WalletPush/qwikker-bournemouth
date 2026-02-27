'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StampGrid } from './stamp-grid'
import { STAMP_ICONS } from '@/lib/loyalty/loyalty-utils'
import type { StampIconKey } from '@/lib/loyalty/loyalty-utils'
import { Loader2, Clock, PartyPopper, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface EarnPageClientProps {
  publicId: string
  token: string
  walletPassId: string
  program: {
    program_name: string
    reward_description: string
    reward_threshold: number
    stamp_icon: string
    stamp_label: string
    primary_color: string
    background_color: string
    earn_instructions: string | null
    logo_url: string | null
    business_name: string
  }
}

type EarnState = 'loading' | 'success' | 'cooldown' | 'reward' | 'error'

export function EarnPageClient({ publicId, token, walletPassId, program }: EarnPageClientProps) {
  const [state, setState] = useState<EarnState>('loading')
  const [balance, setBalance] = useState(0)
  const [proximityMessage, setProximityMessage] = useState<string | null>(null)
  const [nextEligibleAt, setNextEligibleAt] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [countdown, setCountdown] = useState('')
  const hasFired = useRef(false)

  const stampIconName = STAMP_ICONS[program.stamp_icon as StampIconKey]?.icon || 'Stamp'
  const animateIndex = state === 'success' || state === 'reward' ? balance - 1 : null

  const callEarn = useCallback(async () => {
    try {
      const res = await fetch('/api/loyalty/earn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId, token, walletPassId }),
      })

      const data = await res.json()

      if (!res.ok && res.status !== 200) {
        if (data.reason === 'cooldown') {
          setBalance(data.newBalance ?? 0)
          setNextEligibleAt(data.nextEligibleAt ?? null)
          setErrorMessage(data.error || null)
          setState('cooldown')
          return
        }
        setErrorMessage(data.error || 'Something went wrong')
        setState('error')
        return
      }

      if (data.success === false && data.reason === 'cooldown') {
        setBalance(data.newBalance ?? 0)
        setNextEligibleAt(data.nextEligibleAt ?? null)
        setErrorMessage(data.error || null)
        setState('cooldown')
        return
      }

      setBalance(data.newBalance)
      setProximityMessage(data.proximityMessage)
      setNextEligibleAt(data.nextEligibleAt)

      if (data.rewardUnlocked) {
        setState('reward')
      } else {
        setState('success')
      }
    } catch {
      setErrorMessage('Connection failed. Please try again.')
      setState('error')
    }
  }, [publicId, token, walletPassId])

  useEffect(() => {
    if (!hasFired.current) {
      hasFired.current = true
      callEarn()
    }
  }, [callEarn])

  // Countdown timer for cooldown state
  useEffect(() => {
    if (state !== 'cooldown' || !nextEligibleAt) return

    const tick = () => {
      const diff = new Date(nextEligibleAt).getTime() - Date.now()
      if (diff <= 0) {
        setCountdown('Eligible now')
        return
      }
      const hours = Math.floor(diff / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      if (hours > 0) {
        setCountdown(`${hours}h ${mins.toString().padStart(2, '0')}m`)
      } else {
        setCountdown(`${mins}m ${secs.toString().padStart(2, '0')}s`)
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [state, nextEligibleAt])

  return (
    <div className="min-h-screen bg-[#0b0f14] flex flex-col items-center justify-center px-4 py-8">
      {/* Business header */}
      <div className="flex items-center gap-3 mb-8">
        {program.logo_url && (
          <img
            src={program.logo_url}
            alt=""
            className="w-10 h-10 rounded-lg object-cover bg-zinc-800"
          />
        )}
        <div>
          <p className="text-white font-semibold text-lg leading-tight">{program.business_name}</p>
          <p className="text-zinc-500 text-xs">{program.program_name}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Loading */}
        {state === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-zinc-400 text-sm">Recording your stamp...</p>
          </motion.div>
        )}

        {/* Success */}
        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 max-w-sm w-full"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
              className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
            >
              <span className="text-3xl text-emerald-400 font-bold">+1</span>
            </motion.div>

            <div className="text-center">
              <p className="text-white text-xl font-semibold">Stamp earned</p>
              <p className="text-zinc-400 text-sm mt-1">
                {balance} / {program.reward_threshold} {program.stamp_label.toLowerCase()}
              </p>
            </div>

            <StampGrid
              stampIcon={stampIconName}
              filled={balance}
              threshold={program.reward_threshold}
              animateIndex={animateIndex}
              size={32}
              className="justify-center"
            />

            {proximityMessage && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-emerald-400 text-sm font-medium"
              >
                {proximityMessage}
              </motion.p>
            )}

            {program.earn_instructions && (
              <p className="text-zinc-600 text-xs text-center mt-2">
                {program.earn_instructions}
              </p>
            )}

            <Link
              href={`/user/rewards?wallet_pass_id=${encodeURIComponent(walletPassId)}`}
              className="mt-2 w-full flex items-center justify-center gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              View my rewards
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}

        {/* Reward unlocked */}
        {state === 'reward' && (
          <motion.div
            key="reward"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 max-w-sm w-full"
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 250, damping: 12 }}
              className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center"
            >
              <PartyPopper className="w-10 h-10 text-emerald-400" />
            </motion.div>

            <div className="text-center">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-emerald-400 text-2xl font-bold"
              >
                Reward unlocked
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white text-lg mt-2"
              >
                {program.reward_description}
              </motion.p>
            </div>

            <StampGrid
              stampIcon={stampIconName}
              filled={balance}
              threshold={program.reward_threshold}
              animateIndex={animateIndex}
              size={32}
              className="justify-center"
            />

            <Link
              href={`/user/rewards?wallet_pass_id=${encodeURIComponent(walletPassId)}`}
              className="mt-2 w-full flex items-center justify-center gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Reveal & Redeem
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}

        {/* Cooldown */}
        {state === 'cooldown' && (
          <motion.div
            key="cooldown"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-5 max-w-sm w-full"
          >
            <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Clock className="w-7 h-7 text-zinc-400" />
            </div>

            <div className="text-center">
              <p className="text-white text-lg font-semibold">Come back soon</p>
              <p className="text-zinc-400 text-sm mt-1">
                {errorMessage || 'You\'ve already earned a stamp recently.'}
              </p>
            </div>

            {countdown && (
              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-6 py-3 text-center">
                <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">You can scan again in</p>
                <p className="text-white text-xl font-mono font-semibold">{countdown}</p>
              </div>
            )}

            <StampGrid
              stampIcon={stampIconName}
              filled={balance}
              threshold={program.reward_threshold}
              size={28}
              className="justify-center opacity-60"
            />

            <p className="text-zinc-600 text-xs">
              {balance} / {program.reward_threshold} {program.stamp_label.toLowerCase()}
            </p>

            <Link
              href={`/user/rewards?wallet_pass_id=${encodeURIComponent(walletPassId)}`}
              className="mt-2 w-full flex items-center justify-center gap-2 h-11 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              View my rewards
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}

        {/* Error */}
        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-5 max-w-sm w-full"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-white text-lg font-semibold">Couldn&apos;t earn</p>
              <p className="text-zinc-400 text-sm mt-1">{errorMessage}</p>
            </div>

            <Link
              href={`/user/rewards?wallet_pass_id=${encodeURIComponent(walletPassId)}`}
              className="mt-2 w-full flex items-center justify-center gap-2 h-11 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              View my rewards
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
