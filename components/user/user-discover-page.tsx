'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockBusinesses } from '@/lib/mock-data/user-mock-data'
import { AiCompanionCard } from '@/components/ui/ai-companion-card'
import { BusinessCard } from '@/components/user/business-card'

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

  const getNavUrl = (href: string) => {
    if (!walletPassId) {
      return href
    }
    return `${href}?wallet_pass_id=${walletPassId}`
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Icon */}
      <div className="text-center mb-8">
        <div className="flex flex-col items-center gap-6 mb-6">
          <div className="p-4 bg-[#00d083]/10 rounded-full border border-[#00d083]/30">
            <svg className="w-10 h-10 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-5xl font-bold text-[#00d083] mb-2">
              Discover Bournemouth
            </h1>
            <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-[#00d083] to-transparent rounded-full" />
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
            <BusinessCard 
              key={business.id} 
              business={business} 
              href={getNavUrl(`/user/business/${business.slug}`)}
              showDistance={true}
            />
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
