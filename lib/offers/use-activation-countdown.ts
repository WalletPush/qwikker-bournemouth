'use client'

import { useEffect, useState } from 'react'

export interface ActivationCountdown {
  label: string
  expired: boolean
  endsAtLabel: string
  remainingMs: number
}

function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return '0:00'
  const totalSec = Math.floor(remainingMs / 1000)
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatEndsAt(activeUntil: Date): string {
  return activeUntil.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function getActivationCountdown(activeUntilIso: string, now = Date.now()): ActivationCountdown {
  const until = new Date(activeUntilIso)
  const remainingMs = until.getTime() - now
  return {
    label: formatCountdown(remainingMs),
    expired: remainingMs <= 0,
    endsAtLabel: formatEndsAt(until),
    remainingMs: Math.max(0, remainingMs),
  }
}

/** Live 1s tick countdown for an activation window. */
export function useActivationCountdown(activeUntilIso: string | null | undefined): ActivationCountdown {
  const [state, setState] = useState<ActivationCountdown>(() =>
    activeUntilIso
      ? getActivationCountdown(activeUntilIso)
      : { label: '0:00', expired: true, endsAtLabel: '', remainingMs: 0 }
  )

  useEffect(() => {
    if (!activeUntilIso) {
      setState({ label: '0:00', expired: true, endsAtLabel: '', remainingMs: 0 })
      return
    }

    const tick = () => setState(getActivationCountdown(activeUntilIso))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeUntilIso])

  return state
}
