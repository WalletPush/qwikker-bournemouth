'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockBusinesses } from '@/lib/mock-data/user-mock-data'
import { BusinessCard } from '@/components/user/business-card'
import { SYSTEM_CATEGORY_LABEL, SystemCategory, SYSTEM_CATEGORIES } from '@/lib/constants/system-categories'
import { useSidebar } from '@/components/user/user-dashboard-layout'

interface Business {
  id: string
  name: string
  category: string
  systemCategory?: string
  displayCategory?: string
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
  currentCity?: string
  cityDisplayName?: string
}

export function UserDiscoverPage({ businesses = mockBusinesses, walletPassId, currentCity = 'bournemouth', cityDisplayName = 'Bournemouth' }: UserDiscoverPageProps) {
  // Geolocation state
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null)
  const [locationStatus, setLocationStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  
  // Request user location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setLocationStatus('granted')
          console.log('📍 Location granted:', position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.warn('📍 Location denied:', error)
          setLocationStatus('denied')
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
      )
    }
  }, [])
  
  // Haversine distance calculation (in miles)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3958.8 // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * 
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }
  
  // 🐛 DEBUG: Log businesses on mount
  useEffect(() => {
    console.log('🏪 UserDiscoverPage mounted with businesses:', {
      total: businesses.length,
      sample: businesses[0],
      allBusinesses: businesses.map(b => ({
        name: b.name,
        offersCount: b.offers?.length || 0,
        activeOffers: (b as any).activeOffers,
        hasOffers: (b.offers?.length || 0) > 0
      }))
    })
  }, [businesses])
  
  const { sidebarOpen } = useSidebar()
  
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all') // NEW: Category filter
  
  // Quick filters state
  const [quickFilters, setQuickFilters] = useState({
    openNow: false,
    hasOffers: false,
    hasSecretMenu: false,
    closest: false,
    mySaved: false
  })
  
  const [savedBusinesses, setSavedBusinesses] = useState<Set<string>>(new Set())
  
  const toggleSavedBusiness = (businessId: string) => {
    setSavedBusinesses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(businessId)) {
        newSet.delete(businessId)
      } else {
        newSet.add(businessId)
      }
      return newSet
    })
  }
  
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
  
  // Toggle quick filter
  const toggleQuickFilter = (filter: 'openNow' | 'hasOffers' | 'hasSecretMenu') => {
    setQuickFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }))
    scrollToResults()
  }
  
  // Track badge progress for visiting discover page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { getBadgeTracker } = require('@/lib/utils/simple-badge-tracker')
      const badgeTracker = getBadgeTracker() // Will use default user ID for now
      badgeTracker.trackAction('discover_page_visited')
    }
  }, [])
  
  // Load saved businesses from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qwikker_saved_businesses')
      if (saved) {
        try {
          setSavedBusinesses(new Set(JSON.parse(saved)))
        } catch (e) {
          console.error('Failed to load saved businesses:', e)
        }
      }
    }
  }, [])
  
  // Persist saved businesses to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qwikker_saved_businesses', JSON.stringify(Array.from(savedBusinesses)))
    }
  }, [savedBusinesses])
  
  // Group businesses by subscription plan (determines badges)
  // 🎯 Free listings (plan = null) are included in "All Places" but not in specific tiers
  const qwikkerPicks = businesses.filter(b => b.plan === 'spotlight')
  const featured = businesses.filter(b => b.plan === 'featured')
  const recommended = businesses.filter(b => b.plan === 'starter')

  const filters = [
    { id: 'all', label: 'All Places', count: businesses.length },
    { id: 'qwikker_picks', label: 'Qwikker Picks', count: qwikkerPicks.length },
    { id: 'featured', label: 'Featured', count: featured.length },
    { id: 'recommended', label: 'Recommended', count: recommended.length },
  ]

  // Get unique categories from both systemCategory AND google_primary_type
  const availableSystemCategories = Array.from(
    new Set(
      businesses
        .map(b => b.systemCategory)
        .filter(Boolean)
    )
  )
  
  const availableGoogleCategories = Array.from(
    new Set(
      businesses
        .map(b => b.google_primary_type)
        .filter(Boolean)
    )
  )
  
  // Combine both for dropdown
  const allFilterOptions = [
    ...availableSystemCategories.map(cat => ({
      value: `system:${cat}`,
      label: SYSTEM_CATEGORY_LABEL[cat as SystemCategory] || cat,
      count: businesses.filter(b => b.systemCategory === cat).length,
      type: 'system' as const
    })),
    ...availableGoogleCategories.map(cat => ({
      value: `google:${cat}`,
      label: cat.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      count: businesses.filter(b => b.google_primary_type === cat).length,
      type: 'google' as const
    }))
  ].sort((a, b) => b.count - a.count) // Sort by count descending.sort()

  // NEW: Count businesses per category
  const getFilteredBusinesses = () => {
    // First filter by selected tier (All/Qwikker Picks/Featured/Recommended)
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

    // Filter by category if selected (handles both system and google categories)
    if (selectedCategory !== 'all') {
      if (selectedCategory.startsWith('system:')) {
        const category = selectedCategory.replace('system:', '')
        filtered = filtered.filter(b => b.systemCategory === category)
      } else if (selectedCategory.startsWith('google:')) {
        const category = selectedCategory.replace('google:', '')
        filtered = filtered.filter(b => b.google_primary_type === category)
      }
    }
    
    // Quick filters
    if (quickFilters.openNow) {
      filtered = filtered.filter(b => {
        // Import getBusinessStatusProps inline to avoid circular deps
        const { getBusinessStatusProps } = require('@/lib/utils/business-hours')
        const status = getBusinessStatusProps(
          (b as any).hours || (b as any).business_hours, 
          (b as any).hours_structured || (b as any).business_hours_structured
        )
        return status?.isOpen === true
      })
    }
    
    if (quickFilters.hasOffers) {
      filtered = filtered.filter(b => {
        const offersCount = (b as any).activeOffers 
          || b.offers?.length 
          || (b as any).offers_count 
          || 0
        return offersCount > 0
      })
    }
    
    if (quickFilters.hasSecretMenu) {
      filtered = filtered.filter(b => 
        (b as any).hasSecretMenu 
        || ((b as any).secretMenuCount && (b as any).secretMenuCount > 0)
        || ((b as any).secret_menu_count && (b as any).secret_menu_count > 0)
      )
    }
    
    if (quickFilters.mySaved) {
      filtered = filtered.filter(b => savedBusinesses.has(b.id))
    }
    
    if (quickFilters.closest && userLocation) {
      // Sort by distance (closest first)
      filtered = filtered.sort((a, b) => {
        const distA = (a as any).latitude && (a as any).longitude
          ? calculateDistance(userLocation.lat, userLocation.lng, (a as any).latitude, (a as any).longitude)
          : Infinity
        const distB = (b as any).latitude && (b as any).longitude
          ? calculateDistance(userLocation.lat, userLocation.lng, (b as any).latitude, (b as any).longitude)
          : Infinity
        return distA - distB
      })
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
        <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">
          Discover {cityDisplayName}
        </h1>
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

      {/* Sticky Filters Container - Both quick and category filters */}
      <div className={`sticky top-0 z-10 -mx-4 bg-[#0b1020]/95 backdrop-blur-md border-b border-white/5 sm:static sm:mx-0 sm:bg-transparent sm:backdrop-blur-0 sm:border-0 ${
        sidebarOpen ? 'hidden lg:block' : ''
      }`}>
        {/* Quick Filters */}
        <div className="px-4 py-2.5 border-b border-white/10 sm:px-0 sm:py-0 sm:mb-4 sm:border-0">
          <h3 className="hidden sm:block text-sm font-medium text-slate-400 mb-2">Quick Filters</h3>
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap [-webkit-overflow-scrolling:touch] pb-1 sm:flex-wrap sm:overflow-x-visible scrollbar-hidden">
            <button
              onClick={() => toggleQuickFilter('openNow')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                quickFilters.openNow
                  ? 'bg-[#00d083] text-black font-semibold shadow-lg'
                  : 'bg-slate-800/60 border border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {quickFilters.openNow && <span className="text-xs">✓</span>}
              <span className={quickFilters.openNow ? '' : 'sm:before:content-["🟢_"]'}>Open now</span>
            </button>
            
            <button
              onClick={() => toggleQuickFilter('hasOffers')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                quickFilters.hasOffers
                  ? 'bg-[#00d083] text-black font-semibold shadow-lg'
                  : 'bg-slate-800/60 border border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {quickFilters.hasOffers && <span className="text-xs">✓</span>}
              <span>Has offers</span>
            </button>
            
            <button
              onClick={() => toggleQuickFilter('hasSecretMenu')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                quickFilters.hasSecretMenu
                  ? 'bg-[#00d083] text-black font-semibold shadow-lg'
                  : 'bg-slate-800/60 border border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {quickFilters.hasSecretMenu && <span className="text-xs">✓</span>}
              <span>Secret menu</span>
            </button>
            
            <button
              onClick={() => toggleQuickFilter('closest')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                quickFilters.closest
                  ? 'bg-[#00d083] text-black font-semibold shadow-lg'
                  : 'bg-slate-800/60 border border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {quickFilters.closest && <span className="text-xs">✓</span>}
              <span>Closest</span>
            </button>
            
            <button
              onClick={() => toggleQuickFilter('mySaved')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                quickFilters.mySaved
                  ? 'bg-[#00d083] text-black font-semibold shadow-lg'
                  : 'bg-slate-800/60 border border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {quickFilters.mySaved && <span className="text-xs">✓</span>}
              <span>My saved ({savedBusinesses.size})</span>
            </button>
          </div>
        </div>

        {/* Category Filter Dropdown */}
        {allFilterOptions.length > 0 && (
          <div className="px-4 mb-6 sm:px-0">
            <label htmlFor="category-filter" className="block text-sm font-medium text-slate-400 mb-2">
              Filter by Category
            </label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                scrollToResults()
              }}
              className="w-full sm:w-64 px-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00d083] focus:border-[#00d083] transition-all"
            >
              <option value="all">All Categories ({businesses.length})</option>
              {allFilterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Results Section - Hide on mobile when sidebar is open */}
      <div className={sidebarOpen ? 'hidden lg:block' : ''}>
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
          {getFilteredBusinesses().map((business) => {
            // Calculate distance if we have user location and business coordinates
            const distance = userLocation && (business as any).latitude && (business as any).longitude
              ? calculateDistance(userLocation.lat, userLocation.lng, (business as any).latitude, (business as any).longitude)
              : null
            
            return (
              <BusinessCard 
                key={business.id} 
                business={{
                  ...business,
                  distance
                }} 
                href={getNavUrl(`/user/business/${business.slug}`)}
                showDistance={true}
                isSaved={savedBusinesses.has(business.id)}
                onToggleSave={() => toggleSavedBusiness(business.id)}
              />
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              {searchQuery 
                ? 'No businesses found' 
                : quickFilters.openNow 
                  ? 'No businesses open right now'
                  : quickFilters.hasOffers && quickFilters.hasSecretMenu
                    ? 'No businesses with offers and secret menus'
                    : quickFilters.hasOffers
                      ? 'No businesses with offers'
                      : quickFilters.hasSecretMenu
                        ? 'No businesses with secret menus'
                        : 'No businesses in this category'
              }
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
      {/* End Results Section */}
    </div>
  )
}
