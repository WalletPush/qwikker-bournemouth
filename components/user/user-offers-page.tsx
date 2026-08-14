'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShareButton } from '@/components/ui/share-button'
import { AiCompanionCard } from '@/components/ui/ai-companion-card'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SYSTEM_CATEGORY_LABEL } from '@/lib/constants/system-categories'
import { getClientCityFallback, getCityDisplayName as getClientCityDisplayName } from '@/lib/utils/client-city-detection'
import { ActivationCountdownPanel } from '@/components/user/activation-countdown-panel'
import { OfferActivatingOverlay } from '@/components/user/offer-activating-overlay'
import { FilterChipGroup, FilterPanel } from '@/components/user/filter-panel'

interface ActiveOfferEntry {
  activeUntil: string
}

interface ActivateSuccessState {
  offerId: string
  offerTitle: string
  businessName: string
  activeUntil: string
  walletSynced: boolean
  message?: string
}

interface ActivatingState {
  offerId: string
  offerTitle: string
  businessName: string
}

interface UserOffersPageProps {
  realOffers?: any[]
  walletPassId?: string
  currentCity?: string
  cityDisplayName?: string
}

function pruneExpiredActive(
  map: Record<string, ActiveOfferEntry>
): Record<string, ActiveOfferEntry> {
  const now = Date.now()
  const next: Record<string, ActiveOfferEntry> = {}
  for (const [id, entry] of Object.entries(map)) {
    if (new Date(entry.activeUntil).getTime() > now) {
      next[id] = entry
    }
  }
  return next
}

function persistActiveMap(userId: string, map: Record<string, ActiveOfferEntry>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`qwikker-active-${userId}`, JSON.stringify(map))
  localStorage.setItem(`qwikker-wallet-${userId}`, JSON.stringify(Object.keys(map)))
}

export function UserOffersPage({ realOffers = [], walletPassId: propWalletPassId, currentCity: currentCityProp, cityDisplayName: cityDisplayNameProp }: UserOffersPageProps) {
  const currentCity = currentCityProp || getClientCityFallback()
  const cityDisplayName = cityDisplayNameProp || getClientCityDisplayName(currentCity)
  /** Browse available / Saved / Active — primary navigation */
  const [listMode, setListMode] = useState<'all' | 'claimed' | 'redeemed'>('all')
  /** Type refine: % off, 2-for-1, ending soon, favourites */
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage_off' | 'two_for_one' | 'ending_soon' | 'favorites'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const searchParams = useSearchParams()
  const urlWalletPassId = searchParams.get('wallet_pass_id')
  // Use prop first, then URL, then null - this ensures consistency with server-side logic
  const walletPassId = propWalletPassId || urlWalletPassId
  const highlightBusiness = searchParams.get('highlight') // For QR deep linking
  
  // Initialize with empty sets to avoid hydration mismatch
  const [favoriteOffers, setFavoriteOffers] = useState<Set<string>>(new Set())
  const [claimedOffers, setClaimedOffers] = useState<Set<string>>(new Set())
  /** Currently ticking activations (activeUntil > now) */
  const [activeByOfferId, setActiveByOfferId] = useState<Record<string, ActiveOfferEntry>>({})
  /** Offers that have been activated at least once (blocks Redeem on single-use) */
  const [usedOfferIds, setUsedOfferIds] = useState<Set<string>>(new Set())
  const [activateSuccess, setActivateSuccess] = useState<ActivateSuccessState | null>(null)
  const [activating, setActivating] = useState<ActivatingState | null>(null)
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null)
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const autoClaimProcessed = useRef(false)

  const isOfferActive = useCallback(
    (offerId: string) => {
      const entry = activeByOfferId[offerId]
      if (!entry) return false
      return new Date(entry.activeUntil).getTime() > Date.now()
    },
    [activeByOfferId]
  )

  const isOfferUsed = useCallback(
    (offerId: string) => usedOfferIds.has(offerId),
    [usedOfferIds]
  )

  const clearActiveOffer = useCallback(
    (offerId: string) => {
      const userId = walletPassId || 'anonymous-user'
      setActiveByOfferId((prev) => {
        if (!prev[offerId]) return prev
        const next = { ...prev }
        delete next[offerId]
        persistActiveMap(userId, next)
        return next
      })
    },
    [walletPassId]
  )

  const setActiveOffer = useCallback(
    (offerId: string, activeUntil: string) => {
      const userId = walletPassId || 'anonymous-user'
      setActiveByOfferId(() => {
        // Single active activation per pass — replace any previous
        const next: Record<string, ActiveOfferEntry> = { [offerId]: { activeUntil } }
        persistActiveMap(userId, next)
        return next
      })
      setUsedOfferIds((prev) => {
        const next = new Set([...prev, offerId])
        if (typeof window !== 'undefined') {
          localStorage.setItem(`qwikker-used-${userId}`, JSON.stringify([...next]))
          // Keep legacy wallet key for any old readers
          localStorage.setItem(`qwikker-wallet-${userId}`, JSON.stringify([...next]))
        }
        return next
      })
    },
    [walletPassId]
  )
  
  // Helper function to scroll to results after filter change
  const scrollToResults = () => {
    setTimeout(() => {
      const resultsSection = document.querySelector('[data-offers-results]')
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }
  
  // Use only real offers (no mock data)
  const allOffers = realOffers

  // Load from localStorage after component mounts
  useEffect(() => {
    const userId = walletPassId || 'anonymous-user'

    const savedFavorites = localStorage.getItem(`qwikker-favorites-${userId}`)
    const savedClaimed = localStorage.getItem(`qwikker-claimed-${userId}`)
    const savedActive = localStorage.getItem(`qwikker-active-${userId}`)

    if (savedFavorites) {
      setFavoriteOffers(new Set(JSON.parse(savedFavorites)))
    }
    if (savedClaimed) {
      setClaimedOffers(new Set(JSON.parse(savedClaimed)))
    }

    let localActive: Record<string, ActiveOfferEntry> = {}
    if (savedActive) {
      try {
        localActive = pruneExpiredActive(JSON.parse(savedActive) as Record<string, ActiveOfferEntry>)
      } catch {
        localActive = {}
      }
    }
    setActiveByOfferId(localActive)
    persistActiveMap(userId, localActive)

    const savedUsed = localStorage.getItem(`qwikker-used-${userId}`)
    const legacyWallet = localStorage.getItem(`qwikker-wallet-${userId}`)
    if (savedUsed) {
      try {
        setUsedOfferIds(new Set(JSON.parse(savedUsed)))
      } catch {
        /* ignore */
      }
    } else if (legacyWallet) {
      try {
        const ids = JSON.parse(legacyWallet) as string[]
        setUsedOfferIds(new Set(ids))
        localStorage.setItem(`qwikker-used-${userId}`, JSON.stringify(ids))
      } catch {
        /* ignore */
      }
    }
  }, [walletPassId])

  // Hydrate active activation from server (source of truth)
  useEffect(() => {
    if (!walletPassId || walletPassId.length < 10) return
    let cancelled = false

    const hydrate = async () => {
      try {
        const res = await fetch(
          `/api/offers/activate?walletPassId=${encodeURIComponent(walletPassId)}`
        )
        const body = await res.json().catch(() => ({}))
        if (cancelled || !res.ok) return

        const activation = body.activation as
          | { offer_id?: string; active_until?: string }
          | null
          | undefined

        if (activation?.offer_id && activation?.active_until) {
          const until = new Date(activation.active_until).getTime()
          if (until > Date.now()) {
            const offerId = activation.offer_id
            const next = { [offerId]: { activeUntil: activation.active_until } }
            setActiveByOfferId(next)
            persistActiveMap(walletPassId, next)
            setUsedOfferIds((prev) => {
              const s = new Set([...prev, offerId])
              localStorage.setItem(`qwikker-used-${walletPassId}`, JSON.stringify([...s]))
              return s
            })
            setClaimedOffers((prev) => {
              if (prev.has(offerId)) return prev
              const s = new Set([...prev, offerId])
              localStorage.setItem(`qwikker-claimed-${walletPassId}`, JSON.stringify([...s]))
              return s
            })
            return
          }
        }

        // No server active — clear local active (keep used history)
        setActiveByOfferId({})
        persistActiveMap(walletPassId, {})
      } catch (err) {
        console.error('Failed to hydrate active offer:', err)
      }
    }

    hydrate()
    return () => {
      cancelled = true
    }
  }, [walletPassId])

  // Clean up expired / removed offer IDs from localStorage
  useEffect(() => {
    if (allOffers.length === 0) return

    const userId = walletPassId || 'anonymous-user'
    const catalogIds = new Set(allOffers.map((o) => o.id))

    const updatedFavorites = Array.from(favoriteOffers).filter((id) => catalogIds.has(id))
    if (updatedFavorites.length !== favoriteOffers.size) {
      setFavoriteOffers(new Set(updatedFavorites))
      localStorage.setItem(`qwikker-favorites-${userId}`, JSON.stringify(updatedFavorites))
    }

    const updatedClaimed = Array.from(claimedOffers).filter((id) => catalogIds.has(id))
    if (updatedClaimed.length !== claimedOffers.size) {
      setClaimedOffers(new Set(updatedClaimed))
      localStorage.setItem(`qwikker-claimed-${userId}`, JSON.stringify(updatedClaimed))
    }

    const pruned = pruneExpiredActive(activeByOfferId)
    const removedGone = Object.fromEntries(
      Object.entries(pruned).filter(([id]) => catalogIds.has(id))
    )
    if (
      Object.keys(removedGone).length !== Object.keys(activeByOfferId).length ||
      Object.keys(activeByOfferId).some((id) => !removedGone[id])
    ) {
      setActiveByOfferId(removedGone)
      persistActiveMap(userId, removedGone)
    }
  }, [allOffers, favoriteOffers, claimedOffers, activeByOfferId, walletPassId])

  // Auto-save + redeem when a non-pass-holder followed a landing-page
  // "Save this offer" deep link: /join?returnTo=/user/offers?autoClaim={offerId}.
  // After the pass is installed they land here; we save, activate, then strip the param.
  useEffect(() => {
    const autoClaimId = searchParams.get('autoClaim')
    if (!autoClaimId || !walletPassId || autoClaimProcessed.current) return
    autoClaimProcessed.current = true

    const run = async () => {
      const offer = allOffers.find(o => o.id === autoClaimId)
      const offerTitle = offer?.title || 'Your offer'
      const businessName = offer?.businessName || 'the business'
      const userId = walletPassId || 'anonymous-user'

      try {
        if (!claimedOffers.has(autoClaimId) && !isOfferUsed(autoClaimId)) {
          const { claimOffer: claimAction } = await import('@/lib/actions/offer-claim-actions')
          await claimAction({ offerId: autoClaimId, offerTitle, businessName, visitorWalletPassId: walletPassId })
        }

        if (!isOfferActive(autoClaimId)) {
          // Prefer activate API so countdown + single-use rules apply
          await handleAddToWallet(autoClaimId, offerTitle, businessName)
          return
        }

        showSuccessMessage(
          'On your Wallet!',
          `"${offerTitle}" from ${businessName} is active on your pass. Show staff before it clears.`,
          () => setListMode('all')
        )
      } catch (error) {
        console.error('Auto-claim failed:', error)
      } finally {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.delete('autoClaim')
          window.history.replaceState({}, '', url.toString())
        }
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, walletPassId, allOffers])

  // Handle auto-scroll to highlighted offer id or business slug
  useEffect(() => {
    if (highlightBusiness) {
      const scrollTimer = setTimeout(() => {
        const key = highlightBusiness.trim()
        const businessSlug = key.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const targetCard =
          cardRefs.current[key] ||
          cardRefs.current[businessSlug] ||
          (document.querySelector(`[data-offer-id="${key}"]`) as HTMLDivElement | null)
        
        if (targetCard) {
          targetCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          })
          setHighlightedCard(key)
          setTimeout(() => setHighlightedCard(null), 3000)
        } else {
          const firstCard = document.querySelector('[data-offer-card]')
          if (firstCard) {
            firstCard.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            })
          }
        }
      }, 600)
      
      return () => clearTimeout(scrollTimer)
    }
  }, [highlightBusiness, allOffers])
  
  // Get unique categories from all offers (use businessCategory which has the fallback chain)
  const uniqueCategories = Array.from(
    new Set(
      allOffers
        .map(o => o.businessCategory)
        .filter(Boolean)
        .filter(c => c !== 'Other') // Exclude generic "Other"
    )
  ).sort()
  
  // Count offers per category
  const getCategoryCount = (category: string) => {
    return allOffers.filter(o => o.businessCategory === category).length
  }
  
  const activeOfferIds = Object.keys(activeByOfferId).filter((id) => isOfferActive(id))

  const liveCount = allOffers.length
  const savedCount = Array.from(claimedOffers).filter((id) => !isOfferActive(id)).length
  const activeCount = activeOfferIds.length
  const favoritesCount = Array.from(favoriteOffers).filter((id) =>
    allOffers.some((o) => o.id === id)
  ).length

  const resetRefineFilters = () => {
    setTypeFilter('all')
    setSelectedCategory('all')
  }

  const offerTypeChips = [
    { id: 'all' as const, label: 'All types', active: 'bg-[#00d083] text-black border-[#00d083]' },
    { id: 'percentage_off' as const, label: '% Off', active: 'bg-orange-400 text-black border-orange-300' },
    { id: 'two_for_one' as const, label: '2-for-1', active: 'bg-violet-400 text-black border-violet-300' },
    { id: 'ending_soon' as const, label: 'Ending soon', active: 'bg-rose-400 text-black border-rose-300' },
    {
      id: 'favorites' as const,
      label: favoritesCount > 0 ? `Favourites (${favoritesCount})` : 'Favourites',
      active: 'bg-pink-400 text-black border-pink-300',
    },
  ]

  const offerFilterActiveCount =
    (typeFilter !== 'all' ? 1 : 0) + (selectedCategory !== 'all' ? 1 : 0)

  const offerFilterSummary = [
    typeFilter !== 'all' ? offerTypeChips.find((c) => c.id === typeFilter)?.label : null,
    selectedCategory !== 'all' ? selectedCategory : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const CHIP_OFF = 'bg-zinc-800 text-zinc-100 border-zinc-500'

  const toggleFavorite = (offerId: string) => {
    const userId = walletPassId || 'anonymous-user'
    
    setFavoriteOffers(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(offerId)) {
        newFavorites.delete(offerId)
      } else {
        newFavorites.add(offerId)
      }
      // Save to localStorage with user ID
      if (typeof window !== 'undefined') {
        localStorage.setItem(`qwikker-favorites-${userId}`, JSON.stringify([...newFavorites]))
      }
      return newFavorites
    })
  }

  const claimOffer = async (offerId: string, offerTitle: string, businessName: string) => {
    const userId = walletPassId || 'anonymous-user'
    if (!walletPassId || walletPassId.length < 10) {
      alert('Add your Qwikker pass first to save offers.')
      return
    }

    const offer = allOffers.find(o => o.id === offerId)
    const windowMins = offer?.activationWindowMinutes || 60

    // Optimistic UI — Save (intent only)
    setClaimedOffers(prev => {
      const newClaimed = new Set([...prev, offerId])
      if (typeof window !== 'undefined') {
        localStorage.setItem(`qwikker-claimed-${userId}`, JSON.stringify([...newClaimed]))
        try {
          const { getBadgeTracker } = require('@/lib/utils/simple-badge-tracker')
          getBadgeTracker(walletPassId).trackAction('offer_claimed')
        } catch { /* ignore */ }
      }
      return newClaimed
    })

    try {
      const res = await fetch('/api/offers/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletPassId,
          offerId,
          source: 'offers',
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Failed to save offer')
      }
    } catch (error) {
      console.error('Failed to save offer:', error)
      // keep optimistic save; user can still Redeem now
    }
    const modalOverlay = document.createElement('div')
    modalOverlay.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm opacity-0 transition-opacity duration-300'
    
    const modal = document.createElement('div')
    modal.className = 'bg-zinc-800 border border-[#00d083]/30 rounded-2xl p-6 max-w-sm w-full mx-4 transform scale-95 transition-transform duration-300 shadow-2xl ring-1 ring-white/5'
    modal.innerHTML = `
      <div class="text-center">
        <div class="w-16 h-16 bg-[#00d083] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-white mb-2">Saved</h3>
        <p class="text-zinc-300 mb-1">"${offerTitle}"</p>
        <p class="text-zinc-400 text-sm mb-2">from ${businessName}</p>
        <p class="text-zinc-300 text-sm mb-6">Redeem when you're ready to show staff.</p>
        
        <div class="space-y-3">
          <button id="redeem-now" class="w-full bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold py-3 px-6 rounded-xl transition-colors duration-200">
            Redeem now
          </button>
          
          <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mt-3 mb-2">
            <p class="text-amber-200 text-sm font-semibold text-center mb-1">About ${windowMins} minutes on your Wallet</p>
            <p class="text-amber-100/90 text-xs text-center">Only redeem when you're ready to show staff. After that it clears from your pass.</p>
          </div>

          <button id="view-saved" class="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium py-2.5 px-6 rounded-xl transition-colors duration-200">
            View saved
          </button>
          
          <button id="modal-dismiss" class="w-full border border-zinc-600 text-zinc-300 hover:bg-zinc-700/50 font-medium py-2.5 px-6 rounded-xl transition-colors duration-200">
            Dismiss
          </button>
        </div>
      </div>
    `
    
    modalOverlay.appendChild(modal)
    document.body.appendChild(modalOverlay)
    
    setTimeout(() => {
      modalOverlay.style.opacity = '1'
      modal.style.transform = 'scale(1)'
    }, 50)
    
    const closeModal = () => {
      modalOverlay.style.opacity = '0'
      modal.style.transform = 'scale(0.95)'
      setTimeout(() => {
        if (document.body.contains(modalOverlay)) {
          document.body.removeChild(modalOverlay)
        }
      }, 300)
    }
    
    modal.querySelector('#view-saved')?.addEventListener('click', () => {
      closeModal()
      setListMode('claimed')
    })
    
    modal.querySelector('#redeem-now')?.addEventListener('click', async () => {
      closeModal()
      await handleAddToWallet(offerId, offerTitle, businessName)
    })
    
    modal.querySelector('#modal-dismiss')?.addEventListener('click', closeModal)
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal()
    })
  }

  const handleShare = (offerId: string, offerTitle: string, businessName: string) => {
    const userId = walletPassId || 'anonymous-user'
    
    // Track badge progress for sharing
    if (typeof window !== 'undefined') {
      const { getBadgeTracker } = require('@/lib/utils/simple-badge-tracker')
      const badgeTracker = getBadgeTracker(walletPassId)
      badgeTracker.trackAction('share_completed')
    }
  }

  // Redeem now — activate timed wallet window
  const handleAddToWallet = async (
    offerId: string,
    offerTitle: string,
    businessName: string,
    confirmReplace = false
  ) => {
    if (!walletPassId || walletPassId.length < 10) {
      alert('Add your Qwikker pass first to redeem offers.')
      return
    }
    if (isOfferActive(offerId) && !confirmReplace) {
      alert('This offer is already active on your pass.')
      return
    }
    if (activating) return

    setActivating({ offerId, offerTitle, businessName })

    try {
      const response = await fetch('/api/offers/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletPassId,
          offerId,
          source: 'offers',
          confirmReplace,
        }),
      })
      const body = await response.json().catch(() => ({}))

      if (body.error === 'needs_replace_confirm' && body.active) {
        setActivating(null)
        const ok = window.confirm(
          `You already have an active offer at ${body.active.business_name} with about ${body.active.minutes_left} minutes left. Activating this will end it. Continue?`
        )
        if (ok) {
          await handleAddToWallet(offerId, offerTitle, businessName, true)
        }
        return
      }

      if (!response.ok || !body.success) {
        throw new Error(body.error || 'Failed to activate offer')
      }

      const activeUntil =
        body.activation?.active_until ||
        new Date(
          Date.now() +
            (body.activation?.activation_window_minutes ||
              allOffers.find((o) => o.id === offerId)?.activationWindowMinutes ||
              60) *
              60 *
              1000
        ).toISOString()

      setActiveOffer(offerId, activeUntil)

      const userId = walletPassId || 'anonymous-user'
      setClaimedOffers((prev) => {
        const next = new Set([...prev, offerId])
        if (typeof window !== 'undefined') {
          localStorage.setItem(`qwikker-claimed-${userId}`, JSON.stringify([...next]))
        }
        return next
      })

      setActivating(null)
      setActivateSuccess({
        offerId,
        offerTitle,
        businessName,
        activeUntil,
        walletSynced: body.walletSynced !== false,
        message: body.message,
      })
    } catch (error) {
      console.error('Error activating offer:', error)
      setActivating(null)
      alert(
        error instanceof Error
          ? error.message
          : 'Sorry, there was an error activating this offer. Please try again.'
      )
    }
  }

  // Helper function to show success messages with callbacks
  const showSuccessMessage = (title: string, message: string, onClose?: () => void) => {
    const successOverlay = document.createElement('div')
    successOverlay.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'
    successOverlay.innerHTML = `
      <div class="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4 text-center">
        <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-slate-100 mb-2">${title}</h3>
        <p class="text-slate-300 mb-4">${message}</p>
        <button id="success-close" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200">
          Perfect!
        </button>
      </div>
    `
    document.body.appendChild(successOverlay)
    
    const closeSuccess = () => {
      if (document.body.contains(successOverlay)) {
        document.body.removeChild(successOverlay)
      }
      if (onClose) onClose()
    }
    
    successOverlay.querySelector('#success-close')?.addEventListener('click', closeSuccess)
    
    // Auto-close after 5 seconds
    setTimeout(closeSuccess, 5000)
  }


  const getFilteredOffers = () => {
    let filtered = allOffers

    if (listMode === 'claimed') {
      // Saved but not currently in an activation window
      filtered = filtered.filter((o) => claimedOffers.has(o.id) && !isOfferActive(o.id))
    } else if (listMode === 'redeemed') {
      filtered = filtered.filter((o) => isOfferActive(o.id))
    } else {
      // All live offers — include saved; only hide single-use currently in activation window
      filtered = filtered.filter((o) => {
        if (isOfferActive(o.id) && o.claimType === 'single') return false
        return true
      })
    }

    if (typeFilter === 'favorites') {
      filtered = filtered.filter((o) => favoriteOffers.has(o.id))
    } else if (typeFilter === 'ending_soon') {
      filtered = filtered.filter((o) => o.isEndingSoon)
    } else if (typeFilter === 'two_for_one') {
      filtered = filtered.filter((o) => o.type === 'two_for_one')
    } else if (typeFilter === 'percentage_off') {
      filtered = filtered.filter((o) => o.type === 'percentage_off')
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((o) => o.businessCategory === selectedCategory)
    }

    return filtered
  }

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'two_for_one': return 'bg-blue-500'
      case 'percentage_off': return 'bg-green-500'
      case 'freebie': return 'bg-purple-500'
      case 'discount': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  const OfferCard = ({ offer }: { offer: any }) => {
    const [showModal, setShowModal] = useState(false)
    
    // All offers are now real (no mock data)
    const businessName = offer.businessName || 'Unknown Business'
    const businessSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const businessImage = offer.image || '/placeholder-business.jpg'
    const businessRating = offer.businessRating ?? null
    
    // Generate badge based on offer type
    const getBadgeText = () => {
      switch (offer.type) {
        case 'two_for_one': return '2-FOR-1'
        case 'percentage_off': return `${offer.value}`
        case 'freebie': return 'FREE ITEM'
        case 'discount': return 'DISCOUNT'
        default: return 'OFFER'
      }
    }
    
    const isFavorite = favoriteOffers.has(offer.id)
    const isClaimed = claimedOffers.has(offer.id)
    const isActive = isOfferActive(offer.id)
    const isUsed = isOfferUsed(offer.id)
    const activeUntil = activeByOfferId[offer.id]?.activeUntil
    const canRedeem = isClaimed && !isActive && !(offer.claimType === 'single' && isUsed)
    
    return (
      <>
      <Card 
        ref={(el) => {
          cardRefs.current[businessSlug] = el
          cardRefs.current[offer.id] = el
        }}
        data-offer-card
        data-offer-id={offer.id}
        className={`bg-gradient-to-br from-slate-800/60 to-slate-700/40 border-slate-700/50 hover:border-green-500/30 transition-all duration-300 overflow-hidden group h-full flex flex-col ${
          isActive ? 'ring-1 ring-emerald-500/40' : ''
        } ${
          highlightedCard === businessSlug || highlightedCard === offer.id
            ? 'ring-4 ring-[#00d083]/60 shadow-2xl shadow-[#00d083]/20 scale-[1.02] border-[#00d083]/50'
            : ''
        }`}
      >
        {/* MOBILE LAYOUT: Vertical (image top, content below) - matches event cards */}
        <div className="sm:hidden">
          {/* Image */}
          <div className="relative h-48 overflow-hidden">
            <img 
              src={businessImage} 
              alt={businessName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-business.jpg';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

            {/* Badges top-left */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {offer.businessTier === 'spotlight' && (
                <span className="bg-amber-500/80 text-amber-950 text-xs px-2.5 py-1 rounded-full font-bold shadow-lg backdrop-blur-sm border border-amber-400/50">
                  QWIKKER PICK
                </span>
              )}
              {offer.businessTier === 'featured' && (
                <span className="bg-emerald-500/80 text-emerald-950 text-xs px-2.5 py-1 rounded-full font-bold shadow-lg backdrop-blur-sm border border-emerald-400/50">
                  FEATURED
                </span>
              )}
              {offer.isPopular && (
                <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  POPULAR
                </span>
              )}
              {offer.isEndingSoon && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse shadow-lg">
                  ENDING SOON
                </span>
              )}
            </div>

            {/* Heart top-right */}
            <div className="absolute top-2 right-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(offer.id)
                }}
                className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                  isFavorite
                    ? 'bg-pink-500 text-white'
                    : 'bg-black/50 text-white hover:bg-black/70'
                }`}
              >
                <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>

            {/* Business name bottom-left over image */}
            <div className="absolute bottom-2 left-3 right-12">
              <p className="text-white font-semibold text-sm drop-shadow-lg truncate">{businessName}</p>
              <p className="text-white/80 text-xs drop-shadow-md truncate">{offer.businessCategory}</p>
            </div>

            {/* Active chip — keep image readable */}
            {isActive && (
              <div className="absolute top-2 right-12">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-emerald-950 text-xs px-2.5 py-1 rounded-full font-bold shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-950 animate-pulse" />
                  Active
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Offer value badge */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {offer.value || offer.type}
              </span>
              {offer.validUntil && (
                <span className="text-xs text-slate-400">Until {offer.validUntil}</span>
              )}
            </div>

            {/* Offer title */}
            <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{offer.title}</h3>

            {/* Description */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowModal(true)
              }}
              className="w-full text-left mb-3"
            >
              <p className="text-sm text-slate-400 line-clamp-2">{offer.description}</p>
              <span className="text-emerald-300 text-xs font-medium hover:text-emerald-200 transition-colors">
                View full details & terms →
              </span>
            </button>

            {/* Actions */}
            <div className="space-y-2">
              {isActive && activeUntil ? (
                <ActivationCountdownPanel
                  activeUntil={activeUntil}
                  compact
                  onExpired={() => clearActiveOffer(offer.id)}
                />
              ) : !isClaimed ? (
                <div className="flex gap-2">
                  <Button 
                    onClick={() => claimOffer(offer.id, offer.title, businessName)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    size="sm"
                  >
                    Save
                  </Button>
                  <ShareButton
                    title={`Amazing Deal: ${offer.title}`}
                    text={`Check out this exclusive offer at ${businessName}: ${offer.title}! Save ${offer.discount} - but you need Qwikker to claim it.`}
                    url={`https://${currentCity}.qwikker.com/join?ref=offer-${offer.id}`}
                    onShare={() => handleShare(offer.id, offer.title, businessName)}
                    size="sm"
                    className="border-slate-700"
                  />
                </div>
              ) : canRedeem ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAddToWallet(offer.id, offer.title, businessName)}
                    disabled={!!activating}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold disabled:opacity-60"
                    size="sm"
                  >
                    {activating?.offerId === offer.id ? 'Putting on Wallet…' : 'Redeem now'}
                  </Button>
                  <ShareButton
                    title={`Amazing Deal: ${offer.title}`}
                    text={`Check out this exclusive offer at ${businessName}: ${offer.title}! Save ${offer.discount} - but you need Qwikker to claim it.`}
                    url={`https://${currentCity}.qwikker.com/join?ref=offer-${offer.id}`}
                    onShare={() => handleShare(offer.id, offer.title, businessName)}
                    size="sm"
                    className="border-slate-700"
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    disabled
                    className="flex-1 bg-slate-800 text-slate-400 font-medium cursor-default"
                    size="sm"
                  >
                    Used
                  </Button>
                  <ShareButton
                    title={`Amazing Deal: ${offer.title}`}
                    text={`Check out this exclusive offer at ${businessName}: ${offer.title}! Save ${offer.discount} - but you need Qwikker to claim it.`}
                    url={`https://${currentCity}.qwikker.com/join?ref=offer-${offer.id}`}
                    onShare={() => handleShare(offer.id, offer.title, businessName)}
                    size="sm"
                    className="border-slate-700"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DESKTOP LAYOUT: Vertical (image top, content below) - Keep existing */}
        <div className="hidden sm:block">
          {/* Header with Image */}
          <div className="relative h-48 overflow-hidden rounded-t-xl">
            <img 
              src={businessImage} 
              alt={businessName}
              className="w-full h-full object-cover object-center transition-opacity duration-300"
              loading="lazy"
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

            {/* Tier & Status badges (top left) */}
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              {/* Tier badges first (most prominent) */}
              {offer.businessTier === 'spotlight' && (
                <span className="bg-amber-500/80 text-amber-950 text-xs px-2.5 py-1 rounded-full font-bold shadow-lg backdrop-blur-sm border border-amber-400/50">
                  QWIKKER PICK
                </span>
              )}
              {offer.businessTier === 'featured' && (
                <span className="bg-emerald-500/80 text-emerald-950 text-xs px-2.5 py-1 rounded-full font-bold shadow-lg text-center inline-flex items-center justify-center backdrop-blur-sm border border-emerald-400/50">
                  FEATURED
                </span>
              )}
              {/* Status badges */}
              {offer.isPopular && (
                <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  POPULAR
                </span>
              )}
              {offer.isEndingSoon && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse shadow-lg">
                  ENDING SOON
                </span>
              )}
            </div>

            {/* Heart favorite button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(offer.id)
              }}
              className="absolute bottom-2 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-all duration-200"
            >
              <svg 
                className={`w-4 h-4 transition-colors duration-200 ${
                  isFavorite ? 'text-red-500 fill-current' : 'text-white'
                }`} 
                fill={isFavorite ? 'currentColor' : 'none'} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>

            {/* Business name in bottom corner */}
            <div className="absolute bottom-2 left-3 right-12">
              <p className="text-white font-semibold text-sm drop-shadow-lg truncate">{businessName}</p>
              <p className="text-white/90 text-xs drop-shadow-md truncate">{offer.businessCategory}</p>
            </div>

            {isActive && (
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-emerald-950 text-xs px-2.5 py-1 rounded-full font-bold shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-950 animate-pulse" />
                  Active
                </span>
              </div>
            )}
          </div>

          <CardContent className="p-4 flex flex-col flex-grow">
            {/* Title and description - fixed height for alignment */}
            <div>
              <h3 className="text-slate-100 font-bold text-lg mb-2 line-clamp-2">{offer.title}</h3>
              {/* Fixed 2 lines for consistent card height */}
              <p className="text-slate-300 text-sm leading-relaxed mb-2 line-clamp-2">{offer.description}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowModal(true)
                }}
                className="text-emerald-300 text-xs font-medium hover:text-emerald-200 transition-colors mb-3"
              >
                ...more
              </button>
              
              {/* Value highlight */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between">
                  {(() => {
                    // Smart labeling - adapt label based on offer type
                    const value = offer.value || ''
                    const isPercentageOrDiscount = value.includes('%') || value.includes('off') || offer.type === 'percentage_off' || offer.type === 'discount'
                    const isFreebie = offer.type === 'freebie' || value.toLowerCase().includes('free')
                    
                    if (isFreebie) {
                      return (
                        <>
                          <span className="text-emerald-300 font-medium text-sm">You Get:</span>
                          <span className="text-emerald-200 font-semibold text-lg">{value}</span>
                        </>
                      )
                    } else if (isPercentageOrDiscount) {
                      return (
                        <>
                          <span className="text-emerald-300 font-medium text-sm">Your Offer:</span>
                          <span className="text-emerald-200 font-semibold text-lg">{value}</span>
                        </>
                      )
                    } else {
                      // For fixed price, 2-for-1, etc. - use generic "Offer Value"
                      return (
                        <>
                          <span className="text-emerald-300 font-medium text-sm">Offer Value:</span>
                          <span className="text-emerald-200 font-semibold text-lg">{value}</span>
                        </>
                      )
                    }
                  })()}
                </div>
              </div>
              
              {/* Valid until date only - terms are in modal */}
              {offer.validUntil && (
                <p className="text-xs text-slate-400">
                  <span className="font-medium">Valid until:</span> {offer.validUntil}
                </p>
              )}
            </div>

            {/* Action buttons - Always at bottom */}
            <div className="mt-auto space-y-2">
              {isActive && activeUntil ? (
                <ActivationCountdownPanel
                  activeUntil={activeUntil}
                  onExpired={() => clearActiveOffer(offer.id)}
                />
              ) : !isClaimed ? (
                <Button 
                  onClick={() => claimOffer(offer.id, offer.title, businessName)}
                  className="w-full h-[44px] text-base bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all duration-200"
                >
                  Save
                </Button>
              ) : canRedeem ? (
                <Button
                  onClick={() => handleAddToWallet(offer.id, offer.title, businessName)}
                  disabled={!!activating}
                  className="w-full h-[44px] text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-all duration-200 disabled:opacity-60"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {activating?.offerId === offer.id ? 'Putting on Wallet…' : 'Redeem now'}
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full h-[44px] text-base bg-slate-800 text-slate-400 font-medium cursor-default"
                >
                  Used
                </Button>
              )}
              
              {/* Share Button */}
              <ShareButton
                title={`Amazing Deal: ${offer.title}`}
                text={`Check out this exclusive offer at ${businessName}: ${offer.title}! Save ${offer.discount} - but you need Qwikker to claim it.`}
                url={`https://${currentCity}.qwikker.com/join?ref=offer-${offer.id}`}
                onShare={() => handleShare(offer.id, offer.title, businessName)}
                className="w-full"
                size="sm"
              />
            </div>
          </CardContent>
        </div>
      </Card>

      {/* OFFER DETAILS MODAL */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-700 p-6 flex items-start justify-between z-10">
              <div className="flex-1 pr-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {/* Tier badges */}
                  {offer.businessTier === 'spotlight' && (
                    <span className="bg-amber-500/80 text-amber-950 text-xs px-3 py-1 rounded-full font-bold shadow-lg backdrop-blur-sm border border-amber-400/50">
                      QWIKKER PICK
                    </span>
                  )}
                  {offer.businessTier === 'featured' && (
                    <span className="bg-emerald-500/80 text-emerald-950 text-xs px-3 py-1 rounded-full font-bold shadow-lg text-center inline-flex items-center justify-center backdrop-blur-sm border border-emerald-400/50">
                      FEATURED
                    </span>
                  )}
                  {/* Offer type badge */}
                  <span className={`${getBadgeColor(offer.type)} text-white text-xs px-3 py-1 rounded-full font-bold`}>
                    {getBadgeText()}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{offer.title}</h2>
                <p className="text-slate-400">at <span className="text-slate-300 font-medium">{businessName}</span></p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Image */}
            {businessImage && (
              <div className="relative h-64 bg-slate-900/50">
                <img
                  src={businessImage}
                  alt={offer.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Offer Value */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
                <div className="text-sm text-emerald-300 font-medium mb-2">Your Offer:</div>
                <div className="text-4xl font-semibold text-emerald-200">{offer.value}</div>
              </div>

              {/* Full Description */}
              {offer.description && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">About This Offer</h3>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{offer.description}</p>
                </div>
              )}

              {/* Validity Period */}
              {offer.validUntil && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Valid Until</h3>
                  <p className="text-slate-300">{offer.validUntil}</p>
                </div>
              )}

              {/* Terms & Conditions */}
              {(offer.termsAndConditions || offer.terms) && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-white mb-3">Terms & Conditions</h3>
                  <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {offer.termsAndConditions}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                {isActive && activeUntil ? (
                  <ActivationCountdownPanel
                    activeUntil={activeUntil}
                    onExpired={() => clearActiveOffer(offer.id)}
                  />
                ) : !isClaimed ? (
                  <Button 
                    onClick={() => {
                      claimOffer(offer.id, offer.title, businessName)
                      setShowModal(false)
                    }}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-lg rounded-xl transition-all duration-200"
                  >
                    Save
                  </Button>
                ) : canRedeem ? (
                  <Button
                    onClick={() => {
                      handleAddToWallet(offer.id, offer.title, businessName)
                      setShowModal(false)
                    }}
                    disabled={!!activating}
                    className="w-full h-12 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-lg rounded-xl transition-all duration-200 disabled:opacity-60"
                  >
                    {activating?.offerId === offer.id ? 'Putting on Wallet…' : 'Redeem now'}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-[#00d083]/25 bg-gradient-to-br from-[#00d083]/12 via-zinc-900 to-amber-500/10 px-4 py-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#00d083] font-semibold mb-1">
          Deals
        </p>
        <h1 className="text-3xl font-bold text-white tracking-tight">Offers</h1>
        <p className="text-sm text-zinc-300 mt-1.5">
          Local deals you can save and redeem
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#9dffc0] bg-[#00d083]/10 border border-[#00d083]/25 px-2.5 py-1 rounded-full">
          {liveCount} live
        </div>
      </div>

      {/* Primary: All / Saved / Active */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {(
          [
            { id: 'all' as const, label: 'All', count: liveCount, active: 'border-[#00d083]/40 bg-[#00d083]/15 text-[#9dffc0]' },
            { id: 'claimed' as const, label: 'Saved', count: savedCount, active: 'border-rose-400/40 bg-rose-500/15 text-rose-200' },
            { id: 'redeemed' as const, label: 'Active', count: activeCount, active: 'border-amber-400/40 bg-amber-500/15 text-amber-200' },
          ]
        ).map((tab) => {
          const isSelected = listMode === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setListMode(tab.id)
                resetRefineFilters()
                scrollToResults()
              }}
              className={`rounded-2xl border px-2 py-3.5 sm:px-4 text-center transition-colors shadow-sm shadow-black/20 ${
                isSelected
                  ? tab.active
                  : 'border-zinc-700/80 bg-zinc-800/90 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <p className={`text-xs font-semibold mb-0.5 ${isSelected ? '' : 'text-zinc-500'}`}>
                {tab.label}
              </p>
              <p className={`text-xl sm:text-2xl font-bold tabular-nums ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                {tab.count}
              </p>
            </button>
          )
        })}
      </div>

      {/* Collapsed filters — no sticky chip bar (avoids mobile scroll glitches) */}
      <FilterPanel
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        activeCount={offerFilterActiveCount}
        summary={offerFilterSummary}
        onClear={resetRefineFilters}
      >
        <FilterChipGroup label="Type">
          {offerTypeChips.map((chip) => {
            const isSelected = typeFilter === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setTypeFilter(chip.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  isSelected ? chip.active : CHIP_OFF
                }`}
              >
                {chip.label}
              </button>
            )
          })}
        </FilterChipGroup>

        {uniqueCategories.length > 0 && (
          <FilterChipGroup label="Category">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-white text-black border-white'
                  : CHIP_OFF
              }`}
            >
              All categories
            </button>
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedCategory === cat ? 'bg-[#00d083] text-black border-[#00d083]' : CHIP_OFF
                }`}
              >
                {cat}
                <span className="ml-1 text-[10px] opacity-70">({getCategoryCount(cat)})</span>
              </button>
            ))}
          </FilterChipGroup>
        )}
      </FilterPanel>

      <AiCompanionCard
        title="Ask Qwikker"
        prompts={[
          'Find me the best 2-for-1 deals',
          'What pizza offers are available?',
          'Show me deals ending this week',
        ]}
        walletPassId={walletPassId || undefined}
        className="border-[#00d083]/25 bg-gradient-to-r from-[#00d083]/10 via-zinc-900 to-zinc-800"
      />

      {/* Results Title */}
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-100">
          {listMode === 'claimed'
            ? 'Saved Offers'
            : listMode === 'redeemed'
              ? 'Active on your pass'
              : typeFilter === 'favorites'
                ? 'Favourite Offers'
                : typeFilter === 'ending_soon'
                  ? 'Ending Soon'
                  : typeFilter === 'two_for_one'
                    ? '2-for-1 Deals'
                    : typeFilter === 'percentage_off'
                      ? '% Off Deals'
                      : 'Available Offers'}
        </h2>
        {listMode === 'claimed' && (
          <p className="text-slate-400 text-sm text-center mt-2 max-w-md mx-auto">
            Redeem when you&apos;re at the venue — that starts the timer on your Wallet pass.
          </p>
        )}
        {listMode === 'redeemed' && (
          <p className="text-slate-400 text-sm text-center mt-2 max-w-md mx-auto">
            Show your Wallet pass to staff before the timer ends.
          </p>
        )}
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch" data-offers-results>
        {getFilteredOffers().map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>

      {/* Empty State */}
      {getFilteredOffers().length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700 text-center p-12">
          <div className="text-6xl mb-4"></div>
          {listMode === 'claimed' && typeFilter === 'all' && selectedCategory === 'all' ? (
            <>
              <h3 className="text-xl font-bold text-slate-100 mb-2">You haven&apos;t saved any offers yet</h3>
              <p className="text-slate-400 mb-4">Explore amazing deals from local businesses and start saving!</p>
              <Button onClick={() => { setListMode('all'); resetRefineFilters() }} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-slate-100">
                Explore Offers
              </Button>
            </>
          ) : listMode === 'redeemed' && typeFilter === 'all' && selectedCategory === 'all' ? (
            <>
              <h3 className="text-xl font-bold text-slate-100 mb-2">Nothing active right now</h3>
              <p className="text-slate-400 mb-4">Redeem a saved offer when you&apos;re at the venue to start the timer.</p>
              <Button onClick={() => { setListMode('claimed'); resetRefineFilters() }} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-slate-100">
                View saved
              </Button>
            </>
          ) : typeFilter === 'favorites' ? (
            <>
              <h3 className="text-xl font-bold text-slate-100 mb-2">No favourites here</h3>
              <p className="text-slate-400 mb-4">Tap the heart on offers you love — or clear this filter to browse everything.</p>
              <Button onClick={() => { setTypeFilter('all'); setSelectedCategory('all') }} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-slate-100">
                Clear favourites filter
              </Button>
            </>
          ) : realOffers.length === 0 ? (
            <>
              <h3 className="text-xl font-bold text-slate-100 mb-2">Offers are unlocking in {cityDisplayName}</h3>
              <p className="text-slate-400">Local perks appear as venues join {cityDisplayName}, and your pass updates automatically.</p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-slate-100 mb-2">No offers match your filters</h3>
              <p className="text-slate-400 mb-4">Try adjusting your filters or check back later for new deals!</p>
              <Button onClick={() => { setListMode('all'); resetRefineFilters() }} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-slate-100">
                Show All Offers
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Load More */}
      {getFilteredOffers().length > 0 && (
        <div className="text-center pt-4">
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 px-8">
            Load More Offers
          </Button>
        </div>
      )}

      {/* Redeem in progress — WalletPush morph latency */}
      {activating && !activateSuccess && (
        <OfferActivatingOverlay
          offerTitle={activating.offerTitle}
          businessName={activating.businessName}
        />
      )}

      {/* Post-Redeem confirm — live countdown, then Active filter */}
      {activateSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setActivateSuccess(null)
            setListMode('redeemed')
            resetRefineFilters()
            scrollToResults()
          }}
        >
          <div
            className="bg-zinc-800 border border-[#00d083]/30 rounded-2xl p-6 max-w-sm w-full mx-4 text-center shadow-2xl ring-1 ring-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-[#00d083] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              {activateSuccess.walletSynced ? 'Activated' : 'Activated (in-app)'}
            </h3>
            <p className="text-zinc-300 text-sm mb-1">&ldquo;{activateSuccess.offerTitle}&rdquo;</p>
            <p className="text-zinc-400 text-xs mb-4">at {activateSuccess.businessName}</p>

            <ActivationCountdownPanel
              activeUntil={activateSuccess.activeUntil}
              onExpired={() => clearActiveOffer(activateSuccess.offerId)}
            />

            {!activateSuccess.walletSynced && (
              <p className="text-amber-200 text-xs mt-3">
                Wallet sync is delayed — show this screen or try opening your pass shortly.
              </p>
            )}

            <p className="text-slate-400 text-xs mt-3 mb-5">
              {activateSuccess.message || 'Show your Qwikker pass to staff before the timer ends.'}
            </p>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl"
              onClick={() => {
                setActivateSuccess(null)
                setListMode('redeemed')
                resetRefineFilters()
                scrollToResults()
              }}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

