'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface RedemptionDisplayProps {
  membershipId: string
  walletPassId: string
  rewardDescription: string
  businessName: string
  businessLogo?: string | null
  redeemInstructions?: string | null
  onClose: () => void
}

type RedeemState = 'holding' | 'consuming' | 'live' | 'expired' | 'error'

const DISPLAY_WINDOW_MS = 10 * 60 * 1000

export function RedemptionDisplay({
  membershipId,
  walletPassId,
  rewardDescription,
  businessName,
  businessLogo,
  redeemInstructions,
  onClose,
}: RedemptionDisplayProps) {
  const [state, setState] = useState<RedeemState>('holding')
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState('')
  const [liveTime, setLiveTime] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const holdTimer = useRef<NodeJS.Timeout | null>(null)
  const [holdProgress, setHoldProgress] = useState(0)

  const consume = useCallback(async () => {
    setState('consuming')
    try {
      const res = await fetch('/api/loyalty/redemption/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId, walletPassId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Redemption failed')
        setState('error')
        return
      }
      setExpiresAt(new Date(data.displayExpiresAt))
      setState('live')
    } catch {
      setErrorMsg('Connection failed')
      setState('error')
    }
  }, [membershipId, walletPassId])

  // Hold-to-reveal: 2 second press
  const startHold = useCallback(() => {
    let elapsed = 0
    const tick = 50
    holdTimer.current = setInterval(() => {
      elapsed += tick
      setHoldProgress(Math.min(elapsed / 2000, 1))
      if (elapsed >= 2000) {
        if (holdTimer.current) clearInterval(holdTimer.current)
        consume()
      }
    }, tick)
  }, [consume])

  const cancelHold = useCallback(() => {
    if (holdTimer.current) clearInterval(holdTimer.current)
    setHoldProgress(0)
  }, [])

  // Live countdown + clock
  useEffect(() => {
    if (state !== 'live' || !expiresAt) return

    const tick = () => {
      const now = new Date()
      const diff = expiresAt.getTime() - now.getTime()

      if (diff <= 0) {
        setState('expired')
        return
      }

      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`)
      setLiveTime(
        now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      )
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [state, expiresAt])

  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // Hold-to-reveal state
  if (state === 'holding' || state === 'consuming') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0b0f14] flex flex-col items-center justify-center px-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-600 text-sm hover:text-zinc-400">
          Cancel
        </button>

        <div className="max-w-sm w-full flex flex-col items-center gap-6">
          {businessLogo && (
            <img src={businessLogo} alt="" className="w-12 h-12 rounded-xl object-cover bg-zinc-800" />
          )}
          <div className="text-center">
            <p className="text-white text-xl font-semibold">{rewardDescription}</p>
            <p className="text-zinc-500 text-sm mt-1">at {businessName}</p>
          </div>

          <p className="text-amber-400/80 text-xs text-center max-w-xs">
            Only tap at the till. This will use your reward and start a 10-minute display window.
          </p>

          {state === 'consuming' ? (
            <div className="flex items-center gap-2 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Redeeming...</span>
            </div>
          ) : (
            <div className="relative w-full">
              <button
                onMouseDown={startHold}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
                className="w-full h-14 rounded-xl bg-emerald-600 text-white font-semibold text-base relative overflow-hidden select-none"
              >
                <div
                  className="absolute inset-0 bg-emerald-400/30 transition-none"
                  style={{ width: `${holdProgress * 100}%` }}
                />
                <span className="relative z-10">
                  {holdProgress > 0 ? 'Keep holding...' : 'Hold to Reveal Reward'}
                </span>
              </button>
              <p className="text-zinc-600 text-xs text-center mt-2">Press and hold for 2 seconds</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Live display
  if (state === 'live') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0b0f14] flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Animated background pattern (anti-screenshot) */}
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #00d083 0px, #00d083 1px, transparent 1px, transparent 20px)',
            backgroundSize: '200% 200%',
          }}
        />

        <div className="relative max-w-sm w-full flex flex-col items-center gap-5">
          {businessLogo && (
            <img src={businessLogo} alt="" className="w-14 h-14 rounded-xl object-cover bg-zinc-800" />
          )}

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <p className="text-emerald-400 text-3xl font-bold tracking-tight">{rewardDescription.toUpperCase()}</p>
            <p className="text-zinc-400 text-sm mt-1">at {businessName}</p>
          </motion.div>

          {redeemInstructions && (
            <p className="text-zinc-500 text-xs text-center">{redeemInstructions}</p>
          )}

          {/* Live proof elements */}
          <div className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 text-xs">Live until</span>
              <span className="text-emerald-400 font-mono text-sm font-semibold">
                {expiresAt?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 text-xs">Current time</span>
              <span className="text-white font-mono text-sm">{liveTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 text-xs">Date</span>
              <span className="text-zinc-300 text-xs">{todayStr}</span>
            </div>
          </div>

          {/* Countdown */}
          <div className="text-center">
            <p className="text-zinc-600 text-xs uppercase tracking-wide">Expires in</p>
            <p className="text-white text-4xl font-mono font-bold">{countdown}</p>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 text-xs font-medium">Live</span>
          </div>
        </div>
      </div>
    )
  }

  // Expired
  if (state === 'expired') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0b0f14] flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full flex flex-col items-center gap-5">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          <div className="text-center">
            <p className="text-white text-xl font-semibold">Redeemed</p>
            <p className="text-zinc-400 text-sm mt-1">{rewardDescription} at {businessName}</p>
            <p className="text-zinc-600 text-xs mt-3">{todayStr}</p>
          </div>
          <button
            onClick={onClose}
            className="text-sm text-emerald-400 hover:text-emerald-300 font-medium mt-4"
          >
            Back to Rewards
          </button>
        </div>
      </div>
    )
  }

  // Error
  return (
    <div className="fixed inset-0 z-50 bg-[#0b0f14] flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full flex flex-col items-center gap-5">
        <div className="text-center">
          <p className="text-white text-lg font-semibold">Redemption failed</p>
          <p className="text-zinc-400 text-sm mt-1">{errorMsg}</p>
        </div>
        <button
          onClick={onClose}
          className="text-sm text-emerald-400 hover:text-emerald-300 font-medium"
        >
          Back to Rewards
        </button>
      </div>
    </div>
  )
}
