'use client'

import { useState, useEffect } from 'react'
import { StampGrid } from './stamp-grid'
import { STAMP_ICONS } from '@/lib/loyalty/loyalty-utils'
import type { StampIconKey } from '@/lib/loyalty/loyalty-utils'
import { Gift, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface BusinessLoyaltyPanelProps {
  businessId: string
  walletPassId?: string | null
}

interface ProgramData {
  public_id: string
  program_name: string
  reward_description: string
  reward_threshold: number
  stamp_icon: string
  stamp_label: string
  primary_color: string
}

interface MembershipData {
  stamps_balance: number
  rewardAvailable: boolean
  proximityMessage: string | null
}

/**
 * Self-contained loyalty panel for business detail pages.
 * Fetches program + membership data client-side to avoid
 * coupling the server page to loyalty queries.
 */
export function BusinessLoyaltyPanel({ businessId, walletPassId }: BusinessLoyaltyPanelProps) {
  const [program, setProgram] = useState<ProgramData | null>(null)
  const [membership, setMembership] = useState<MembershipData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/loyalty/program?businessId=${businessId}`)
        if (!res.ok) { setIsLoading(false); return }
        const data = await res.json()
        if (!data.program || data.program.status !== 'active') { setIsLoading(false); return }
        setProgram(data.program)

        if (walletPassId) {
          const meRes = await fetch(`/api/loyalty/me?walletPassId=${encodeURIComponent(walletPassId)}`)
          if (meRes.ok) {
            const meData = await meRes.json()
            const match = (meData.memberships || []).find(
              (m: any) => m.program?.public_id === data.program.public_id
            )
            if (match) {
              setMembership({
                stamps_balance: match.stamps_balance,
                rewardAvailable: match.rewardAvailable,
                proximityMessage: match.proximityMessage,
              })
            }
          }
        }
      } catch {
        // Silent fail
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [businessId, walletPassId])

  if (isLoading || !program) return null

  const stampIconName = STAMP_ICONS[program.stamp_icon as StampIconKey]?.icon || 'Stamp'
  const isMember = !!membership
  const balance = membership?.stamps_balance ?? 0

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-emerald-400" />
          <p className="text-white text-sm font-medium">Loyalty Rewards</p>
        </div>
        {membership?.rewardAvailable && (
          <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-full">
            Reward available
          </span>
        )}
      </div>

      <p className="text-zinc-400 text-xs">
        Collect {program.reward_threshold} {program.stamp_label.toLowerCase()} to earn{' '}
        <span className="text-emerald-400 font-medium">{program.reward_description}</span>
      </p>

      {isMember ? (
        <>
          <StampGrid
            stampIcon={stampIconName}
            filled={balance}
            threshold={program.reward_threshold}
            size={22}
          />
          {membership.proximityMessage && !membership.rewardAvailable && (
            <p className="text-emerald-400/80 text-xs font-medium">{membership.proximityMessage}</p>
          )}
          <p className="text-zinc-600 text-xs">
            Scan the QR code at the till to earn {program.stamp_label.toLowerCase()}.
          </p>
        </>
      ) : (
        <Link
          href={`/loyalty/join/${program.public_id}`}
          className="flex items-center justify-between w-full bg-emerald-600/10 border border-emerald-600/20 rounded-lg px-4 py-2.5 group hover:bg-emerald-600/15 transition-colors"
        >
          <span className="text-emerald-400 text-sm font-medium">Join & start earning</span>
          <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  )
}
