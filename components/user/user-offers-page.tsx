'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockOffers, mockBusinesses, mockClaimedOffers } from '@/lib/mock-data/user-mock-data'
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
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null)
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  
  // Load from localStorage after component mounts
  useEffect(() => {
    const savedFavorites = localStorage.getItem('qwikker-favorites')
    const savedClaimed = localStorage.getItem('qwikker-claimed')
    
    if (savedFavorites) {
      setFavoriteOffers(new Set(JSON.parse(savedFavorites)))
    }
    if (savedClaimed) {
      setClaimedOffers(new Set(JSON.parse(savedClaimed)))
    } else {
      // For development, start with mock data if no saved data
      setClaimedOffers(new Set(mockClaimedOffers.map(co => co.offerId)))
    }
  }, [])

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
    setFavoriteOffers(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(offerId)) {
        newFavorites.delete(offerId)
      } else {
        newFavorites.add(offerId)
      }
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('qwikker-favorites', JSON.stringify([...newFavorites]))
      }
      return newFavorites
    })
  }

  const claimOffer = (offerId: string, offerTitle: string, businessName: string) => {
    setClaimedOffers(prev => {
      const newClaimed = new Set([...prev, offerId])
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('qwikker-claimed', JSON.stringify([...newClaimed]))
      }
      return newClaimed
    })
    alert(`"${offerTitle}" claimed successfully!\n\nYou can now add it to your mobile wallet from "My Claimed" offers.`)
  }

  const getFilteredOffers = () => {
    let filtered = allOffers

    // Filter by type
    if (selectedFilter === 'claimed') {
      filtered = filtered.filter(o => claimedOffers.has(o.id))
    } else if (selectedFilter === 'favorites') {
      filtered = filtered.filter(o => favoriteOffers.has(o.id))
    } else if (selectedFilter === 'popular') {
      filtered = filtered.filter(o => o.isPopular)
    } else if (selectedFilter === 'ending_soon') {
      filtered = filtered.filter(o => o.isEndingSoon)
    } else if (selectedFilter === 'two_for_one') {
      filtered = filtered.filter(o => o.type === 'two_for_one')
    } else if (selectedFilter === 'percentage_off') {
      filtered = filtered.filter(o => o.type === 'percentage_off')
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
        className={`bg-gradient-to-br from-slate-800/60 to-slate-700/40 border-slate-700/50 hover:border-orange-500/30 transition-all duration-300 overflow-hidden group ${
          isHighlighted 
            ? 'qr-highlight ring-4 ring-[#00d083]/60 shadow-2xl shadow-[#00d083]/20 scale-105 border-[#00d083]/50' 
            : ''
        }`}
      >
        {/* Header with Image */}
        <div className="relative h-40 overflow-hidden">
          <img 
            src={businessImage} 
            alt={businessName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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

        <CardContent className="p-4">
          {/* Title and description */}
          <div className="mb-4">
            <h3 className="text-slate-100 font-bold text-lg mb-2">{offer.title}</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-3">{offer.description}</p>
            
            {/* Value highlight */}
            <div className="bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/25 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-orange-300 font-semibold">You Save:</span>
                <span className="text-orange-400 font-bold text-lg">{offer.value}</span>
              </div>
            </div>
          </div>

          {/* Clean Terms & Expiry */}
          <div className="mb-4 text-xs text-slate-400 space-y-1">
            <p><span className="font-medium">Terms:</span> {isRealOffer ? (offer.termsAndConditions || 'Standard terms apply') : (offer.terms || 'Standard terms apply')}</p>
            <p><span className="font-medium">Valid until:</span> {isRealOffer ? (offer.validUntil || 'No expiry date') : (offer.expiryDate || 'No expiry date')}</p>
          </div>

          {/* Action buttons - Fixed height container to prevent card size changes */}
          <div className="min-h-[44px] flex flex-col justify-end">
            {!isClaimed ? (
              <Button 
                onClick={() => claimOffer(offer.id, offer.title, businessName)}
                className="w-full h-[44px] bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/20"
              >
                Claim Offer
              </Button>
            ) : (
              <div className="space-y-2">
                {/* Status indicator - consistent height */}
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg p-2 min-h-[36px]">
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-400 text-sm font-medium flex-1">
                    {claimedOfferData?.status === 'redeemed' ? 'Redeemed' : 
                     claimedOfferData?.status === 'wallet_added' ? 'In Your Wallet' : 'Claimed'}
                  </span>
                  {claimedOfferData?.redemptionCode && (
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      Code: {claimedOfferData.redemptionCode}
                    </span>
                  )}
                </div>
                
                {/* Add to Wallet button - only show if not redeemed */}
                {claimedOfferData?.status !== 'redeemed' ? (
                  <AddToWalletButton
                    offer={{
                      id: offer.id,
                      title: offer.title,
                      description: offer.description,
                      business_name: businessName,
                      business_logo: isRealOffer ? offer.businessLogo : business?.logo,
                      valid_until: isRealOffer ? offer.validUntil : offer.expiryDate,
                      terms: isRealOffer ? offer.termsAndConditions : offer.terms,
                      offer_type: isRealOffer ? offer.type : offer.type,
                      offer_value: offer.value
                    }}
                    userWalletPassId={walletPassId || undefined}
                    className="w-full h-[44px]"
                    variant="outline"
                  />
                ) : (
                  // Placeholder to maintain consistent card height
                  <div className="h-[44px]"></div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent mb-2">
          Exclusive Offers
        </h1>
        <p className="text-xl text-slate-300 mb-1">Save money while discovering amazing local businesses</p>
        <p className="text-slate-400">All offers are verified and ready to claim instantly</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-blue-700/30 text-center p-4">
          <p className="text-2xl font-bold text-blue-400">{mockOffers.length}</p>
          <p className="text-sm text-slate-400">Total Offers</p>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/20 to-green-800/20 border-green-700/30 text-center p-4">
          <p className="text-2xl font-bold text-green-400">{mockOffers.filter(o => o.type === 'percentage_off').length}</p>
          <p className="text-sm text-slate-400">% Off Deals</p>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-700/30 text-center p-4">
          <p className="text-2xl font-bold text-purple-400">{mockOffers.filter(o => o.type === 'two_for_one').length}</p>
          <p className="text-sm text-slate-400">2-for-1 Deals</p>
        </Card>
        <Card className="bg-gradient-to-br from-red-900/20 to-red-800/20 border-red-700/30 text-center p-4">
          <p className="text-2xl font-bold text-red-400">{mockOffers.filter(o => o.isEndingSoon).length}</p>
          <p className="text-sm text-slate-400">Ending Soon</p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        {getFilters().map((filter) => (
          <button
            key={filter.id}
            onClick={() => setSelectedFilter(filter.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedFilter === filter.id
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-100'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700 border border-slate-600'
            }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2">
        <span className="text-slate-400 text-sm mr-2">Filter by category:</span>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ${
              selectedCategory === category
                ? 'bg-[#00d083] text-black'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600 border border-slate-600'
            }`}
          >
            {category === 'all' ? 'All Categories' : category}
          </button>
        ))}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100">
          {selectedFilter === 'all' ? 'All Offers' : 
           selectedFilter === 'popular' ? 'Popular Offers' :
           selectedFilter === 'ending_soon' ? 'Ending Soon' :
           selectedFilter === 'two_for_one' ? '2-for-1 Deals' :
           'Percentage Off Deals'}
        </h2>
        <div className="flex items-center gap-2 text-slate-400">
          <span>{getFilteredOffers().length} offers</span>
          <button className="p-2 bg-slate-800/50 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getFilteredOffers().map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>

      {/* Empty State */}
      {getFilteredOffers().length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700 text-center p-12">
          <div className="text-6xl mb-4"></div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">No offers match your filters</h3>
          <p className="text-slate-400 mb-4">Try adjusting your filters or check back later for new deals!</p>
          <Button onClick={() => {setSelectedFilter('all'); setSelectedCategory('all')}} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-100">
            Show All Offers
          </Button>
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

