'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockBusinesses } from '@/lib/mock-data/user-mock-data'
import { useState } from 'react'
import Link from 'next/link'

export function UserDiscoverPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  
  // Group businesses by tier
  const qwikkerPicks = mockBusinesses.filter(b => b.tier === 'qwikker_picks')
  const featured = mockBusinesses.filter(b => b.tier === 'featured')
  const recommended = mockBusinesses.filter(b => b.tier === 'recommended')

  const filters = [
    { id: 'all', label: 'All Places', count: mockBusinesses.length },
    { id: 'qwikker_picks', label: 'Qwikker Picks', count: qwikkerPicks.length },
    { id: 'featured', label: 'Featured', count: featured.length },
    { id: 'recommended', label: 'Recommended', count: recommended.length },
  ]

  const getFilteredBusinesses = () => {
    switch (selectedFilter) {
      case 'qwikker_picks': return qwikkerPicks
      case 'featured': return featured
      case 'recommended': return recommended
      default: return mockBusinesses
    }
  }

  const BusinessCard = ({ business }: { business: any }) => (
    <Link href={`/user/business/${business.slug}`} className="block">
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600 hover:border-[#00d083]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#00d083]/10 group cursor-pointer overflow-hidden">
      {/* Business Image */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={business.images[0]} 
          alt={business.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        
        {/* Hero Badge - Only One */}
        <div className="absolute top-3 right-3">
          {business.tier === 'qwikker_picks' && (
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs px-3 py-2 rounded-full font-bold shadow-lg animate-pulse">
              ⭐ QWIKKER PICK
            </span>
          )}
          {business.tier === 'featured' && business.tier !== 'qwikker_picks' && (
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
          <span className="text-green-400 text-sm font-medium">• Open now</span>
        </div>

        {/* Compact Menu Preview */}
        {business.menuPreview && business.menuPreview.length > 0 && (
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🍽</span>
              <p className="text-slate-100 text-sm font-medium">Popular items:</p>
            </div>
            <div className="space-y-1">
              {business.menuPreview.slice(0, 2).map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <p className="text-slate-300 text-xs">{item.name}</p>
                  <p className="text-[#00d083] text-xs font-medium">£{item.price}</p>
                </div>
              ))}
              {business.menuPreview.length > 2 && (
                <p className="text-slate-400 text-xs">+{business.menuPreview.length - 2} more items...</p>
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#00d083] to-[#00b86f] bg-clip-text text-transparent mb-2">
          Discover Bournemouth
        </h1>
        <p className="text-slate-300 text-lg">Find amazing local businesses, exclusive deals, and hidden gems</p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search for restaurants, cafes, bars, or anything..."
            className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-600 rounded-xl text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00d083] focus:border-transparent"
          />
          <Button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black px-6">
            Search
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setSelectedFilter(filter.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedFilter === filter.id
                ? 'bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700 border border-slate-600'
            }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100">
          {selectedFilter === 'all' ? 'All Places' : 
           selectedFilter === 'qwikker_picks' ? 'Qwikker Picks - Staff Favorites' :
           selectedFilter === 'featured' ? 'Featured Businesses' : 'Recommended for You'}
        </h2>
        <div className="flex items-center gap-2 text-slate-400">
          <span>{getFilteredBusinesses().length} results</span>
          <button className="p-2 bg-slate-800/50 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Business Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getFilteredBusinesses().map((business) => (
          <BusinessCard key={business.id} business={business} />
        ))}
      </div>

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
