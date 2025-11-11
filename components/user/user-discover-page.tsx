'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImageCarousel } from '@/components/ui/image-carousel'
import { mockBusinesses } from '@/lib/mock-data/user-mock-data'
import Link from 'next/link'
import { getBusinessStatusProps } from '@/lib/utils/business-hours'
import { AiCompanionCard } from '@/components/ui/ai-companion-card'
import { formatPrice } from '@/lib/utils/price-formatter'

interface Business {
  id: string
  name: string
  category: string
  location: string
  address: string
  tagline: string
  description: string
  images: string[]
  logo: string
  offers: Array<{
    id: string
    title: string
    type: string
    value: string
    image?: string
  }>
  plan: string
  rating: number
  reviewCount: number
  tags: string[]
}

interface UserDiscoverPageProps {
  businesses?: Business[]
  walletPassId?: string
}

export function UserDiscoverPage({ businesses = mockBusinesses, walletPassId }: UserDiscoverPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  
  // Helper function to scroll to results after filter change
  const scrollToResults = () => {
    setTimeout(() => {
      const resultsSection = document.querySelector('[data-discover-results]')
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Track badge progress for visiting discover page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { getBadgeTracker } = require('@/lib/utils/simple-badge-tracker')
      const badgeTracker = getBadgeTracker() // Will use default user ID for now
      badgeTracker.trackAction('discover_page_visited')
    }
  }, [])
  
  // Group businesses by subscription plan (determines badges)
  const qwikkerPicks = businesses.filter(b => b.plan === 'spotlight')
  const featured = businesses.filter(b => b.plan === 'featured')
  const recommended = businesses.filter(b => b.plan === 'starter')

  const filters = [
    { id: 'all', label: 'All Places', count: businesses.length },
    { id: 'qwikker_picks', label: 'Qwikker Picks', count: qwikkerPicks.length },
    { id: 'featured', label: 'Featured', count: featured.length },
    { id: 'recommended', label: 'Recommended', count: recommended.length },
  ]

  const getFilteredBusinesses = () => {
    // First filter by selected category
    let filtered = businesses
    switch (selectedFilter) {
      case 'qwikker_picks': 
        filtered = qwikkerPicks
        break
      case 'featured': 
        filtered = featured
        break
      case 'recommended': 
        filtered = recommended
        break
      default: 
        filtered = businesses
    }

    // Then filter by search query if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(business => 
        business.name?.toLowerCase().includes(query) ||
        business.category?.toLowerCase().includes(query) ||
        business.tagline?.toLowerCase().includes(query) ||
        business.description?.toLowerCase().includes(query) ||
        business.location?.toLowerCase().includes(query) ||
        business.address?.toLowerCase().includes(query) ||
        business.tags?.some(tag => tag?.toLowerCase().includes(query))
      )
    }

    return filtered
  }

  const BusinessCard = ({ business }: { business: any }) => {
    const getNavUrl = (href: string) => {
      if (!walletPassId) {
        return href
      }
      return `${href}?wallet_pass_id=${walletPassId}`
    }
    
    return (
    <Link href={getNavUrl(`/user/business/${business.slug}`)} className="block">
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600 hover:border-[#00d083]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#00d083]/10 group cursor-pointer overflow-hidden">
      {/* Business Image Carousel */}
      <div className="relative h-48 overflow-hidden">
        <ImageCarousel
          images={business.images || []}
          alt={business.name}
          className="w-full h-full"
          showArrows={true}
          showDots={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        
        {/* Hero Badge - Based on Subscription Plan */}
        <div className="absolute top-3 right-3">
          {business.plan === 'spotlight' && (
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs px-3 py-2 rounded-full font-bold shadow-lg animate-pulse">
              ⭐ QWIKKER PICK
            </span>
          )}
          {business.plan === 'featured' && (
            <span className="bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black text-xs px-3 py-2 rounded-full font-bold shadow-lg">
              FEATURED
            </span>
          )}
        </div>

        {/* Actionable Distance Badge */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-black/70 text-slate-100 text-xs px-3 py-2 rounded-full backdrop-blur-sm flex items-center gap-1">
            🚶 {Math.round(parseFloat(business.distance) * 20)} min walk • {business.distance} miles
          </span>
        </div>

      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-slate-100 text-lg mb-1 group-hover:text-[#00d083] transition-colors">
              {business.name}
            </CardTitle>
            <p className="text-slate-400 text-sm">{business.category}</p>
            <p className="text-[#00d083] text-sm font-medium mt-1">{business.tagline}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Rating and Reviews */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${star <= business.rating ? 'text-yellow-400' : 'text-gray-600'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-slate-100 font-semibold">{business.rating}</span>
            <span className="text-slate-400 text-sm">({business.reviewCount} reviews)</span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm">{business.address}, {business.town}</span>
        </div>

        {/* Hours */}
        <div className="flex items-center gap-2 text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">{business.hours}</span>
          {(() => {
            const status = getBusinessStatusProps(business.hours)
            return (
              <span className={`${status.statusColor} text-sm font-medium`}>
                • {status.statusText}
              </span>
            )
          })()}
        </div>

        {/* Compact Menu Preview */}
        {business.menuPreview && business.menuPreview.length > 0 && (
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🍽</span>
              <p className="text-slate-100 text-sm font-medium">Popular items:</p>
            </div>
            <div className="space-y-1">
              {business.menuPreview?.slice(0, 2).map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <p className="text-slate-300 text-xs">{item.name}</p>
                  <p className="text-[#00d083] text-xs font-medium">{formatPrice(item.price)}</p>
                </div>
              ))}
              {(business.menuPreview?.length || 0) > 2 && (
                <p className="text-slate-400 text-xs">+{(business.menuPreview?.length || 0) - 2} more items...</p>
              )}
            </div>
          </div>
        )}

        {/* Special Features with Better Visual */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {business.hasSecretMenu && (
              <span className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 text-xs px-2 py-1 rounded-full">
                🔒 Secret Menu
              </span>
            )}
            {business.activeOffers > 0 && (
              <span className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 text-orange-300 text-xs px-2 py-1 rounded-full">
                🔥 {business.activeOffers} Offers
              </span>
            )}
          </div>
          
          {/* Save Button */}
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 p-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </Button>
        </div>
      </CardContent>
      </Card>
    </Link>
  )
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Icon */}
      <div className="text-center mb-8">
        <div className="flex flex-col items-center gap-6 mb-6">
          <div className="p-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full border border-emerald-400/50">
            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              Discover Bournemouth
            </h1>
            <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full" />
          </div>
        </div>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Find amazing local businesses, exclusive deals, and hidden gems
        </p>
      </div>

      {/* Clickable Filter Cards - Mobile First */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card 
          className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
            selectedFilter === 'qwikker_picks' 
              ? 'bg-gradient-to-br from-yellow-400/30 to-amber-500/30 border-yellow-300/50 ring-2 ring-yellow-300/30' 
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
          }`}
          onClick={() => {
            setSelectedFilter('qwikker_picks')
            scrollToResults()
          }}
        >
          <p className="text-2xl font-bold text-yellow-300">{qwikkerPicks.length}</p>
          <p className="text-sm text-slate-400">Qwikker Picks</p>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
            selectedFilter === 'featured' 
              ? 'bg-gradient-to-br from-green-600/30 to-green-500/30 border-green-400/50 ring-2 ring-green-400/30' 
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
          }`}
          onClick={() => {
            setSelectedFilter('featured')
            scrollToResults()
          }}
        >
          <p className="text-2xl font-bold text-green-400">{featured.length}</p>
          <p className="text-sm text-slate-400">Featured</p>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
            selectedFilter === 'recommended' 
              ? 'bg-gradient-to-br from-purple-600/30 to-purple-500/30 border-purple-400/50 ring-2 ring-purple-400/30' 
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
          }`}
          onClick={() => {
            setSelectedFilter('recommended')
            scrollToResults()
          }}
        >
          <p className="text-2xl font-bold text-purple-400">{recommended.length}</p>
          <p className="text-sm text-slate-400">Recommended</p>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
            selectedFilter === 'all' 
              ? 'bg-gradient-to-br from-blue-600/30 to-blue-500/30 border-blue-400/50 ring-2 ring-blue-400/30' 
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
          }`}
          onClick={() => {
            setSelectedFilter('all')
            scrollToResults()
          }}
        >
          <p className="text-2xl font-bold text-blue-400">{businesses.length}</p>
          <p className="text-sm text-slate-400">All Places</p>
        </Card>
      </div>

      {/* AI Companion Card - After Filter Cards */}
      <div className="mb-4">
        <AiCompanionCard 
          title="Discover Your Next Favorite Spot"
          description="Tell our AI exactly what you're in the mood for! Whether it's 'cozy coffee shop with WiFi' or 'best sushi near the beach' - we'll find your perfect match."
          prompts={[
            "Find me a romantic restaurant for tonight",
            "Where can I get the best fish and chips?", 
            "Show me cafes with outdoor seating"
          ]}
          walletPassId={walletPassId}
        />
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100">
          {searchQuery ? (
            <>Search results for "<span className="text-[#00d083]">{searchQuery}</span>"</>
          ) : (
            selectedFilter === 'all' ? 'All Places' : 
            selectedFilter === 'qwikker_picks' ? 'Qwikker Picks - Staff Favorites' :
            selectedFilter === 'featured' ? 'Featured Businesses' : 'Recommended for You'
          )}
        </h2>
        <div className="flex items-center gap-2 text-slate-400">
          <span>{getFilteredBusinesses().length} results</span>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="p-2 bg-slate-800/50 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors text-xs px-3"
              title="Clear search"
            >
              Clear
            </button>
          )}
          <button className="p-2 bg-slate-800/50 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Business Grid */}
      {getFilteredBusinesses().length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-discover-results>
          {getFilteredBusinesses().map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              {searchQuery ? 'No businesses found' : 'No businesses in this category'}
            </h3>
            <p className="text-slate-400 mb-4">
              {searchQuery 
                ? `Try searching for something else or check your spelling.`
                : 'Try selecting a different category or check back later.'
              }
            </p>
            {searchQuery && (
              <Button 
                onClick={() => setSearchQuery('')}
                className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black"
              >
                Clear Search
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Load More Button */}
      {getFilteredBusinesses().length > 0 && (
        <div className="text-center pt-4">
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 px-8">
            Load More Places
          </Button>
        </div>
      )}
    </div>
  )
}
