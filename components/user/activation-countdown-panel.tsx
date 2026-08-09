'use client'

import { useEffect, useRef } from 'react'
import { useActivationCountdown } from '@/lib/offers/use-activation-countdown'

interface ActivationCountdownPanelProps {
  activeUntil: string
  compact?: boolean
  onExpired?: () => void
}

/** Live activation window — used on Active cards and post-Redeem confirm. */
export function ActivationCountdownPanel({
  activeUntil,
  compact = false,
  onExpired,
}: ActivationCountdownPanelProps) {
  const { label, expired, endsAtLabel } = useActivationCountdown(activeUntil)
  const firedRef = useRef(false)

  useEffect(() => {
    if (expired && !firedRef.current) {
      firedRef.current = true
      onExpired?.()
    }
  }, [expired, onExpired])

  if (expired) {
    return (
      <div
        className={
          compact
            ? 'rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-center'
            : 'rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-center'
        }
      >
        <p className="text-slate-400 text-sm font-medium">Activation ended</p>
      </div>
    )
  }

  return (
    <div
      className={
        compact
          ? 'rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-center'
          : 'rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-center'
      }
    >
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-300 text-[11px] font-semibold uppercase tracking-wide">
          Active on your pass
        </span>
      </div>
      <p
        className={
          compact
            ? 'text-white text-2xl font-mono font-bold tabular-nums leading-none'
            : 'text-white text-3xl font-mono font-bold tabular-nums leading-none'
        }
      >
        {label}
      </p>
      <p className="text-slate-300 text-xs mt-1.5 font-medium">Show your Wallet pass to staff</p>
      {endsAtLabel && (
        <p className="text-slate-500 text-[11px] mt-0.5">Until {endsAtLabel}</p>
      )}
    </div>
  )
}
