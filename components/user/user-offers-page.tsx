'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShareButton } from '@/components/ui/share-button'
import { mockOffers, mockBusinesses, mockClaimedOffers } from '@/lib/mock-data/user-mock-data'
import { AiCompanionCard } from '@/components/ui/ai-companion-card'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import AddToWalletButton from '@/components/ui/add-to-wallet-button'
import { useSearchParams } from 'next/navigation'

interface UserOffersPageProps {
  realOffers?: any[]
  walletPassId?: string
}

export function UserOffersPage({ realOffers = [], walletPassId: propWalletPassId }: UserOffersPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const searchParams = useSearchParams()
  const urlWalletPassId = searchParams.get('wallet_pass_id')
  // Use prop first, then URL, then null - this ensures consistency with server-side logic
  const walletPassId = propWalletPassId || urlWalletPassId
  const highlightBusiness = searchParams.get('highlight') // For QR deep linking
  
  // Initialize with empty sets to avoid hydration mismatch
  const [favoriteOffers, setFavoriteOffers] = useState<Set<string>>(new Set())
  const [claimedOffers, setClaimedOffers] = useState<Set<string>>(new Set())
  const [walletOffers, setWalletOffers] = useState<Set<string>>(new Set())
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  
  // Helper function to scroll to results after filter change
  const scrollToResults = () => {
    setTimeout(() => {
      const resultsSection = document.querySelector('[data-offers-results]')
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }
  
  // Combine real offers with mock offers
  const allOffers = [...realOffers, ...mockOffers]

  // Load from localStorage after component mounts
  useEffect(() => {
    const userId = walletPassId || 'anonymous-user'
    
    const savedFavorites = localStorage.getItem(`qwikker-favorites-${userId}`)
    const savedClaimed = localStorage.getItem(`qwikker-claimed-${userId}`)
    const savedWallet = localStorage.getItem(`qwikker-wallet-${userId}`)
    
    if (savedFavorites) {
      setFavoriteOffers(new Set(JSON.parse(savedFavorites)))
    }
    if (savedClaimed) {
      setClaimedOffers(new Set(JSON.parse(savedClaimed)))
    }
    if (savedWallet) {
      setWalletOffers(new Set(JSON.parse(savedWallet)))
    }
  }, [walletPassId])

  // Clean up expired offer IDs from localStorage
  useEffect(() => {
    if (allOffers.length === 0) return
    
    const userId = walletPassId || 'anonymous-user'
    const activeOfferIds = new Set(allOffers.map(o => o.id))
    
    // Clean up favorites
    const updatedFavorites = Array.from(favoriteOffers).filter(id => activeOfferIds.has(id))
    if (updatedFavorites.length !== favoriteOffers.size) {
      setFavoriteOffers(new Set(updatedFavorites))
      localStorage.setItem(`qwikker-favorites-${userId}`, JSON.stringify(updatedFavorites))
    }
    
    // Clean up claimed
    const updatedClaimed = Array.from(claimedOffers).filter(id => activeOfferIds.has(id))
    if (updatedClaimed.length !== claimedOffers.size) {
      setClaimedOffers(new Set(updatedClaimed))
      localStorage.setItem(`qwikker-claimed-${userId}`, JSON.stringify(updatedClaimed))
    }
    
    // Clean up wallet
    const updatedWallet = Array.from(walletOffers).filter(id => activeOfferIds.has(id))
    if (updatedWallet.length !== walletOffers.size) {
      setWalletOffers(new Set(updatedWallet))
      localStorage.setItem(`qwikker-wallet-${userId}`, JSON.stringify(updatedWallet))
    }
  }, [allOffers, favoriteOffers, claimedOffers, walletOffers, walletPassId])

  // Handle auto-scroll to specific highlighted business
  useEffect(() => {
    if (highlightBusiness) {
      const scrollTimer = setTimeout(() => {
        // Convert highlight business to slug format (same as in OfferCard)
        const businessSlug = highlightBusiness.toLowerCase().replace(/[^a-z0-9]/g, '-')
        
        // Find the specific business card using the ref
        const targetCard = cardRefs.current[businessSlug]
        
        if (targetCard) {
          // Scroll to the specific business's offer card
          targetCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          })
        } else {
          // Fallback: scroll to first offer if specific business not found
          const firstCard = document.querySelector('[data-offer-card]')
          if (firstCard) {
            firstCard.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            })
          }
        }
      }, 300) // Slightly longer delay to ensure cards are rendered
      
      return () => clearTimeout(scrollTimer)
    }
  }, [highlightBusiness, allOffers]) // Include allOffers to re-run when offers load
  
  // Get unique categories from all businesses
  const realCategories = realOffers.map(o => o.businessCategory).filter(Boolean)
  const mockCategories = mockBusinesses.map(b => b.category)
  const categories = ['all', ...Array.from(new Set([...realCategories, ...mockCategories]))]
  
  // Dynamic filter counts that update with state changes
  const getFilters = () => [
    { id: 'all', label: 'All Offers', count: allOffers.length },
    { id: 'claimed', label: 'My Claimed', count: Array.from(claimedOffers).filter(id => {
      const offer = allOffers.find(o => o.id === id)
      // Only count if offer exists (not expired) AND (not in wallet OR is multiple-use)
      return offer && (!walletOffers.has(id) || offer?.claimType !== 'single')
    }).length },
    { id: 'redeemed', label: 'My Redeemed', count: Array.from(walletOffers).filter(id => {
      const offer = allOffers.find(o => o.id === id)
      // Only count if offer exists (not expired) AND is single-use
      return offer && offer?.claimType === 'single'
    }).length },
    { id: 'favorites', label: 'My Favorites', count: Array.from(favoriteOffers).filter(id => {
      // Only count favorites that are still active (not expired)
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
    
    // Find the offer to get its claim type
    const offer = allOffers.find(o => o.id === offerId)
    const claimType = offer?.claimType || offer?.offer_claim_amount || 'single'
    
    // Update UI immediately
    setClaimedOffers(prev => {
      const newClaimed = new Set([...prev, offerId])
      // Save to localStorage as backup
      if (typeof window !== 'undefined') {
        localStorage.setItem(`qwikker-claimed-${userId}`, JSON.stringify([...newClaimed]))
        
        // Track badge progress
        const { getBadgeTracker } = require('@/lib/utils/simple-badge-tracker')
        const badgeTracker = getBadgeTracker(walletPassId)
        badgeTracker.trackAction('offer_claimed')
      }
      return newClaimed
    })
    
    // Store in database AND update wallet pass
    try {
      const { claimOffer: claimOfferAction } = await import('@/lib/actions/offer-claim-actions')
      const result = await claimOfferAction({
        offerId,
        offerTitle,
        businessName,
        visitorWalletPassId: walletPassId
      })
      
      // Show success message - wallet pass should be updated
      console.log('✅ Offer claimed and wallet pass updated:', result)
      console.log('📊 Full result data:', JSON.stringify(result, null, 2))
    } catch (error) {
      console.error('Failed to claim offer:', error)
      // UI already updated, so don't fail the user experience
    }
    // Create center modal popup with three action buttons
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
        <h3 class="text-xl font-bold text-slate-100 mb-2">Offer Claimed!</h3>
        <p class="text-slate-300 mb-1">"${offerTitle}"</p>
        <p class="text-slate-400 text-sm mb-2">from ${businessName}</p>
        <p class="text-slate-300 text-sm mb-6">What would you like to do next?</p>
        
        <div class="space-y-3">
          <button id="view-claimed" class="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            View Claimed Offers
          </button>
          
          <button id="add-to-wallet" class="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Add to Wallet
          </button>
          
          <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-3 mb-2">
            <p class="text-amber-200 text-sm font-semibold text-center mb-1">Important: 12-Hour Expiry</p>
            <p class="text-amber-100 text-xs text-center">Once added to your wallet, this offer will automatically expire after 12 hours</p>
          </div>
          
          <button id="modal-dismiss" class="w-full bg-slate-600 hover:bg-slate-500 text-slate-200 font-medium py-2.5 px-6 rounded-xl transition-colors duration-200">
            Dismiss
          </button>
        </div>
      </div>
    `
    
    modalOverlay.appendChild(modal)
    document.body.appendChild(modalOverlay)
    
    // Animate in
    setTimeout(() => {
      modalOverlay.style.opacity = '1'
      modal.style.transform = 'scale(1)'
    }, 50)
    
    // Close modal function
    const closeModal = () => {
      modalOverlay.style.opacity = '0'
      modal.style.transform = 'scale(0.95)'
      setTimeout(() => {
        if (document.body.contains(modalOverlay)) {
          document.body.removeChild(modalOverlay)
        }
      }, 300)
    }
    
    // Button event handlers
    modal.querySelector('#view-claimed')?.addEventListener('click', () => {
      closeModal()
      // Navigate to claimed offers
      setSelectedFilter('claimed')
    })
    
    modal.querySelector('#add-to-wallet')?.addEventListener('click', async () => {
      closeModal()
      
      // Check if already in wallet
      if (walletOffers.has(offerId)) {
        alert('This offer is already in your wallet!')
        return
      }
      
      // Trigger wallet pass update directly
      try {
        const response = await fetch('/api/walletpass/update-main-pass', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userWalletPassId: walletPassId,
            currentOffer: offerTitle,
            offerDetails: { businessName, offerId }
          })
        })
        
        if (response.ok) {
          // Mark as added to wallet
          setWalletOffers(prev => {
            const newWallet = new Set([...prev, offerId])
            if (typeof window !== 'undefined') {
              const userId = walletPassId || 'anonymous-user'
              localStorage.setItem(`qwikker-wallet-${userId}`, JSON.stringify([...newWallet]))
            }
            return newWallet
          })
          
          // Handle different claim types
          if (claimType === 'single') {
            // Single-use offers: Remove from claimed (they disappear forever)
            setClaimedOffers(prev => {
              const newClaimed = new Set([...prev])
              newClaimed.delete(offerId)
              if (typeof window !== 'undefined') {
                localStorage.setItem(`qwikker-claimed-${userId}`, JSON.stringify([...newClaimed]))
              }
              return newClaimed
            })
            
            // Show success and navigate back to offers
            showSuccessMessage('Added to Wallet!', 'This single-use offer has been added to your wallet and will expire in 12 hours.', () => {
              setSelectedFilter('all') // Go back to main offers
            })
          } else {
            // Multiple-use offers: Keep in claimed, but remove from current view and go back to offers
            showSuccessMessage('Added to Wallet!', 'This offer has been added to your wallet and will expire in 12 hours. You can claim it again later!', () => {
              setSelectedFilter('all') // Go back to main offers
            })
          }
        } else {
          throw new Error('Failed to update wallet pass')
        }
      } catch (error) {
        console.error('Error adding to wallet:', error)
        alert('Sorry, there was an error adding the offer to your wallet. Please try again.')
      }
    })
    
    modal.querySelector('#modal-dismiss')?.addEventListener('click', closeModal)
    
    // Close on overlay click
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

  // Handle adding offer to wallet
  const handleAddToWallet = async (offerId: string, offerTitle: string, businessName: string) => {
    if (walletOffers.has(offerId)) {
      alert('This offer is already in your wallet!')
      return
    }
    
    try {
      const response = await fetch('/api/walletpass/update-main-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWalletPassId: walletPassId,
          currentOffer: offerTitle,
          offerDetails: { businessName, offerId }
        })
      })
      
      if (response.ok) {
        // Update database status to 'wallet_added'
        try {
          const { updateOfferClaimStatus } = await import('@/lib/actions/offer-claim-actions')
          await updateOfferClaimStatus(offerId, walletPassId, 'wallet_added')
        } catch (error) {
          console.error('Failed to update claim status in database:', error)
        }
        
        // Mark as added to wallet in UI state
        setWalletOffers(prev => {
          const newWallet = new Set([...prev, offerId])
          if (typeof window !== 'undefined') {
            const userId = walletPassId || 'anonymous-user'
            localStorage.setItem(`qwikker-wallet-${userId}`, JSON.stringify([...newWallet]))
          }
          return newWallet
        })
        
        // Find the offer to check claim type
        const offer = allOffers.find(o => o.id === offerId)
        const claimType = offer?.claimType || 'single'
        
        if (claimType === 'single') {
          // Single-use offers: Remove from claimed (move to redeemed)
          setClaimedOffers(prev => {
            const newClaimed = new Set([...prev])
            newClaimed.delete(offerId)
            if (typeof window !== 'undefined') {
              const userId = walletPassId || 'anonymous-user'
              localStorage.setItem(`qwikker-claimed-${userId}`, JSON.stringify([...newClaimed]))
            }
            return newClaimed
          })
          
          showSuccessMessage('Added to Wallet!', 'This offer has been redeemed and moved to "My Redeemed" section. It will expire in 12 hours.')
        } else {
          // Multiple-use offers: Keep in claimed
          showSuccessMessage('Added to Wallet!', 'This offer has been added to your wallet and will expire in 12 hours. You can claim it again later!')
        }
      } else {
        throw new Error('Failed to update wallet pass')
      }
    } catch (error) {
      console.error('Error adding to wallet:', error)
      alert('Sorry, there was an error adding the offer to your wallet. Please try again.')
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
      // Show claimed offers that are either: not in wallet OR multiple-use
      filtered = filtered.filter(o => {
        const isClaimed = claimedOffers.has(o.id)
        const isInWallet = walletOffers.has(o.id)
        const isMultipleUse = o.claimType !== 'single'
        
        return isClaimed && (!isInWallet || isMultipleUse)
      })
    } else if (selectedFilter === 'redeemed') {
      // Show offers that are in wallet AND single-use (redeemed)
      filtered = filtered.filter(o => {
        const isInWallet = walletOffers.has(o.id)
        const isSingleUse = o.claimType === 'single'
        
        return isInWallet && isSingleUse
      })
    } else {
      // For ALL other filters, show available offers
      // Hide claimed offers AND single-use wallet offers
      filtered = filtered.filter(o => {
        // Hide claimed offers (they're in "My Claimed")
        if (claimedOffers.has(o.id)) return false
        
        // Hide single-use offers that are in wallet (they disappear forever)
        if (walletOffers.has(o.id) && o.claimType === 'single') return false
        
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
      // For real offers, filter by businessCategory
      // For mock offers, filter by business category from mockBusinesses
      filtered = filtered.filter(o => {
        if (o.businessCategory) {
          // Real offer
          return o.businessCategory === selectedCategory
        } else {
          // Mock offer - find business in mockBusinesses
          const business = mockBusinesses.find(b => b.id === o.businessId)
          return business?.category === selectedCategory
        }
      })
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
    
    // Distinguish real vs mock offers: real offers have 'image' property from transformation, mock offers don't
    const isRealOffer = !!offer.image
    const business = isRealOffer ? null : mockBusinesses.find(b => b.id === offer.businessId)
    const businessName = offer.businessName || business?.name || 'Unknown Business'
    
    // Create business slug for ref and highlighting
    const businessSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    
    // Fix image selection: for real offers use offer.image (from transformation), for mock offers use business.images[0]
    const businessImage = isRealOffer
      ? (offer.image || '/placeholder-business.jpg') 
      : (business?.images?.[0] || '/placeholder-business.jpg')
    
    // DEBUG: Log image selection for mock offers
    if (!isRealOffer) {
      console.log('🖼️ Mock offer image debug:', {
        offerTitle: offer.title,
        businessId: offer.businessId,
        businessFound: !!business,
        businessName: business?.name,
        businessImages: business?.images,
        finalImage: businessImage
      })
    }
    
    const businessRating = offer.businessRating || business?.rating || 4.5
    
    // Generate badge for real offers based on type, use existing badge for mock offers
    const getBadgeText = () => {
      if (!isRealOffer && offer.badge) return offer.badge // Mock offers have badge
      
      // Generate badge for real offers based on type
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
    const isInWallet = walletOffers.has(offer.id)
    const claimedOfferData = mockClaimedOffers.find(co => co.offerId === offer.id)
    
    return (
      <>
      <Card 
        ref={(el) => { cardRefs.current[businessSlug] = el }}
        data-offer-card
        className={`bg-gradient-to-br from-slate-800/60 to-slate-700/40 border-slate-700/50 hover:border-green-500/30 transition-all duration-300 overflow-hidden group h-full flex flex-col ${
          isInWallet 
            ? 'opacity-50 blur-[1px] pointer-events-none relative' 
            : ''
        }`}
      >
        {/* Header with Image */}
        <div className="relative h-52 sm:h-48 overflow-hidden rounded-t-xl">
          <img 
            src={businessImage} 
            alt={businessName}
            className="w-full h-full object-cover object-center transition-opacity duration-300"
            loading="lazy"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          
          {/* Offer type badge (top right) */}
          <div className="absolute top-3 right-3">
            <span className={`${getBadgeColor(offer.type)} text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg`}>
              {getBadgeText()}
            </span>
          </div>

          {/* Status badges (top left) */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
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
            <p className="text-white/80 text-xs drop-shadow-md truncate">{isRealOffer ? offer.businessCategory : business?.category}</p>
          </div>

          {/* In Wallet Badge */}
          {isInWallet && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-blue-500 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Added to Wallet
              </div>
            </div>
          )}
        </div>

        <CardContent className="p-3 sm:p-4 flex flex-col flex-grow">
          {/* Title and description - flexible content */}
          <div className="flex-grow">
            <h3 className="text-slate-100 font-bold text-lg mb-2">{offer.title}</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-3 line-clamp-2">{offer.description}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowModal(true)
              }}
              className="text-[#00d083] text-xs font-medium hover:text-[#00b86f] transition-colors mb-3"
            >
              ...more
            </button>
            
            {/* Value highlight */}
            <div className="bg-gradient-to-r from-green-500/15 to-emerald-500/15 border border-green-500/25 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-green-300 font-semibold">You Save:</span>
                <span className="text-green-400 font-bold text-lg">{offer.value}</span>
            </div>
          </div>

          {/* Clean Terms & Expiry */}
          <div className="mb-4 text-xs text-slate-400 space-y-1">
            <p><span className="font-medium">Terms:</span> {isRealOffer ? (offer.termsAndConditions || 'Standard terms apply') : (offer.terms || 'Standard terms apply')}</p>
            <p><span className="font-medium">Valid until:</span> {isRealOffer ? (offer.validUntil || 'No expiry date') : (offer.expiryDate || 'No expiry date')}</p>
            </div>
          </div>

          {/* Action buttons - Always at bottom */}
          <div className="mt-auto space-y-2">
            {!isClaimed ? (
              <Button 
                onClick={() => claimOffer(offer.id, offer.title, businessName)}
                className="w-full h-[44px] bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20"
              >
                Claim Offer
              </Button>
            ) : (
              isInWallet ? (
                <Button
                  disabled
                  className="w-full h-[44px] bg-green-600 text-white font-semibold cursor-default opacity-75"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Added to Wallet
                </Button>
              ) : (
                <Button
                  onClick={() => handleAddToWallet(offer.id, offer.title, businessName)}
                  className="w-full h-[44px] bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add to Wallet
                </Button>
              )
            )}
            
            {/* Share Button */}
            <ShareButton
              title={`Amazing Deal: ${offer.title}`}
              text={`Check out this exclusive offer at ${businessName}: ${offer.title}! Save ${offer.discount} - but you need Qwikker to claim it.`}
              url={`https://bournemouth.qwikker.com/join?ref=offer-${offer.id}`} // TODO: Make dynamic
              onShare={() => handleShare(offer.id, offer.title, businessName)}
              className="w-full"
              size="sm"
            />
          </div>
        </CardContent>
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
                <div className={`inline-block ${getBadgeColor(offer.type)} text-white text-xs px-3 py-1 rounded-full font-bold mb-3`}>
                  {(() => {
                    if (!isRealOffer && offer.badge) return offer.badge
                    switch (offer.type) {
                      case 'two_for_one': return '2-FOR-1'
                      case 'percentage_off': return `${offer.value}`
                      case 'freebie': return 'FREE ITEM'
                      case 'discount': return 'DISCOUNT'
                      default: return 'OFFER'
                    }
                  })()}
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
              <div className="bg-gradient-to-r from-green-500/15 to-emerald-500/15 border border-green-500/25 rounded-xl p-6 text-center">
                <div className="text-sm text-green-300 font-semibold mb-2">You Save:</div>
                <div className="text-4xl font-bold text-green-400">{offer.value}</div>
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
                    {isRealOffer ? offer.termsAndConditions : offer.terms}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                {!isClaimed ? (
                  <Button 
                    onClick={() => {
                      claimOffer(offer.id, offer.title, businessName)
                      setShowModal(false)
                    }}
                    className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg rounded-xl"
                  >
                    Claim Offer
                  </Button>
                ) : (
                  !isInWallet && (
                    <Button
                      onClick={() => {
                        handleAddToWallet(offer.id, offer.title, businessName)
                        setShowModal(false)
                      }}
                      className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-lg rounded-xl"
                    >
                      Add to Wallet
                    </Button>
                  )
                )}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
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
          <p className="text-base sm:text-lg font-semibold text-amber-300 mb-1">My Claimed</p>
          <p className="text-lg font-bold text-amber-400">{Array.from(claimedOffers).filter(id => !walletOffers.has(id)).length}</p>
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
          walletPassId={walletPassId}
        />
      </div>

      {/* Results Title - Centered */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-100">
          {selectedFilter === 'all' ? 'All Available Offers' :
           selectedFilter === 'claimed' ? 'My Claimed Offers' :
           selectedFilter === 'favorites' ? 'My Favourite Offers' :
           selectedFilter === 'ending_soon' ? 'Ending Soon' :
           selectedFilter === 'two_for_one' ? '2-for-1 Deals' :
           'Percentage Off Deals'}
        </h2>
        {selectedFilter === 'claimed' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mt-4 max-w-md mx-auto">
            <p className="text-amber-200 text-base font-semibold text-center mb-2">Important: 12-Hour Expiry</p>
            <p className="text-amber-100 text-sm text-center">Offers automatically expire 12 hours after being added to your wallet</p>
        </div>
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
              <h3 className="text-xl font-bold text-slate-100 mb-2">You haven't claimed any offers yet</h3>
              <p className="text-slate-400 mb-4">Explore amazing deals from local businesses and start saving!</p>
              <Button onClick={() => {setSelectedFilter('all'); setSelectedCategory('all')}} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-slate-100">
                Explore Offers
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
    </div>
  )
}

