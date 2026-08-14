'use client'

import { useState, useEffect } from 'react'
import { BusinessCard } from '@/components/user/business-card'
import { SYSTEM_CATEGORY_LABEL, SystemCategory, SYSTEM_CATEGORIES } from '@/lib/constants/system-categories'
import { getClientCityFallback, getCityDisplayName as getClientCityDisplayName } from '@/lib/utils/client-city-detection'
import { useSidebar } from '@/components/user/user-dashboard-layout'

interface Business {
  id: string
  name: string
  slug?: string
  category: string
  systemCategory?: string
  displayCategory?: string
  google_primary_type?: string
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
  rating: number | null
  reviewCount: number | null
  tags: string[]
}

interface UserDiscoverPageProps {
  businesses?: Business[]
  walletPassId?: string
  currentCity?: string
  cityDisplayName?: string
}

export function UserDiscoverPage({ businesses = [], walletPassId, currentCity: currentCityProp, cityDisplayName: cityDisplayNameProp }: UserDiscoverPageProps) {
  const currentCity = currentCityProp || getClientCityFallback()
  const cityDisplayName = cityDisplayNameProp || getClientCityDisplayName(currentCity)
  // Geolocation state
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null)
  const [locationStatus, setLocationStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  const [showManualLocation, setShowManualLocation] = useState(false)
  
  // Function to request location
  const requestLocation = () => {
    if ('geolocation' in navigator) {
      console.log('📍 Requesting location...')
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 SUCCESS! Got position:', position.coords)
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setLocationStatus('granted')
        },
        (error) => {
          console.error('📍 FAILED! Error:', error, 'Code:', error.code, 'Message:', error.message)
          setLocationStatus('denied')
          setShowManualLocation(true)
        },
        { 
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      )
    } else {
      console.error('📍 Geolocation not supported in this browser')
      setLocationStatus('denied')
    }
  }

  // Request user location on mount
  useEffect(() => {
    requestLocation()
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
    hasLoyalty: false,
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
  const toggleQuickFilter = (filter: 'openNow' | 'hasOffers' | 'hasSecretMenu' | 'hasLoyalty' | 'closest' | 'mySaved') => {
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
  
  // Load saved businesses from DB (if wallet pass) or localStorage (fallback)
  useEffect(() => {
    const loadSavedBusinesses = async () => {
      if (walletPassId) {
        // Load from database for persistent, trackable saves
        const { getUserSavedItems } = await import('@/lib/actions/user-saved-actions')
        const result = await getUserSavedItems(walletPassId)
        if (result.success && result.items) {
          const businessIds = result.items
            .filter(item => item.item_type === 'business')
            .map(item => item.item_id)
          setSavedBusinesses(new Set(businessIds))
          console.log('💾 Loaded saved businesses from DB:', businessIds.length)
        }
      } else if (typeof window !== 'undefined') {
        // Fallback to localStorage for users without wallet pass
        const saved = localStorage.getItem('qwikker-saved-businesses')
        if (saved) {
          try {
            const savedArray = JSON.parse(saved) as string[]
            setSavedBusinesses(new Set(savedArray))
            console.log('💾 Loaded saved businesses from localStorage:', savedArray.length)
          } catch (e) {
            console.error('Failed to load saved businesses:', e)
          }
        }
      }
    }
    
    // Load on mount
    loadSavedBusinesses()
    
    // Reload when page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👀 Page visible - reloading saved businesses')
        loadSavedBusinesses()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [walletPassId])
  
  // Persist saved businesses to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qwikker-saved-businesses', JSON.stringify(Array.from(savedBusinesses))) // Fixed: use dash not underscore
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

    if (quickFilters.hasLoyalty) {
      filtered = filtered.filter(b => (b as any).hasLoyalty)
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
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Places</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {businesses.length} in {cityDisplayName}
          {userLocation ? ' · sorted near you when Closest is on' : ''}
        </p>
      </div>

      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search places..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#00d083]/45 focus:ring-1 focus:ring-[#00d083]/20 transition-colors text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className={`sticky top-0 z-10 -mx-4 px-4 py-2.5 bg-black/95 backdrop-blur-md border-b border-zinc-900 sm:static sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent sm:backdrop-blur-0 sm:border-0 space-y-2.5 ${
        sidebarOpen ? 'hidden lg:block' : ''
      }`}>
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hidden pb-0.5">
          {[
            { id: 'all', label: 'All', count: businesses.length },
            { id: 'qwikker_picks', label: 'Picks', count: qwikkerPicks.length },
            { id: 'featured', label: 'Featured', count: featured.length },
            { id: 'recommended', label: 'For you', count: recommended.length },
          ].map((tab) => {
            const isActive = selectedFilter === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedFilter(tab.id)
                  scrollToResults()
                }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#00d083]/18 text-[#9dffc0] border border-[#00d083]/35'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                }`}
              >
                {tab.label}
                <span className="ml-1 opacity-70">{tab.count}</span>
              </button>
            )
          })}
        </div>

        <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hidden pb-0.5">
          {(
            [
              { key: 'openNow' as const, label: 'Open now' },
              { key: 'hasOffers' as const, label: 'Offers' },
              { key: 'hasSecretMenu' as const, label: 'Secrets' },
              { key: 'hasLoyalty' as const, label: 'Loyalty' },
              { key: 'closest' as const, label: 'Closest' },
              { key: 'mySaved' as const, label: `Saved (${savedBusinesses.size})` },
            ]
          ).map((f) => {
            const isActive = quickFilters[f.key]
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => toggleQuickFilter(f.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#00d083]/18 text-[#9dffc0] border border-[#00d083]/35'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {allFilterOptions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hidden pb-0.5">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all')
                scrollToResults()
              }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-zinc-100 text-black'
                  : 'bg-zinc-950 text-zinc-500 border border-zinc-800'
              }`}
            >
              All types
            </button>
            {allFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedCategory(option.value)
                  scrollToResults()
                }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === option.value
                    ? 'bg-zinc-100 text-black'
                    : 'bg-zinc-950 text-zinc-500 border border-zinc-800'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={sidebarOpen ? 'hidden lg:block' : ''}>
        <div className="flex items-center justify-between px-0.5 mb-3">
          <h2 className="text-sm font-semibold text-zinc-200">
            {searchQuery
              ? `Results for “${searchQuery}”`
              : selectedFilter === 'all'
                ? 'All places'
                : selectedFilter === 'qwikker_picks'
                  ? 'Picks'
                  : selectedFilter === 'featured'
                    ? 'Featured'
                    : 'For you'}
          </h2>
          <span className="text-xs text-zinc-500">{getFilteredBusinesses().length}</span>
        </div>

        {locationStatus === 'denied' && (
          <div className="mb-4 px-3.5 py-3 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-400">
              Location off — distances won’t show.
            </p>
            <button
              type="button"
              onClick={requestLocation}
              className="shrink-0 text-xs font-medium text-[#9dffc0] border border-[#00d083]/30 px-3 py-1.5 rounded-full"
            >
              Enable
            </button>
          </div>
        )}

        {getFilteredBusinesses().length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-discover-results>
            {getFilteredBusinesses().map((business) => {
              const distance = userLocation && (business as any).latitude && (business as any).longitude
                ? calculateDistance(userLocation.lat, userLocation.lng, (business as any).latitude, (business as any).longitude)
                : null

              return (
                <BusinessCard
                  key={business.id}
                  business={{
                    ...business,
                    distance,
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
          <div className="text-center py-12 px-4">
            <p className="text-zinc-200 font-medium">No places match</p>
            <p className="text-zinc-500 text-sm mt-1">
              {searchQuery ? 'Try a different search.' : 'Try clearing a filter.'}
            </p>
            {(searchQuery || selectedCategory !== 'all' || Object.values(quickFilters).some(Boolean)) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('all')
                  setSelectedFilter('all')
                  setQuickFilters({
                    openNow: false,
                    hasOffers: false,
                    hasSecretMenu: false,
                    hasLoyalty: false,
                    closest: false,
                    mySaved: false,
                  })
                }}
                className="mt-4 text-xs font-medium text-[#9dffc0] border border-[#00d083]/30 px-4 py-2 rounded-full"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
