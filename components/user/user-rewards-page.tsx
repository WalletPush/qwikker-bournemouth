'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StampGrid } from '@/components/loyalty/stamp-grid'
import { STAMP_ICONS } from '@/lib/loyalty/loyalty-utils'
import type { StampIconKey } from '@/lib/loyalty/loyalty-utils'
import { Loader2, ChevronDown, ChevronUp, ExternalLink, Trophy, Gift } from 'lucide-react'
import Link from 'next/link'
import { RedemptionDisplay } from '@/components/loyalty/redemption-display'

interface Membership {
  id: string
  stamps_balance: number
  points_balance: number
  total_earned: number
  total_redeemed: number
  last_earned_at: string | null
  last_active_at: string | null
  earned_today_count: number
  walletpush_serial: string | null
  program: {
    public_id: string
    program_name: string
    type: string
    reward_threshold: number
    reward_description: string
    stamp_label: string
    stamp_icon: string
    status: string
    primary_color: string
    walletpush_template_id: string | null
    business: {
      business_name: string
      slug: string
      logo: string | null
    }
  }
  progress: number
  proximityMessage: string | null
  rewardAvailable: boolean
}

interface UserRewardsPageProps {
  walletPassId: string
}

export function UserRewardsPage({ walletPassId }: UserRewardsPageProps) {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/loyalty/me?walletPassId=${encodeURIComponent(walletPassId)}`)
        if (res.ok) {
          const data = await res.json()
          setMemberships(data.memberships || [])
        }
      } catch (err) {
        console.error('Failed to load memberships:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [walletPassId])

  const [redeemingMembership, setRedeemingMembership] = useState<Membership | null>(null)

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    )
  }

  if (memberships.length === 0) {
    return <EmptyRewardsState walletPassId={walletPassId} />
  }

  // Redemption overlay
  if (redeemingMembership) {
    return (
      <RedemptionDisplay
        membershipId={redeemingMembership.id}
        walletPassId={walletPassId}
        rewardDescription={redeemingMembership.program.reward_description}
        businessName={redeemingMembership.program.business.business_name}
        businessLogo={redeemingMembership.program.business.logo}
        onClose={() => {
          setRedeemingMembership(null)
          // Refetch memberships to get updated balance
          setIsLoading(true)
          fetch(`/api/loyalty/me?walletPassId=${encodeURIComponent(walletPassId)}`)
            .then(r => r.json())
            .then(d => setMemberships(d.memberships || []))
            .finally(() => setIsLoading(false))
        }}
      />
    )
  }

  return (
    <div className="space-y-4 px-1">
      {memberships.map((m) => {
        const p = m.program
        const balance = p.type === 'stamps' ? m.stamps_balance : m.points_balance
        const stampIconName = STAMP_ICONS[p.stamp_icon as StampIconKey]?.icon || 'Stamp'
        const isExpanded = expandedId === m.id

        const lastEarnedText = m.last_earned_at
          ? new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(m.last_earned_at))
          : null

        return (
          <div
            key={m.id}
            className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden"
          >
            {/* Card header */}
            <button
              onClick={() => toggleExpand(m.id)}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              {p.business.logo && (
                <img src={p.business.logo} alt="" className="w-10 h-10 rounded-lg object-cover bg-zinc-800 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm truncate">{p.business.business_name}</p>
                    <p className="text-zinc-500 text-xs">{p.reward_description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {m.rewardAvailable && (
                      <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-full">
                        Reward available
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-600" />
                    )}
                  </div>
                </div>

                <StampGrid
                  stampIcon={stampIconName}
                  filled={balance}
                  threshold={p.reward_threshold}
                  size={20}
                />

                {m.proximityMessage && !m.rewardAvailable && (
                  <p className="text-emerald-400/80 text-xs mt-2 font-medium">{m.proximityMessage}</p>
                )}
              </div>
            </button>

            {/* Expanded detail */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1 border-t border-zinc-800/50 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-zinc-600">Progress</p>
                        <p className="text-zinc-300 font-medium">
                          {balance} / {p.reward_threshold} {p.stamp_label.toLowerCase()}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-600">Total earned</p>
                        <p className="text-zinc-300 font-medium">{m.total_earned}</p>
                      </div>
                      {lastEarnedText && (
                        <div>
                          <p className="text-zinc-600">Last earned</p>
                          <p className="text-zinc-300 font-medium">{lastEarnedText}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-zinc-600">Rewards redeemed</p>
                        <p className="text-zinc-300 font-medium">{m.total_redeemed}</p>
                      </div>
                      {m.earned_today_count > 0 && (
                        <div>
                          <p className="text-zinc-600">Earned today</p>
                          <p className="text-zinc-300 font-medium">{m.earned_today_count}</p>
                        </div>
                      )}
                    </div>

                    {m.rewardAvailable && (
                      <button
                        onClick={() => setRedeemingMembership(m)}
                        className="w-full flex items-center justify-center gap-2 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <Gift className="w-4 h-4" />
                        Reveal Reward
                      </button>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                      {p.business.slug && (
                        <Link
                          href={`/user/business/${p.business.slug}`}
                          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          View business
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

interface LoyaltyPick {
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

function EmptyRewardsState({ walletPassId }: { walletPassId: string }) {
  const [picks, setPicks] = useState<LoyaltyPick[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchPicks() {
      try {
        const res = await fetch('/api/loyalty/discover')
        if (res.ok) {
          const data = await res.json()
          setPicks(data.programs || [])
        }
      } catch {} finally {
        setIsLoading(false)
      }
    }
    fetchPicks()
  }, [])

  return (
    <div className="px-1 py-6 space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mx-auto mb-3">
          <Trophy className="w-6 h-6 text-zinc-600" />
        </div>
        <p className="text-white font-semibold text-lg">Your Rewards</p>
        <p className="text-zinc-500 text-sm mt-1">
          Join a loyalty program and start earning rewards.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
        </div>
      ) : picks.length > 0 ? (
        <div className="space-y-3">
          <p className="text-zinc-400 text-xs uppercase tracking-wide font-medium px-1">
            Get started with your first card
          </p>
          {picks.map((p) => {
            const iconKey = p.stamp_icon as StampIconKey | undefined
            const stampIconName = (iconKey && STAMP_ICONS[iconKey]?.icon) || 'Stamp'

            return (
              <Link
                key={p.id}
                href={`/loyalty/start/${p.public_id}?wallet_pass_id=${encodeURIComponent(walletPassId)}`}
                className="flex items-center gap-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
              >
                {(p.business.logo || p.logo_url) ? (
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
                <div className="text-emerald-400 text-xs font-medium shrink-0">Join</div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-4">
          <Link
            href="/user/discover"
            className="text-emerald-400 text-sm font-medium hover:text-emerald-300 transition-colors"
          >
            Browse Discover
          </Link>
        </div>
      )}
    </div>
  )
}
