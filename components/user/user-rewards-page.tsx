'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StampGrid } from '@/components/loyalty/stamp-grid'
import { STAMP_ICONS } from '@/lib/loyalty/loyalty-utils'
import type { StampIconKey } from '@/lib/loyalty/loyalty-utils'
import { Loader2, ChevronDown, ChevronUp, ExternalLink, Gift, ScanLine } from 'lucide-react'
import Link from 'next/link'
import { RedemptionDisplay } from '@/components/loyalty/redemption-display'
import { QrScanner } from '@/components/loyalty/qr-scanner'
import { EmptyRewardsState, type LoyaltyPick } from '@/components/user/empty-rewards-state'

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
    business_id: string
    program_name: string
    type: string
    reward_threshold: number
    reward_description: string
    stamp_label: string
    stamp_icon: string
    status: string
    primary_color: string
    walletpush_template_id: string | null
    redeem_instructions?: string | null
    business: {
      business_name: string
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
  const [suggestions, setSuggestions] = useState<LoyaltyPick[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [walletLinksById, setWalletLinksById] = useState<
    Record<string, { appleUrl: string; googleUrl: string } | 'loading' | 'error'>
  >({})

  const fetchSuggestions = useCallback(async (currentMemberships: Membership[]) => {
    try {
      const res = await fetch('/api/loyalty/discover')
      if (res.ok) {
        const data = await res.json()
        const joinedProgramIds = new Set(currentMemberships.map(m => m.program.public_id))
        const filtered = (data.programs || []).filter(
          (p: LoyaltyPick) => !joinedProgramIds.has(p.public_id)
        )
        setSuggestions(filtered)
      }
    } catch {}
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/loyalty/me?walletPassId=${encodeURIComponent(walletPassId)}`)
        if (res.ok) {
          const data = await res.json()
          const loaded = data.memberships || []
          setMemberships(loaded)
          if (loaded.length > 0) fetchSuggestions(loaded)
        }
      } catch (err) {
        console.error('Failed to load memberships:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [walletPassId, fetchSuggestions])

  const [redeemingMembership, setRedeemingMembership] = useState<Membership | null>(null)
  const [showScanner, setShowScanner] = useState(false)

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const loadWalletLinks = useCallback(
    async (membership: Membership) => {
      if (!membership.walletpush_serial) return

      let shouldFetch = false
      setWalletLinksById((prev) => {
        if (prev[membership.id] && prev[membership.id] !== 'error') return prev
        shouldFetch = true
        return { ...prev, [membership.id]: 'loading' }
      })
      if (!shouldFetch) return

      try {
        const res = await fetch('/api/loyalty/wallet-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicId: membership.program.public_id,
            walletPassId,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.appleUrl) {
          setWalletLinksById((prev) => ({ ...prev, [membership.id]: 'error' }))
          return
        }
        setWalletLinksById((prev) => ({
          ...prev,
          [membership.id]: { appleUrl: data.appleUrl, googleUrl: data.googleUrl },
        }))
      } catch {
        setWalletLinksById((prev) => ({ ...prev, [membership.id]: 'error' }))
      }
    },
    [walletPassId]
  )

  const reloadMemberships = useCallback(async () => {
    try {
      const res = await fetch(`/api/loyalty/me?walletPassId=${encodeURIComponent(walletPassId)}`)
      if (res.ok) {
        const data = await res.json()
        const loaded = data.memberships || []
        setMemberships(loaded)
        if (loaded.length > 0) fetchSuggestions(loaded)
      }
    } catch {}
  }, [walletPassId, fetchSuggestions])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    )
  }

  if (memberships.length === 0) {
    return (
      <>
        <EmptyRewardsState walletPassId={walletPassId} />
        <AnimatePresence>
          {showScanner && (
            <QrScanner
              walletPassId={walletPassId}
              onClose={() => setShowScanner(false)}
              onStampEarned={reloadMemberships}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  // Redemption overlay
  if (redeemingMembership) {
    return (
      <RedemptionDisplay
        membershipId={redeemingMembership.id}
        walletPassId={walletPassId}
        businessId={redeemingMembership.program.business_id}
        rewardDescription={redeemingMembership.program.reward_description}
        businessName={redeemingMembership.program.business.business_name}
        businessLogo={redeemingMembership.program.business.logo}
        redeemInstructions={redeemingMembership.program.redeem_instructions}
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
      {/* Scan to earn button */}
      <button
        onClick={() => setShowScanner(true)}
        className="w-full flex items-center justify-center gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        <ScanLine className="w-4 h-4" />
        Scan to Earn
      </button>

      <AnimatePresence>
        {showScanner && (
          <QrScanner
            walletPassId={walletPassId}
            onClose={() => setShowScanner(false)}
            onStampEarned={reloadMemberships}
          />
        )}
      </AnimatePresence>

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
              onClick={() => {
                toggleExpand(m.id)
                if (expandedId !== m.id) loadWalletLinks(m)
              }}
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

                    {m.walletpush_serial && (
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 space-y-2">
                        <p className="text-zinc-400 text-xs">
                          Lost or deleted your card? Re-add it — your stamps stay on this membership.
                        </p>
                        {walletLinksById[m.id] === 'loading' && (
                          <div className="flex items-center gap-2 text-zinc-500 text-xs py-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Preparing wallet links…
                          </div>
                        )}
                        {walletLinksById[m.id] === 'error' && (
                          <button
                            type="button"
                            onClick={() => loadWalletLinks(m)}
                            className="text-xs text-emerald-400 hover:text-emerald-300"
                          >
                            Try again
                          </button>
                        )}
                        {walletLinksById[m.id] &&
                          walletLinksById[m.id] !== 'loading' &&
                          walletLinksById[m.id] !== 'error' && (
                            <div className="flex flex-col gap-2">
                              <a
                                href={(walletLinksById[m.id] as { appleUrl: string }).appleUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full h-11 bg-black border border-zinc-700 rounded-xl text-white text-sm font-semibold hover:bg-zinc-900 transition-colors"
                              >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                                </svg>
                                Add to Apple Wallet
                              </a>
                              <a
                                href={(walletLinksById[m.id] as { googleUrl: string }).googleUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex justify-center"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src="/images/add-to-google-wallet.svg"
                                  alt="Add to Google Wallet"
                                  className="h-11"
                                />
                              </a>
                            </div>
                          )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                      <Link
                        href="/user/discover"
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        View business
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {/* Suggestions — programs the user hasn't joined yet */}
      {suggestions.length > 0 && (
        <div className="pt-4 space-y-3">
          <p className="text-zinc-400 text-xs uppercase tracking-wide font-medium px-1">
            More rewards we think you&apos;d like
          </p>
          {suggestions.map((p) => {
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
      )}
    </div>
  )
}
