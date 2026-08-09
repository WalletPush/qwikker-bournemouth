'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShareButton } from '@/components/ui/share-button'
import { AiCompanionCard } from '@/components/ui/ai-companion-card'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import AddToWalletButton from '@/components/ui/add-to-wallet-button'
import { useSearchParams } from 'next/navigation'
import { SYSTEM_CATEGORY_LABEL } from '@/lib/constants/system-categories'
import { getClientCityFallback, getCityDisplayName as getClientCityDisplayName } from '@/lib/utils/client-city-detection'
import { ActivationCountdownPanel } from '@/components/user/activation-countdown-panel'

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
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAllCategories, setShowAllCategories] = useState(false) // NEW: Show More toggle
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

  // Auto-claim + add to wallet when a non-pass-holder followed a landing-page
  // "Claim this offer" deep link: /join?returnTo=/user/offers?autoClaim={offerId}.
  // After the pass is installed they land here; we claim, push to wallet, drop an
  // in-app notification, confirm on-screen, then strip the param. Runs once.
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
          'Added to your wallet!',
          `"${offerTitle}" from ${businessName} is now in your wallet. Explore more local offers below.`,
          () => setSelectedFilter('all')
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

  // Handle auto-scroll to specific highlighted business
  useEffect(() => {
    if (highlightBusiness) {
      const scrollTimer = setTimeout(() => {
        const businessSlug = highlightBusiness.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const targetCard = cardRefs.current[businessSlug]
        
        if (targetCard) {
          targetCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          })
          setHighlightedCard(businessSlug)
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
    return allOffers.filter(o => o.businessCategory === category && !claimedOffers.has(o.id)).length
  }
  
  const activeOfferIds = Object.keys(activeByOfferId).filter((id) => isOfferActive(id))

  // Dynamic filter counts that update with state changes
  const getFilters = () => [
    { id: 'all', label: 'All Offers', count: allOffers.length },
    { id: 'claimed', label: 'Saved', count: Array.from(claimedOffers).filter(id => {
      const offer = allOffers.find(o => o.id === id)
      return offer && !isOfferActive(id)
    }).length },
    { id: 'redeemed', label: 'Active', count: activeOfferIds.filter(id => {
      return allOffers.find(o => o.id === id) !== undefined
    }).length },
    { id: 'favorites', label: 'My Favorites', count: Array.from(favoriteOffers).filter(id => {
      return allOffers.find(o => o.id === id) !== undefined
    }).length },
    { id: 'popular', label: 'Popular', count: allOffers.filter(o => o.isPopular).length },
    { id: 'ending_soon', label: 'Ending Soon', count: allOffers.filter(o => o.isEndingSoon).length },
    { id: 'two_for_one', label: '2-for-1', count: allOffers.filter(o => o.type === 'two_for_one').length },
    { id: 'percentage_off', label: 'Percentage Off', count: allOffers.filter(o => o.type === 'percentage_off').length },
  ]

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
    modal.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4 transform scale-95 transition-transform duration-300 shadow-2xl'
    modal.innerHTML = `
      <div class="text-center">
        <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-slate-100 mb-2">Saved</h3>
        <p class="text-slate-300 mb-1">"${offerTitle}"</p>
        <p class="text-slate-400 text-sm mb-2">from ${businessName}</p>
        <p class="text-slate-300 text-sm mb-6">Redeem when you're ready to show staff.</p>
        
        <div class="space-y-3">
          <button id="redeem-now" class="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200">
            Redeem now
          </button>
          
          <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-3 mb-2">
            <p class="text-amber-200 text-sm font-semibold text-center mb-1">About ${windowMins} minutes on your Wallet</p>
            <p class="text-amber-100 text-xs text-center">Only redeem when you're ready to show staff. After that it clears from your pass.</p>
          </div>

          <button id="view-saved" class="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 px-6 rounded-xl transition-colors duration-200">
            View saved
          </button>
          
          <button id="modal-dismiss" class="w-full bg-slate-600 hover:bg-slate-500 text-slate-200 font-medium py-2.5 px-6 rounded-xl transition-colors duration-200">
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
      setSelectedFilter('claimed')
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

    // Filter by type
    if (selectedFilter === 'claimed') {
      // Saved but not currently in an activation window
      filtered = filtered.filter((o) => {
        const isClaimed = claimedOffers.has(o.id)
        return isClaimed && !isOfferActive(o.id)
      })
    } else if (selectedFilter === 'redeemed') {
      // Currently active activation (any claim type)
      filtered = filtered.filter((o) => isOfferActive(o.id))
    } else {
      // For ALL other filters, show available offers
      // Hide claimed offers AND single-use offers that have been activated (even if window ended)
      filtered = filtered.filter((o) => {
        if (claimedOffers.has(o.id)) return false
        if (isOfferActive(o.id) && o.claimType === 'single') return false
        return true
      })
      
      // Then apply specific filters
      if (selectedFilter === 'favorites') {
      filtered = filtered.filter(o => favoriteOffers.has(o.id))
    } else if (selectedFilter === 'ending_soon') {
      filtered = filtered.filter(o => o.isEndingSoon)
    } else if (selectedFilter === 'two_for_one') {
      filtered = filtered.filter(o => o.type === 'two_for_one')
    } else if (selectedFilter === 'percentage_off') {
      filtered = filtered.filter(o => o.type === 'percentage_off')
      }
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(o => o.businessCategory === selectedCategory)
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
        ref={(el) => { cardRefs.current[businessSlug] = el }}
        data-offer-card
        className={`bg-gradient-to-br from-slate-800/60 to-slate-700/40 border-slate-700/50 hover:border-green-500/30 transition-all duration-300 overflow-hidden group h-full flex flex-col ${
          isActive ? 'ring-1 ring-emerald-500/40' : ''
        } ${
          highlightedCard === businessSlug
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
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold"
                    size="sm"
                  >
                    Redeem now
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
                  className="w-full h-[44px] text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-all duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Redeem now
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
                    className="w-full h-12 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-lg rounded-xl transition-all duration-200"
                  >
                    Redeem now
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
    <div className="space-y-6">
      {/* Page Header - Simple and Clean */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">
          Your Exclusive Offers
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Save money while discovering amazing local businesses
        </p>
      </div>

      {/* Clickable Filter Cards - Mobile First */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        <Card 
          className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
            selectedFilter === 'all' 
              ? 'bg-gradient-to-br from-blue-600/30 to-blue-500/30 border-blue-400/50 ring-2 ring-blue-400/30' 
              : 'bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-blue-700/30 hover:border-blue-600/50'
          }`}
          onClick={() => {
            setSelectedFilter('all')
            scrollToResults()
          }}
        >
          <p className="text-base sm:text-lg font-semibold text-blue-300 mb-1">Total Offers</p>
          <p className="text-lg font-bold text-blue-400">{allOffers.filter(o => !claimedOffers.has(o.id)).length}</p>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
            selectedFilter === 'percentage_off' 
              ? 'bg-gradient-to-br from-green-600/30 to-green-500/30 border-green-400/50 ring-2 ring-green-400/30' 
              : 'bg-gradient-to-br from-green-900/20 to-green-800/20 border-green-700/30 hover:border-green-600/50'
          }`}
          onClick={() => {
            setSelectedFilter('percentage_off')
            scrollToResults()
          }}
        >
          <p className="text-base sm:text-lg font-semibold text-green-300 mb-1">% Off Deals</p>
          <p className="text-lg font-bold text-green-400">{allOffers.filter(o => o.type === 'percentage_off' && !claimedOffers.has(o.id)).length}</p>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
            selectedFilter === 'two_for_one' 
              ? 'bg-gradient-to-br from-purple-600/30 to-purple-500/30 border-purple-400/50 ring-2 ring-purple-400/30' 
              : 'bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-700/30 hover:border-purple-600/50'
          }`}
          onClick={() => {
            setSelectedFilter('two_for_one')
            scrollToResults()
          }}
        >
          <p className="text-base sm:text-lg font-semibold text-purple-300 mb-1">2-for-1 Deals</p>
          <p className="text-lg font-bold text-purple-400">{allOffers.filter(o => o.type === 'two_for_one' && !claimedOffers.has(o.id)).length}</p>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
            selectedFilter === 'ending_soon' 
              ? 'bg-gradient-to-br from-red-600/30 to-red-500/30 border-red-400/50 ring-2 ring-red-400/30' 
              : 'bg-gradient-to-br from-red-900/20 to-red-800/20 border-red-700/30 hover:border-red-600/50'
          }`}
          onClick={() => {
            setSelectedFilter('ending_soon')
            scrollToResults()
          }}
        >
          <p className="text-base sm:text-lg font-semibold text-red-300 mb-1">Ending Soon</p>
          <p className="text-lg font-bold text-red-400">{allOffers.filter(o => o.isEndingSoon && !claimedOffers.has(o.id)).length}</p>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
            selectedFilter === 'claimed' 
              ? 'bg-gradient-to-br from-amber-600/30 to-amber-500/30 border-amber-400/50 ring-2 ring-amber-400/30' 
              : 'bg-gradient-to-br from-amber-900/20 to-amber-800/20 border-amber-700/30 hover:border-amber-600/50'
          }`}
          onClick={() => {
            setSelectedFilter('claimed')
            scrollToResults()
          }}
        >
          <p className="text-base sm:text-lg font-semibold text-amber-300 mb-1">Saved</p>
          <p className="text-lg font-bold text-amber-400">{Array.from(claimedOffers).filter(id => !isOfferActive(id)).length}</p>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
            selectedFilter === 'redeemed' 
              ? 'bg-gradient-to-br from-emerald-600/30 to-emerald-500/30 border-emerald-400/50 ring-2 ring-emerald-400/30' 
              : 'bg-gradient-to-br from-emerald-900/20 to-emerald-800/20 border-emerald-700/30 hover:border-emerald-600/50'
          }`}
          onClick={() => {
            setSelectedFilter('redeemed')
            scrollToResults()
          }}
        >
          <p className="text-base sm:text-lg font-semibold text-emerald-300 mb-1">Active</p>
          <p className="text-lg font-bold text-emerald-400">{activeOfferIds.length}</p>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
            selectedFilter === 'favorites' 
              ? 'bg-gradient-to-br from-pink-600/30 to-pink-500/30 border-pink-400/50 ring-2 ring-pink-400/30' 
              : 'bg-gradient-to-br from-pink-900/20 to-pink-800/20 border-pink-700/30 hover:border-pink-600/50'
          }`}
          onClick={() => {
            setSelectedFilter('favorites')
            scrollToResults()
          }}
        >
          <p className="text-base sm:text-lg font-semibold text-pink-300 mb-1">Favourites</p>
          <p className="text-lg font-bold text-pink-400">{Array.from(favoriteOffers).filter(id => allOffers.find(o => o.id === id)).length}</p>
        </Card>
      </div>

      {/* Category Filter Pills */}
      {uniqueCategories.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Filter by Category</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedCategory('all')
                scrollToResults()
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-[#00d083] text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              All <span className="hidden sm:inline">({allOffers.filter(o => !claimedOffers.has(o.id)).length})</span>
            </button>
            {(showAllCategories ? uniqueCategories : uniqueCategories.slice(0, 5)).map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat)
                  scrollToResults()
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#00d083] text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {cat} <span className="hidden sm:inline">({getCategoryCount(cat)})</span>
              </button>
            ))}
            {uniqueCategories.length > 5 && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-slate-800/50 text-slate-400 hover:bg-slate-700 border border-slate-700/50 hover:border-slate-600"
              >
                {showAllCategories ? '← Show Less' : `More (${uniqueCategories.length - 5}) →`}
              </button>
            )}
          </div>
        </div>
      )}


      {/* AI Companion Card - Replace Search & Filters */}
      <div className="mb-4">
        <AiCompanionCard 
          title="Find Your Perfect Deal"
          description="Skip the searching - just tell our AI what you're craving! From specific cuisines to budget ranges, we'll find the perfect offers for you instantly."
          prompts={[
            "Find me the best 2-for-1 deals",
            "What pizza offers are available?", 
            "Show me deals ending this week"
          ]}
          walletPassId={walletPassId || undefined}
        />
      </div>

      {/* Results Title - Centered */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-100">
          {selectedFilter === 'all' ? 'All Available Offers' :
           selectedFilter === 'claimed' ? 'Saved Offers' :
           selectedFilter === 'redeemed' ? 'Active on your pass' :
           selectedFilter === 'favorites' ? 'My Favourite Offers' :
           selectedFilter === 'ending_soon' ? 'Ending Soon' :
           selectedFilter === 'two_for_one' ? '2-for-1 Deals' :
           'Percentage Off Deals'}
        </h2>
        {selectedFilter === 'claimed' && (
          <p className="text-slate-400 text-sm text-center mt-3 max-w-md mx-auto">
            Redeem when you&apos;re at the venue — that starts the timer on your Wallet pass.
          </p>
        )}
        {selectedFilter === 'redeemed' && (
          <p className="text-slate-400 text-sm text-center mt-3 max-w-md mx-auto">
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
          {selectedFilter === 'claimed' ? (
            <>
              <h3 className="text-xl font-bold text-slate-100 mb-2">You haven&apos;t saved any offers yet</h3>
              <p className="text-slate-400 mb-4">Explore amazing deals from local businesses and start saving!</p>
              <Button onClick={() => {setSelectedFilter('all'); setSelectedCategory('all')}} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-slate-100">
                Explore Offers
              </Button>
            </>
          ) : selectedFilter === 'redeemed' ? (
            <>
              <h3 className="text-xl font-bold text-slate-100 mb-2">Nothing active right now</h3>
              <p className="text-slate-400 mb-4">Redeem a saved offer when you&apos;re at the venue to start the timer.</p>
              <Button onClick={() => {setSelectedFilter('claimed'); setSelectedCategory('all')}} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-slate-100">
                View saved
              </Button>
            </>
          ) : selectedFilter === 'favorites' ? (
            <>
              <h3 className="text-xl font-bold text-slate-100 mb-2">You haven't favourited any offers yet</h3>
              <p className="text-slate-400 mb-4">Tap the heart icon on offers you love to save them here!</p>
              <Button onClick={() => {setSelectedFilter('all'); setSelectedCategory('all')}} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-slate-100">
                Browse Offers
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
              <Button onClick={() => {setSelectedFilter('all'); setSelectedCategory('all')}} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-slate-100">
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

      {/* Post-Redeem confirm — live countdown, then Active filter */}
      {activateSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setActivateSuccess(null)
            setSelectedFilter('redeemed')
            scrollToResults()
          }}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-1">
              {activateSuccess.walletSynced ? 'Activated' : 'Activated (in-app)'}
            </h3>
            <p className="text-slate-300 text-sm mb-1">&ldquo;{activateSuccess.offerTitle}&rdquo;</p>
            <p className="text-slate-400 text-xs mb-4">at {activateSuccess.businessName}</p>

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
                setSelectedFilter('redeemed')
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

