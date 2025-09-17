'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockOffers, mockBusinesses, mockClaimedOffers } from '@/lib/mock-data/user-mock-data'
import { useState } from 'react'
import Link from 'next/link'

export function UserOffersPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  // Initialize from localStorage or empty sets for fresh users
  const [favoriteOffers, setFavoriteOffers] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qwikker-favorites')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    }
    return new Set()
  })
  
  const [claimedOffers, setClaimedOffers] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qwikker-claimed')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    }
    // For development, start with mock data, but real users start fresh
    return new Set(mockClaimedOffers.map(co => co.offerId))
  })
  
  // Get unique categories from businesses
  const categories = ['all', ...Array.from(new Set(mockBusinesses.map(b => b.category)))]
  
  // Dynamic filter counts that update with state changes
  const getFilters = () => [
    { id: 'all', label: 'All Offers', count: mockOffers.length },
    { id: 'claimed', label: 'My Claimed', count: claimedOffers.size },
    { id: 'favorites', label: 'My Favorites', count: favoriteOffers.size },
    { id: 'popular', label: 'Popular', count: mockOffers.filter(o => o.isPopular).length },
    { id: 'ending_soon', label: 'Ending Soon', count: mockOffers.filter(o => o.isEndingSoon).length },
    { id: 'two_for_one', label: '2-for-1', count: mockOffers.filter(o => o.type === 'two_for_one').length },
    { id: 'percentage_off', label: 'Percentage Off', count: mockOffers.filter(o => o.type === 'percentage_off').length },
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
    alert(`🎉 "${offerTitle}" claimed successfully!\n\nYou can now add it to your mobile wallet from "My Claimed" offers.`)
  }

  const getFilteredOffers = () => {
    let filtered = mockOffers

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
      const businessesInCategory = mockBusinesses.filter(b => b.category === selectedCategory).map(b => b.id)
      filtered = filtered.filter(o => businessesInCategory.includes(o.businessId))
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
    const business = mockBusinesses.find(b => b.id === offer.businessId)
    const isFavorite = favoriteOffers.has(offer.id)
    const isClaimed = claimedOffers.has(offer.id)
    const claimedOfferData = mockClaimedOffers.find(co => co.offerId === offer.id)
    
    return (
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 group cursor-pointer overflow-hidden relative">
        {/* Business Image */}
        <div className="relative h-32 overflow-hidden">
          <img 
            src={business?.images[0] || '/placeholder-business.jpg'} 
            alt={business?.name || 'Business'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          
          {/* Offer Badge */}
          <div className="absolute top-3 right-3">
            <span className={`${getBadgeColor(offer.type)} text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg`}>
              {offer.badge}
            </span>
          </div>

          {/* Status Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {offer.isPopular && (
              <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold">
                POPULAR
              </span>
            )}
            {offer.isEndingSoon && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                ENDING SOON
              </span>
            )}
          </div>

          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleFavorite(offer.id)
            }}
            className="absolute bottom-2 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-all duration-200 z-10"
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

          {/* Business Name Overlay */}
          <div className="absolute bottom-2 left-3 right-12">
            <p className="text-white font-semibold text-sm truncate">{business?.name}</p>
            <p className="text-gray-300 text-xs truncate">{business?.category}</p>
          </div>
        </div>

        <CardContent className="p-4">
          {/* Offer Details */}
          <div className="mb-4">
            <h3 className="text-white font-bold text-lg mb-2">{offer.title}</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">{offer.description}</p>
            
            {/* Value Highlight */}
            <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-orange-300 font-semibold">You Save:</span>
                <span className="text-orange-400 font-bold text-lg">{offer.value}</span>
              </div>
            </div>
          </div>

          {/* Terms & Expiry */}
          <div className="space-y-2 mb-4 text-xs text-gray-400">
            <p><strong>Terms:</strong> {offer.terms}</p>
            <p><strong>Valid until:</strong> {offer.expiryDate}</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {!isClaimed ? (
              // Not claimed yet - show claim button
              <div className="flex gap-2">
                <Button 
                  onClick={() => claimOffer(offer.id, offer.title, offer.businessName)}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold"
                >
                  Claim Offer
                </Button>
                <Button asChild variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-700">
                  <Link href={`/user/business/${business?.slug}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </Link>
                </Button>
              </div>
            ) : (
              // Already claimed - show status and wallet button
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-lg p-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-400 text-sm font-medium">
                    {claimedOfferData?.status === 'redeemed' ? 'Redeemed' : 
                     claimedOfferData?.status === 'wallet_added' ? 'In Your Wallet' : 'Claimed'}
                  </span>
                  {claimedOfferData?.redemptionCode && (
                    <span className="text-xs text-gray-400 ml-auto">
                      Code: {claimedOfferData.redemptionCode}
                    </span>
                  )}
                </div>
                
                {claimedOfferData?.status !== 'redeemed' && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => alert(`"${offer.title}" has been added to your mobile wallet! 📱`)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {claimedOfferData?.status === 'wallet_added' ? 'In Wallet' : 'Add to Wallet'}
                    </Button>
                    <Button asChild variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-700">
                      <Link href={`/user/business/${business?.slug}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat CTA */}
          <Button asChild variant="outline" className="w-full mt-2 border-[#00d083]/50 text-[#00d083] hover:bg-[#00d083]/10 text-sm">
            <Link href={`/user/chat?business=${business?.name}&topic=offer&offer=${offer.title}`}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Ask AI About This Offer
            </Link>
          </Button>
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
        <p className="text-xl text-gray-300 mb-1">Save money while discovering amazing local businesses</p>
        <p className="text-gray-400">All offers are verified and ready to claim instantly</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-blue-700/30 text-center p-4">
          <p className="text-2xl font-bold text-blue-400">{mockOffers.length}</p>
          <p className="text-sm text-gray-400">Total Offers</p>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/20 to-green-800/20 border-green-700/30 text-center p-4">
          <p className="text-2xl font-bold text-green-400">{mockOffers.filter(o => o.type === 'percentage_off').length}</p>
          <p className="text-sm text-gray-400">% Off Deals</p>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-700/30 text-center p-4">
          <p className="text-2xl font-bold text-purple-400">{mockOffers.filter(o => o.type === 'two_for_one').length}</p>
          <p className="text-sm text-gray-400">2-for-1 Deals</p>
        </Card>
        <Card className="bg-gradient-to-br from-red-900/20 to-red-800/20 border-red-700/30 text-center p-4">
          <p className="text-2xl font-bold text-red-400">{mockOffers.filter(o => o.isEndingSoon).length}</p>
          <p className="text-sm text-gray-400">Ending Soon</p>
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
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700 border border-slate-600'
            }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2">
        <span className="text-gray-400 text-sm mr-2">Filter by category:</span>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ${
              selectedCategory === category
                ? 'bg-[#00d083] text-black'
                : 'bg-slate-700/50 text-gray-400 hover:bg-slate-600 border border-slate-600'
            }`}
          >
            {category === 'all' ? 'All Categories' : category}
          </button>
        ))}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          {selectedFilter === 'all' ? 'All Offers' : 
           selectedFilter === 'popular' ? 'Popular Offers' :
           selectedFilter === 'ending_soon' ? 'Ending Soon' :
           selectedFilter === 'two_for_one' ? '2-for-1 Deals' :
           'Percentage Off Deals'}
        </h2>
        <div className="flex items-center gap-2 text-gray-400">
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
          <div className="text-6xl mb-4">🎁</div>
          <h3 className="text-xl font-bold text-white mb-2">No offers match your filters</h3>
          <p className="text-gray-400 mb-4">Try adjusting your filters or check back later for new deals!</p>
          <Button onClick={() => {setSelectedFilter('all'); setSelectedCategory('all')}} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">
            Show All Offers
          </Button>
        </Card>
      )}

      {/* Load More */}
      {getFilteredOffers().length > 0 && (
        <div className="text-center pt-4">
          <Button variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-700 px-8">
            Load More Offers
          </Button>
        </div>
      )}
    </div>
  )
}
