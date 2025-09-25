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
}

export function UserOffersPage({ realOffers = [] }: UserOffersPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const searchParams = useSearchParams()
  const walletPassId = searchParams.get('wallet_pass_id')
  const highlightBusiness = searchParams.get('highlight') // For QR deep linking
  
  // Initialize with empty sets to avoid hydration mismatch
  const [favoriteOffers, setFavoriteOffers] = useState<Set<string>>(new Set())
  const [claimedOffers, setClaimedOffers] = useState<Set<string>>(new Set())
  const [walletOffers, setWalletOffers] = useState<Set<string>>(new Set())
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null)
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  
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

  // Combine real offers with mock offers
  const allOffers = [...realOffers, ...mockOffers]

  // Handle QR deep linking auto-scroll and highlight
  useEffect(() => {
    if (highlightBusiness) {
      // Wait for page to render and find the business card
      const timer = setTimeout(() => {
        // Look for business by name (convert to slug format)
        const businessSlug = highlightBusiness.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const targetCard = cardRefs.current[businessSlug]
        
        if (targetCard) {
          // Smooth scroll to the card
          targetCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          })
          
          // Add highlight effect
          setHighlightedCard(businessSlug)
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedCard(null)
          }, 3000)
        }
      }, 800) // Wait for page to fully load
      
      return () => clearTimeout(timer)
    }
  }, [highlightBusiness, allOffers]) // Re-run when offers change
  
  // Get unique categories from all businesses
  const realCategories = realOffers.map(o => o.businessCategory).filter(Boolean)
  const mockCategories = mockBusinesses.map(b => b.category)
  const categories = ['all', ...Array.from(new Set([...realCategories, ...mockCategories]))]
  
  // Dynamic filter counts that update with state changes
  const getFilters = () => [
    { id: 'all', label: 'All Offers', count: allOffers.length },
    { id: 'claimed', label: 'My Claimed', count: claimedOffers.size },
    { id: 'favorites', label: 'My Favorites', count: favoriteOffers.size },
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

  const claimOffer = (offerId: string, offerTitle: string, businessName: string) => {
    const userId = walletPassId || 'anonymous-user'
    
    setClaimedOffers(prev => {
      const newClaimed = new Set([...prev, offerId])
      // Save to localStorage with user ID
      if (typeof window !== 'undefined') {
        localStorage.setItem(`qwikker-claimed-${userId}`, JSON.stringify([...newClaimed]))
        
        // Track badge progress
        const { getBadgeTracker } = require('@/lib/utils/simple-badge-tracker')
        const badgeTracker = getBadgeTracker(walletPassId)
        badgeTracker.trackAction('offer_claimed')
      }
      return newClaimed
    })
    // Create center modal popup
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
        <p class="text-slate-300 mb-1">"${offerTitle}" has been successfully added to your claimed offers.</p>
        <p class="text-sm text-slate-400 mb-6">You can now add it to your mobile wallet from the "My Claimed" section.</p>
        <button id="modal-close" class="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 active:scale-95">
          Got it!
        </button>
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
    
    // Close on button click
    modal.querySelector('#modal-close')?.addEventListener('click', closeModal)
    
    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal()
    })
    
    // Auto close after 8 seconds
    setTimeout(closeModal, 8000)
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


  const getFilteredOffers = () => {
    let filtered = allOffers

    // Filter by type
    if (selectedFilter === 'claimed') {
      // Show ONLY claimed offers (not yet added to wallet)
      filtered = filtered.filter(o => claimedOffers.has(o.id) && !walletOffers.has(o.id))
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
    // Distinguish real vs mock offers: real offers have businessCategory, mock offers don't
    const isRealOffer = !!offer.businessCategory
    const business = isRealOffer ? null : mockBusinesses.find(b => b.id === offer.businessId)
    const businessName = offer.businessName || business?.name || 'Unknown Business'
    
    // Create business slug for ref and highlighting
    const businessSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const isHighlighted = highlightedCard === businessSlug
    
    // Fix image selection: for real offers use offer.image, for mock offers use business.images[0]
    const businessImage = isRealOffer
      ? (offer.image || '/placeholder-business.jpg') 
      : (business?.images?.[0] || '/placeholder-business.jpg')
    
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
    const claimedOfferData = mockClaimedOffers.find(co => co.offerId === offer.id)
    
    return (
      <Card 
        ref={(el) => { cardRefs.current[businessSlug] = el }}
        className={`bg-gradient-to-br from-slate-800/60 to-slate-700/40 border-slate-700/50 hover:border-green-500/30 transition-all duration-300 overflow-hidden group h-full flex flex-col ${
          isHighlighted 
            ? 'qr-highlight ring-4 ring-[#00d083]/60 shadow-2xl shadow-[#00d083]/20 scale-105 border-[#00d083]/50' 
            : ''
        }`}
      >
        {/* Header with Image */}
        <div className="relative h-52 sm:h-48 overflow-hidden rounded-t-xl">
          <img 
            src={businessImage} 
            alt={businessName}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
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
        </div>

        <CardContent className="p-3 sm:p-4 flex flex-col flex-grow">
          {/* Title and description - flexible content */}
          <div className="flex-grow">
            <h3 className="text-slate-100 font-bold text-lg mb-2">{offer.title}</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-3">{offer.description}</p>
            
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
              <AddToWalletButton 
                offer={{
                  id: offer.id,
                  title: offer.title,
                  description: offer.description,
                  business_name: businessName,
                  valid_until: offer.valid_until,
                  terms: offer.terms,
                  offer_value: offer.discount || offer.type
                }}
                userWalletPassId={walletPassId}
                variant="default"
                size="md"
                className="w-full h-[44px] bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
              />
            )}
            
            {/* Share Button */}
            <ShareButton
              title={`Amazing Deal: ${offer.title}`}
              text={`Check out this exclusive offer at ${businessName}: ${offer.title}! Save ${offer.discount} - but you need Qwikker to claim it.`}
              url={`https://bournemouth.qwikker.com/join?ref=offer-${offer.id}`}
              onShare={() => handleShare(offer.id, offer.title, businessName)}
              className="w-full"
              size="sm"
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header - Simple and Clean */}
      <div className="text-center py-6">
        <div className="flex flex-col items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-green-400">
            Your Exclusive Offers
          </h1>
        </div>
        <p className="text-lg text-slate-300 mb-2">Save money while discovering amazing local businesses</p>
        <p className="text-slate-400">All offers are verified and ready to claim instantly</p>
      </div>

      {/* Clickable Filter Cards - Mobile First */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card 
          className={`cursor-pointer transition-all duration-200 text-center p-3 sm:p-4 hover:scale-105 ${
            selectedFilter === 'all' 
              ? 'bg-gradient-to-br from-blue-600/30 to-blue-500/30 border-blue-400/50 ring-2 ring-blue-400/30' 
              : 'bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-blue-700/30 hover:border-blue-600/50'
          }`}
          onClick={() => setSelectedFilter('all')}
        >
          <p className="text-2xl font-bold text-blue-400">{allOffers.filter(o => !claimedOffers.has(o.id)).length}</p>
          <p className="text-sm text-slate-400">Total Offers</p>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all duration-200 text-center p-3 sm:p-4 hover:scale-105 ${
            selectedFilter === 'percentage_off' 
              ? 'bg-gradient-to-br from-green-600/30 to-green-500/30 border-green-400/50 ring-2 ring-green-400/30' 
              : 'bg-gradient-to-br from-green-900/20 to-green-800/20 border-green-700/30 hover:border-green-600/50'
          }`}
          onClick={() => setSelectedFilter('percentage_off')}
        >
          <p className="text-2xl font-bold text-green-400">{allOffers.filter(o => o.type === 'percentage_off' && !claimedOffers.has(o.id)).length}</p>
          <p className="text-sm text-slate-400">% Off Deals</p>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all duration-200 text-center p-3 sm:p-4 hover:scale-105 ${
            selectedFilter === 'two_for_one' 
              ? 'bg-gradient-to-br from-purple-600/30 to-purple-500/30 border-purple-400/50 ring-2 ring-purple-400/30' 
              : 'bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-700/30 hover:border-purple-600/50'
          }`}
          onClick={() => setSelectedFilter('two_for_one')}
        >
          <p className="text-2xl font-bold text-purple-400">{allOffers.filter(o => o.type === 'two_for_one' && !claimedOffers.has(o.id)).length}</p>
          <p className="text-sm text-slate-400">2-for-1 Deals</p>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all duration-200 text-center p-3 sm:p-4 hover:scale-105 ${
            selectedFilter === 'ending_soon' 
              ? 'bg-gradient-to-br from-red-600/30 to-red-500/30 border-red-400/50 ring-2 ring-red-400/30' 
              : 'bg-gradient-to-br from-red-900/20 to-red-800/20 border-red-700/30 hover:border-red-600/50'
          }`}
          onClick={() => setSelectedFilter('ending_soon')}
        >
          <p className="text-2xl font-bold text-red-400">{allOffers.filter(o => o.isEndingSoon && !claimedOffers.has(o.id)).length}</p>
          <p className="text-sm text-slate-400">Ending Soon</p>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all duration-200 text-center p-3 sm:p-4 hover:scale-105 ${
            selectedFilter === 'claimed' 
              ? 'bg-gradient-to-br from-amber-600/30 to-amber-500/30 border-amber-400/50 ring-2 ring-amber-400/30' 
              : 'bg-gradient-to-br from-amber-900/20 to-amber-800/20 border-amber-700/30 hover:border-amber-600/50'
          }`}
          onClick={() => setSelectedFilter('claimed')}
        >
          <p className="text-2xl font-bold text-amber-400">{claimedOffers.size}</p>
          <p className="text-sm text-slate-400">My Claimed</p>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all duration-200 text-center p-3 sm:p-4 hover:scale-105 ${
            selectedFilter === 'favorites' 
              ? 'bg-gradient-to-br from-pink-600/30 to-pink-500/30 border-pink-400/50 ring-2 ring-pink-400/30' 
              : 'bg-gradient-to-br from-pink-900/20 to-pink-800/20 border-pink-700/30 hover:border-pink-600/50'
          }`}
          onClick={() => setSelectedFilter('favorites')}
        >
          <p className="text-2xl font-bold text-pink-400">{favoriteOffers.size}</p>
          <p className="text-sm text-slate-400">Favourites</p>
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
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
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

