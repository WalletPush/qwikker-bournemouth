'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Gift, Loader2, Trophy } from 'lucide-react'

export interface LoyaltyPick {
  id: string
  program_name: string
  reward_description: string
  reward_threshold: number
  stamp_label: string
  stamp_icon: string
  primary_color: string
  background_color: string
  logo_url: string | null
  strip_image_url: string | null
  public_id: string
  business: {
    business_name: string
    logo: string | null
  }
}

interface EmptyRewardsStateProps {
  walletPassId: string
}

export function EmptyRewardsState({ walletPassId }: EmptyRewardsStateProps) {
  const [picks, setPicks] = useState<LoyaltyPick[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchPicks() {
      try {
        const res = await fetch('/api/loyalty/discover')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setPicks(Array.isArray(data.programs) ? data.programs : [])
        }
      } catch {
        // Keep empty picks — show the honest empty copy below
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchPicks()
    return () => {
      cancelled = true
    }
  }, [])

  const subtitle =
    !isLoading && picks.length === 0
      ? 'No loyalty cards available yet.'
      : 'Collect stamps and unlock rewards from local places.'

  return (
    <div className="px-1 py-6 space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mx-auto mb-3">
          <Trophy className="w-6 h-6 text-zinc-600" />
        </div>
        <p className="text-white font-semibold text-lg">Loyalty</p>
        <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
        </div>
      ) : null}

      {!isLoading && picks.length > 0 ? (
        <div className="space-y-3">
          <p className="text-zinc-400 text-xs uppercase tracking-wide font-medium px-1">
            Get started with your first card
          </p>
          {picks.map((p) => (
            <Link
              key={p.id}
              href={`/loyalty/start/${p.public_id}?wallet_pass_id=${encodeURIComponent(walletPassId)}`}
              className="flex items-center gap-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
            >
              {p.business.logo || p.logo_url ? (
                <img
                  src={p.business.logo || p.logo_url || ''}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover bg-zinc-800 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-zinc-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{p.business.business_name}</p>
                <p className="text-zinc-500 text-xs truncate">
                  Collect {p.reward_threshold} {p.stamp_label.toLowerCase()} for {p.reward_description}
                </p>
              </div>
              <div className="text-[#00d083]/80 text-xs font-medium shrink-0">Join</div>
            </Link>
          ))}
        </div>
      ) : null}

      {!isLoading && picks.length === 0 ? (
        <p className="text-center text-zinc-500 text-xs px-4">
          When venues launch stamp cards, they&apos;ll show up here.
        </p>
      ) : null}
    </div>
  )
}
