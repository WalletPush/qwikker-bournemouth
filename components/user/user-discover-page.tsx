'use client'

import { useState, useEffect } from 'react'
import { BusinessCard } from '@/components/user/business-card'
import { SYSTEM_CATEGORY_LABEL, SystemCategory, SYSTEM_CATEGORIES, mapGoogleTypesToSystemCategory } from '@/lib/constants/system-categories'
import { getClientCityFallback, getCityDisplayName as getClientCityDisplayName } from '@/lib/utils/client-city-detection'
import { useSidebar } from '@/components/user/user-dashboard-layout'
import { getBusinessStatusProps } from '@/lib/utils/business-hours'
import { FilterChipGroup, FilterPanel } from '@/components/user/filter-panel'

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  
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
  
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Toggle quick filter
  const toggleQuickFilter = (filter: 'openNow' | 'hasOffers' | 'hasSecretMenu' | 'hasLoyalty' | 'closest' | 'mySaved') => {
    setQuickFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }))
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

  // Resolve each business to one system category (DB value, or mapped from Google types)
  const resolveSystemCategory = (b: Business): SystemCategory | null => {
    if (b.systemCategory && (SYSTEM_CATEGORIES as readonly string[]).includes(b.systemCategory)) {
      return b.systemCategory as SystemCategory
    }
    const googleTypes = ((b as any).google_types as string[] | undefined) || []
    const primary = b.google_primary_type || null
    if (primary || googleTypes.length > 0) {
      return mapGoogleTypesToSystemCategory(googleTypes, primary)
    }
    return null
  }

  // System-category chips only — no Google-type duplicates / blank labels
  const categoryOptions = SYSTEM_CATEGORIES
    .map((cat) => ({
      value: cat,
      label: SYSTEM_CATEGORY_LABEL[cat],
      count: businesses.filter((b) => resolveSystemCategory(b) === cat).length,
    }))
    .filter((o) => o.count > 0 && o.label && o.label.trim().length > 0 && o.value !== 'other')
    .sort((a, b) => b.count - a.count)

  const tierRank = (b: Business) => {
    if (b.plan === 'spotlight') return 0
    if (b.plan === 'featured') return 1
    if (b.plan === 'starter') return 2
    return 3 // free / unclaimed / null
  }

  const sortDiscoverDefault = (list: Business[]) =>
    [...list].sort((a, b) => {
      const tierDiff = tierRank(a) - tierRank(b)
      if (tierDiff !== 0) return tierDiff
      const ratingDiff = (b.rating || 0) - (a.rating || 0)
      if (ratingDiff !== 0) return ratingDiff
      return (b.reviewCount || 0) - (a.reviewCount || 0)
    })

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

    // Category chip = system category id (e.g. "restaurant", "bar")
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((b) => resolveSystemCategory(b) === selectedCategory)
    }
    
    // Quick filters
    if (quickFilters.openNow) {
      filtered = filtered.filter(b => {
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
      // Explicit Closest mode — distance only
      filtered = [...filtered].sort((a, b) => {
        const distA = (a as any).latitude && (a as any).longitude
          ? calculateDistance(userLocation.lat, userLocation.lng, (a as any).latitude, (a as any).longitude)
          : Infinity
        const distB = (b as any).latitude && (b as any).longitude
          ? calculateDistance(userLocation.lat, userLocation.lng, (b as any).latitude, (b as any).longitude)
          : Infinity
        return distA - distB
      })
    } else {
      // Default: Picks → Featured → Recommended → free, then rating
      filtered = sortDiscoverDefault(filtered)
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

  const filteredBusinesses = getFilteredBusinesses()

  // Drop stale category values from the old system:/google: chip scheme
  useEffect(() => {
    if (
      selectedCategory !== 'all' &&
      !categoryOptions.some((o) => o.value === selectedCategory)
    ) {
      setSelectedCategory('all')
    }
  }, [selectedCategory, categoryOptions])

  const getNavUrl = (href: string) => {
    if (!walletPassId) {
      return href
    }
    return `${href}?wallet_pass_id=${walletPassId}`
  }

  const segmentTabs = [
    { id: 'all', label: 'All', count: businesses.length, on: 'bg-[#00d083] text-black border-[#00d083]', off: 'bg-zinc-800 text-zinc-100 border-zinc-500' },
    { id: 'qwikker_picks', label: 'Qwikker Picks', count: qwikkerPicks.length, on: 'bg-amber-400 text-black border-amber-300', off: 'bg-zinc-800 text-amber-200 border-amber-500/50' },
    { id: 'featured', label: 'Featured', count: featured.length, on: 'bg-emerald-400 text-black border-emerald-300', off: 'bg-zinc-800 text-emerald-200 border-emerald-500/50' },
    { id: 'recommended', label: 'Recommended', count: recommended.length, on: 'bg-violet-400 text-black border-violet-300', off: 'bg-zinc-800 text-violet-200 border-violet-500/50' },
  ]

  const quickFilterChips = [
    { key: 'openNow' as const, label: 'Open' },
    { key: 'hasOffers' as const, label: 'Offers' },
    { key: 'closest' as const, label: 'Closest' },
    { key: 'mySaved' as const, label: 'Saved' },
    { key: 'hasSecretMenu' as const, label: 'Secrets' },
    { key: 'hasLoyalty' as const, label: 'Loyalty' },
  ]

  const activeFilterCount =
    (selectedFilter !== 'all' ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0) +
    Object.values(quickFilters).filter(Boolean).length

  const filterSummary = [
    selectedFilter !== 'all'
      ? segmentTabs.find((t) => t.id === selectedFilter)?.label
      : null,
    selectedCategory !== 'all'
      ? categoryOptions.find((o) => o.value === selectedCategory)?.label
      : null,
    ...quickFilterChips.filter((f) => quickFilters[f.key]).map((f) => f.label),
  ]
    .filter(Boolean)
    .join(' · ')

  const clearAllFilters = () => {
    setSelectedFilter('all')
    setSelectedCategory('all')
    setQuickFilters({
      openNow: false,
      hasOffers: false,
      hasSecretMenu: false,
      hasLoyalty: false,
      closest: false,
      mySaved: false,
    })
  }

  // Literal classes so Tailwind always emits selected/unselected chip styles
  const CHIP_ON = 'bg-[#00d083] text-black border-[#00d083]'
  const CHIP_OFF = 'bg-zinc-800 text-zinc-100 border-zinc-500'

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-[#00d083]/20 bg-gradient-to-br from-[#00d083]/10 via-zinc-950 to-violet-500/10 px-4 py-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#00d083]/90 font-semibold mb-1">
          Discover
        </p>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          {cityDisplayName}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm text-zinc-300">{businesses.length} places</p>
          {userLocation && (
            <button
              type="button"
              onClick={() => toggleQuickFilter('closest')}
              className={`text-sm font-medium transition-colors ${
                quickFilters.closest
                  ? 'text-[#00d083]'
                  : 'text-[#00d083]/90 underline underline-offset-2 decoration-[#00d083]/40 hover:text-[#00d083]'
              }`}
            >
              {quickFilters.closest ? 'Closest · on' : 'Closest to me'}
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00d083]/80 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search places..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3.5 bg-zinc-900/80 border border-[#00d083]/25 rounded-2xl text-white placeholder-zinc-400 focus:outline-none focus:border-[#00d083]/55 focus:ring-1 focus:ring-[#00d083]/25 transition-colors text-sm"
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

      <div className={sidebarOpen ? 'hidden lg:block' : ''}>
        <FilterPanel
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          activeCount={activeFilterCount}
          summary={filterSummary}
          onClear={clearAllFilters}
        >
          <FilterChipGroup label="Tier">
            {segmentTabs.map((tab) => {
              const isActive = selectedFilter === tab.id
              const isEmpty = tab.id !== 'all' && tab.count === 0
              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={isEmpty}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${
                    isActive ? tab.on : tab.off
                  } ${isEmpty ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {tab.label}
                  <span className="ml-1 opacity-80">{tab.count}</span>
                </button>
              )
            })}
          </FilterChipGroup>

          <FilterChipGroup label="Quick">
            {quickFilterChips.map((f) => {
              const isActive = quickFilters[f.key]
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggleQuickFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    isActive ? CHIP_ON : CHIP_OFF
                  }`}
                >
                  {f.key === 'mySaved' ? `Saved (${savedBusinesses.size})` : f.label}
                </button>
              )
            })}
          </FilterChipGroup>

          {categoryOptions.length > 0 && (
            <FilterChipGroup label="Type">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  selectedCategory === 'all' ? 'bg-white text-black border-white' : CHIP_OFF
                }`}
              >
                All types
              </button>
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedCategory(option.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    selectedCategory === option.value ? CHIP_ON : CHIP_OFF
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </FilterChipGroup>
          )}
        </FilterPanel>
      </div>

      <div className={sidebarOpen ? 'hidden lg:block' : ''} data-discover-results>
        <div className="flex items-center justify-between px-0.5 mb-3">
          <h2 className="text-lg font-semibold text-white">
            {searchQuery
              ? `Results for “${searchQuery}”`
              : selectedFilter === 'all'
                ? 'All places'
                : selectedFilter === 'qwikker_picks'
                  ? 'Qwikker Picks'
                  : selectedFilter === 'featured'
                    ? 'Featured'
                    : 'Recommended'}
          </h2>
          <span className="text-xs font-medium text-[#00d083]/90 bg-[#00d083]/10 border border-[#00d083]/25 px-2 py-0.5 rounded-full">
            {filteredBusinesses.length}
          </span>
        </div>

        {locationStatus === 'denied' && (
          <div className="mb-4 px-3.5 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-3">
            <p className="text-xs text-amber-100/90">
              Location off — distances won&apos;t show.
            </p>
            <button
              type="button"
              onClick={requestLocation}
              className="shrink-0 text-xs font-semibold text-amber-200 border border-amber-400/40 px-3 py-1.5 rounded-full"
            >
              Enable
            </button>
          </div>
        )}

        {filteredBusinesses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredBusinesses.map((business) => {
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
          <div className="text-center py-12 px-4 rounded-2xl border border-zinc-700/80 bg-zinc-900">
            <p className="text-zinc-100 font-semibold">No places in this filter</p>
            <p className="text-zinc-400 text-sm mt-1">
              {selectedFilter === 'featured'
                ? 'No Featured listings yet.'
                : selectedFilter === 'recommended'
                  ? 'No Recommended listings yet.'
                  : searchQuery
                    ? 'Try a different search.'
                    : 'Try another filter.'}
            </p>
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
              className="mt-4 text-xs font-semibold text-black bg-[#00d083] border border-[#00d083] px-4 py-2 rounded-full"
            >
              Show all places
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
