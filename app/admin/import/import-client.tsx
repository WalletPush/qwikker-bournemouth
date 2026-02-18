'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  Star, 
  Search, 
  AlertCircle, 
  Download,
  Building2,
  XCircle,
  Info,
  ExternalLink
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImportProgressModal } from '@/components/admin/import-progress-modal'
import { ONBOARDING_CATEGORY_OPTIONS, type SystemCategory, SYSTEM_CATEGORY_LABEL } from '@/lib/constants/system-categories'
import { CATEGORY_MAPPING } from '@/lib/constants/category-mapping'

const MAX_GRID_POINTS = 25
const MAX_TYPES_PER_CATEGORY = 15
const MAX_REQUESTS_PER_PREVIEW = 400
const GRID_CELL_SPACING = 3600
const GRID_RADIUS_MANY = 3000
const GRID_RADIUS_FEW = 5000

interface AdminImportClientProps {
  city: string
  currencyCode: string
  countryName: string
  displayName: string
  importMaxRadiusM: number
}

interface BusinessResult {
  placeId: string
  name: string
  rating: number
  reviewCount: number
  address: string
  category: string // Display label (e.g. "Restaurant", "Cafe / Coffee Shop")
  systemCategory?: string // Optional: stable enum for reference
  googleTypes?: string[] // Raw Google types for cuisine tags
  googlePrimaryType?: string // Google's primary type (e.g. "cafe", "restaurant", "night_club")
  matchReason?: string | null
  distance: number
  status: string
  hasPhoto: boolean
  photoName: string | null
}

export default function AdminImportClient({ city: defaultCity, currencyCode, countryName, displayName, importMaxRadiusM }: AdminImportClientProps) {
  const [city, setCity] = useState(defaultCity)
  // Default location is just the city name - country is automatically appended by backend
  const [location, setLocation] = useState(displayName)
  const [category, setCategory] = useState<SystemCategory>('restaurant')
  const [minRating, setMinRating] = useState([4.4])
  const [maxResults, setMaxResults] = useState([50])
  const [radius, setRadius] = useState([5000]) // meters
  const [results, setResults] = useState<BusinessResult[]>([])
  const [selectedResults, setSelectedResults] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [costData, setCostData] = useState<{
    preview: { description: string }
    import: { description: string }
  } | null>(null)
  const [searchMeta, setSearchMeta] = useState<{
    center: { lat: number; lng: number }
    resolvedLocation: string
    resolutionMethod: string
    gridPoints: number
    typesSearched: number
    requestsMade: number
  } | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'reviews'>('rating')
  const [searchFilter, setSearchFilter] = useState('') // Filter for preview results
  
  // ✅ NEW: Text search for specific businesses
  const [searchMode, setSearchMode] = useState<'radius' | 'text'>('radius')
  const [textQuery, setTextQuery] = useState('') // e.g., "Bollywood Indian Cuisine"
  const [liveResults, setLiveResults] = useState<BusinessResult[]>([]) // Live search results
  const [isLiveSearching, setIsLiveSearching] = useState(false)

  // ✅ Debounced live search as user types
  useEffect(() => {
    if (searchMode !== 'text' || !textQuery.trim() || textQuery.length < 3) {
      setLiveResults([])
      return
    }

    setIsLiveSearching(true)
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch('/api/admin/import-businesses/text-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textQuery,
            location: `${displayName}, ${countryName}`
          })
        })

        const data = await response.json()
        if (data.success) {
          setLiveResults(data.results || [])
        } else {
          setLiveResults([])
        }
      } catch (error) {
        console.error('Live search error:', error)
        setLiveResults([])
      } finally {
        setIsLiveSearching(false)
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [textQuery, searchMode, displayName, countryName])
  
  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [importProgress, setImportProgress] = useState<{
    current: number
    total: number
    imported: number
    skipped: number
    failed: number
    currentBusiness: string
    status: 'success' | 'skipped' | 'failed' | 'importing'
  } | null>(null)
  const [isImportComplete, setIsImportComplete] = useState(false)
  const [isImportCancelled, setIsImportCancelled] = useState(false)

  // Helper: Extract cuisine tags from Google types
  const getCuisineTags = (googleTypes?: string[]): string[] => {
    if (!googleTypes) return []
    
    return googleTypes
      .filter(t => t.endsWith('_restaurant') || t.includes('_bar') || t.includes('cuisine'))
      .map(t => t
        .replace('_restaurant', '')
        .replace('_bar', '')
        .replace('_cuisine', '')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      )
      .filter(tag => tag && tag !== 'Restaurant' && tag !== 'Bar') // Remove redundant labels
      .slice(0, 2) // Show max 2 cuisine tags
  }

  // Pre-search request estimation (no currency -- multi-tenant)
  const estimatePreSearchRequests = () => {
    const config = CATEGORY_MAPPING[category]
    if (!config) return { requests: 0, gridPoints: 1, typeCount: 0 }

    const typeCount = Math.min(config.googleTypes.length, MAX_TYPES_PER_CATEGORY)
    const isManyTypes = typeCount >= 5
    const threshold = isManyTypes ? GRID_RADIUS_MANY : GRID_RADIUS_FEW

    let gridPoints = 1
    if (radius[0] > threshold) {
      const stepsNeeded = Math.ceil(radius[0] / GRID_CELL_SPACING)
      gridPoints = 1 + (2 * stepsNeeded) * (2 * stepsNeeded)
      gridPoints = Math.min(gridPoints, MAX_GRID_POINTS)
    }

    let requests = gridPoints * typeCount
    if (requests > MAX_REQUESTS_PER_PREVIEW) {
      gridPoints = Math.max(1, Math.floor(MAX_REQUESTS_PER_PREVIEW / typeCount))
      requests = gridPoints * typeCount
    }

    return { requests, gridPoints, typeCount }
  }

  const preEstimate = estimatePreSearchRequests()

  const handleSearch = async () => {
    setIsSearching(true)
    setSearchError('')
    
    try {
      const response = await fetch('/api/admin/import-businesses/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          location,
          category, // SystemCategory enum value (e.g. 'restaurant', 'cafe')
          minRating: minRating[0],
          radius: radius[0],
          maxResults: maxResults[0],
          skipDuplicates
        })
      })

      const data = await response.json()

      if (!data.success) {
        setSearchError(data.error || 'Search failed')
        setResults([])
        return
      }

      setResults(data.results || [])
      setCostData(data.costs || null)
      setSearchMeta(data.search || null)
      setSelectedResults([])
      setShowPreview(true)

      console.log(`✅ Found ${data.totalFound} businesses`)

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to search businesses'
      console.error('Search error:', error)
      setSearchError(message)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // ✅ NEW: Text search for specific business
  const handleTextSearch = async () => {
    setIsSearching(true)
    setSearchError('')
    
    try {
      const response = await fetch('/api/admin/import-businesses/text-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textQuery,
          location: `${displayName}, ${countryName}`
        })
      })

      const data = await response.json()

      if (!data.success) {
        setSearchError(data.error || 'Search failed')
        setResults([])
        return
      }

      setResults(data.results || [])
      setCostData(data.costs || null)
      setSelectedResults([])
      setShowPreview(true)

      console.log(`✅ Found ${data.totalFound} businesses matching "${textQuery}"`)

    } catch (error: any) {
      console.error('Text search error:', error)
      setSearchError(error.message || 'Failed to search businesses')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleImport = async () => {
    if (selectedResults.length === 0) return

    setIsImporting(true)
    setShowProgressModal(true)
    setIsImportComplete(false)
    setIsImportCancelled(false)
    setImportProgress({
      current: 0,
      total: selectedResults.length,
      imported: 0,
      skipped: 0,
      failed: 0,
      currentBusiness: 'Starting import...',
      status: 'importing'
    })
    
    try {
      const response = await fetch('/api/admin/import-businesses/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          placeIds: selectedResults,
          systemCategory: category, // Use the system category from form (e.g. 'restaurant', 'cafe')
          displayCategory: SYSTEM_CATEGORY_LABEL[category], // User-facing label (e.g. 'Restaurant', 'Cafe / Coffee Shop')
          skipDuplicates
        })
      })

      if (!response.ok) {
        throw new Error('Import failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response stream')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue

          try {
            const data = JSON.parse(line.replace('data: ', ''))
            
            if (data.type === 'progress') {
              setImportProgress({
                current: data.current,
                total: data.total,
                imported: data.imported,
                skipped: data.skipped,
                failed: data.failed,
                currentBusiness: data.currentBusiness,
                status: data.status
              })
            } else if (data.type === 'complete') {
              setImportProgress({
                current: data.total,
                total: data.total,
                imported: data.imported,
                skipped: data.skipped,
                failed: data.failed,
                currentBusiness: 'Complete!',
                status: 'success'
              })
              setIsImportComplete(true)
              setIsImporting(false)
              
              // Reset results after successful import
              setTimeout(() => {
                setResults([])
                setSelectedResults([])
                setShowPreview(false)
              }, 2000)
              
              return
            } else if (data.type === 'cancelled') {
              setImportProgress({
                current: data.total,
                total: data.total,
                imported: data.imported,
                skipped: data.skipped,
                failed: data.failed,
                currentBusiness: 'Cancelled',
                status: 'failed'
              })
              setIsImportCancelled(true)
              setIsImporting(false)
              return
            } else if (data.type === 'error') {
              throw new Error(data.message)
            }

          } catch (parseError) {
            console.warn('Failed to parse SSE data:', parseError)
          }
        }
      }

    } catch (error: any) {
      console.error('Import error:', error)
      setImportProgress({
        current: 0,
        total: selectedResults.length,
        imported: 0,
        skipped: 0,
        failed: selectedResults.length,
        currentBusiness: 'Error: ' + error.message,
        status: 'failed'
      })
      setIsImportComplete(true)
    } finally {
      setIsImporting(false)
    }
  }

  const handleStopImport = () => {
    // TODO: Implement actual cancellation via API
    setIsImportCancelled(true)
    setIsImporting(false)
  }

  const handleCloseProgressModal = () => {
    setShowProgressModal(false)
    setImportProgress(null)
    setIsImportComplete(false)
    setIsImportCancelled(false)
  }

  const handleSelectAll = () => {
    const allIds = results.map(r => r.placeId)
    setSelectedResults(allIds)
  }

  const handleDeselectAll = () => {
    setSelectedResults([])
  }

  const toggleSelection = (placeId: string) => {
    setSelectedResults(prev => 
      prev.includes(placeId) 
        ? prev.filter(id => id !== placeId)
        : [...prev, placeId]
    )
  }

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Import Businesses</h1>
        <p className="text-muted-foreground">
          Use Google Places API to automatically populate your city with businesses
        </p>
      </div>

      {/* Google Places API Info */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mt-0.5">
              <Info className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">How this works</p>
              <p className="text-muted-foreground">
                Each preview sends search requests to Google Places. Larger radii and categories with many sub-types use more requests.
                Most franchises stay well within Google&apos;s monthly free tier.
              </p>
              <a
                href="https://console.cloud.google.com/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Open Google Cloud billing
                <ExternalLink className="w-3 h-3" />
              </a>

              {/* Post-search summary */}
              {searchMeta && (
                <div className="mt-3 p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/50 space-y-1 text-xs">
                  <p className="font-medium text-foreground">Last preview</p>
                  <p className="text-muted-foreground">
                    {searchMeta.requestsMade} requests across {searchMeta.gridPoints} search point{searchMeta.gridPoints > 1 ? 's' : ''} ({searchMeta.typesSearched} types)
                  </p>
                  <p className="text-muted-foreground">
                    Resolved &quot;{searchMeta.resolvedLocation}&quot; → {searchMeta.center.lat.toFixed(4)}, {searchMeta.center.lng.toFixed(4)} ({searchMeta.resolutionMethod})
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Search Parameters</CardTitle>
          <CardDescription>
            Configure what businesses to import from Google Places
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ✅ NEW: Search Mode Toggle */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
            <Label className="text-sm font-medium whitespace-nowrap">Search Mode:</Label>
            <div className="flex gap-2">
              <Button
                variant={searchMode === 'radius' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchMode('radius')}
              >
                <MapPin className="w-4 h-4 mr-1" />
                Area Search
              </Button>
              <Button
                variant={searchMode === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchMode('text')}
              >
                <Search className="w-4 h-4 mr-1" />
                Find Specific Business
              </Button>
            </div>
          </div>

          {/* Text Search UI */}
          {searchMode === 'text' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Search for a specific business</p>
                    <p>Start typing a business name to see live results (e.g., "Bollywood Indian Cuisine").</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 relative">
                <Label htmlFor="textQuery">Business Name</Label>
                <div className="relative">
                  <Input
                    id="textQuery"
                    placeholder='Type to search... (min 3 characters)'
                    value={textQuery}
                    onChange={(e) => setTextQuery(e.target.value)}
                    className="pr-10"
                  />
                  {isLiveSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="animate-spin">⏳</span>
                    </div>
                  )}
                </div>

                {/* Live Results Dropdown */}
                {textQuery.length >= 3 && liveResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {liveResults.map((result) => (
                        <button
                          key={result.placeId}
                          onClick={() => {
                            // Add to preview
                            setResults([result])
                            setSelectedResults([result.placeId])
                            setShowPreview(true)
                            setLiveResults([]) // Clear dropdown
                          }}
                          className="w-full text-left p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <div className="font-semibold">{result.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {result.rating.toFixed(1)}
                            </span>
                            <span>•</span>
                            <span>{result.reviewCount} reviews</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {result.address}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {textQuery.length >= 3 && !isLiveSearching && liveResults.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No businesses found matching "{textQuery}"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Radius Search UI */}
          {searchMode === 'radius' && (
            <>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">
                Search Center <span className="text-xs text-muted-foreground">({countryName})</span>
              </Label>
              <Input
                id="location"
                placeholder={`e.g., ${displayName} or neighborhood name`}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                Searches are limited to {countryName} (prevents importing wrong-country businesses)
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Business Category</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as SystemCategory)}>
                <SelectTrigger className="w-full">
                  <span className="truncate">{SYSTEM_CATEGORY_LABEL[category]}</span>
                </SelectTrigger>
                <SelectContent>
                  {ONBOARDING_CATEGORY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Type of business to import (uses canonical categories)
              </p>
            </div>
          </div>

          {/* Min Rating Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Minimum Rating</Label>
              <Badge variant="secondary">{minRating[0].toFixed(1)}★</Badge>
            </div>
            <Slider
              value={minRating}
              onValueChange={setMinRating}
              min={4.4}
              max={5}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Only import businesses with at least this rating (minimum: 4.4★)
            </p>
          </div>

          {/* Radius Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Search Radius</Label>
              <Badge variant="secondary">{(radius[0] / 1609.34).toFixed(1)} miles ({(radius[0] / 1000).toFixed(1)} km)</Badge>
            </div>
            <Slider
              value={radius}
              onValueChange={setRadius}
              min={1609}
              max={importMaxRadiusM}
              step={805}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Max: {(importMaxRadiusM / 1609.34).toFixed(0)} miles ({(importMaxRadiusM / 1000).toFixed(0)} km) — set by HQ Admin
            </p>
          </div>

          {/* Max Results Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Maximum Results</Label>
              <Badge variant="secondary">{maxResults[0]} businesses</Badge>
            </div>
            <Slider
              value={maxResults}
              onValueChange={setMaxResults}
              min={10}
              max={500}
              step={10}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Limit the number of results (start small to test, 50-200 recommended).
              Higher values increase preview cost slightly but improve coverage.
            </p>
          </div>

          {/* Pre-Search Estimates */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estimated requests:</span>
              <span className="font-semibold">~{preEstimate.requests}</span>
            </div>
            {preEstimate.gridPoints > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Grid points:</span>
                <span className="font-semibold">{preEstimate.gridPoints}</span>
              </div>
            )}
            {preEstimate.gridPoints > 1 && (
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                Grid search active — {preEstimate.gridPoints} points across your {(radius[0] / 1000).toFixed(1)}km radius for broader coverage
              </p>
            )}
            {preEstimate.requests > 300 && (
              <p className="text-xs text-orange-700 dark:text-orange-300 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                Large search — consider reducing radius or choosing a different category
              </p>
            )}
          </div>

          {/* Search Button */}
          <Button 
            onClick={handleSearch} 
            disabled={isSearching || !location}
            size="lg"
            className="w-full"
          >
            {isSearching ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Searching Google Places...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Preview Results
              </>
            )}
          </Button>
          
          {searchError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{searchError}</p>
            </div>
          )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Results Preview */}
      {showPreview && results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview Results</CardTitle>
                <CardDescription>
                  {(() => {
                    const filteredCount = results.filter(result => {
                      if (!searchFilter.trim()) return true
                      const query = searchFilter.toLowerCase()
                      return (
                        result.name.toLowerCase().includes(query) ||
                        result.address.toLowerCase().includes(query) ||
                        result.category.toLowerCase().includes(query)
                      )
                    }).length
                    return searchFilter.trim()
                      ? `Showing ${filteredCount} of ${results.length} businesses`
                      : `Found ${results.length} businesses matching your criteria`
                  })()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleSelectAll} size="sm">
                  Select All
                </Button>
                <Button variant="outline" onClick={handleDeselectAll} size="sm">
                  Deselect All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sort and Filter Controls */}
            <div className="space-y-3">
              {/* Search Filter */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filter by business name, address, or category..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Sort Controls */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                <div className="flex items-center gap-2 flex-1">
                  <Label htmlFor="sortBy" className="text-sm whitespace-nowrap">Sort by:</Label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">Highest Rating</SelectItem>
                      <SelectItem value="reviews">Most Reviews</SelectItem>
                      <SelectItem value="distance">Nearest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="skipDuplicates"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="skipDuplicates" className="text-sm cursor-pointer">
                    Skip duplicates
                  </Label>
                </div>
              </div>
            </div>

            {/* What Happens Next */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  What happens after import?
                </p>
                <ul className="text-blue-700 dark:text-blue-300 space-y-0.5 list-disc list-inside">
                  <li>Businesses added as <strong>unclaimed</strong> (visible in Discover only)</li>
                  <li><strong>NOT visible in AI chat</strong> (even after claiming as Free Listing)</li>
                  <li>Only paid plans (Starter/Featured/Spotlight) or Free Trial unlock AI visibility</li>
                  <li>Owners can claim & upgrade via QR code or claim page</li>
                  <li>Placeholder images used until real photos uploaded</li>
                </ul>
              </div>
            </div>

            {/* Selection Summary */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  {selectedResults.length} businesses selected
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Ready to import using preview data
                </p>
              </div>
              <Button
                onClick={handleImport}
                disabled={selectedResults.length === 0 || isImporting}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isImporting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import Selected ({selectedResults.length})
                  </>
                )}
              </Button>
            </div>

            {/* Results List */}
            <div className="space-y-3">
              {results
                .slice() // Create a copy to avoid mutating state
                .filter(result => {
                  // ✅ NEW: Filter by search query
                  if (!searchFilter.trim()) return true
                  const query = searchFilter.toLowerCase()
                  return (
                    result.name.toLowerCase().includes(query) ||
                    result.address.toLowerCase().includes(query) ||
                    result.category.toLowerCase().includes(query)
                  )
                })
                .sort((a, b) => {
                  if (sortBy === 'rating') return b.rating - a.rating
                  if (sortBy === 'reviews') return b.reviewCount - a.reviewCount
                  if (sortBy === 'distance') return a.distance - b.distance
                  return 0
                })
                .map(result => (
                <div
                  key={result.placeId}
                  className={`border rounded-lg p-4 transition-all ${
                    selectedResults.includes(result.placeId)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Checkbox */}
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedResults.includes(result.placeId)}
                        onChange={() => toggleSelection(result.placeId)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </div>

                    {/* Business Info */}
                    <div className="flex-1 space-y-2">
                      {/* Top line: Name + Rating */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{result.name}</h3>
                          <div className="flex items-center gap-1 text-sm mt-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{result.rating.toFixed(1)}</span>
                            <span className="text-muted-foreground">({result.reviewCount} reviews)</span>
                          </div>
                        </div>
                        
                        {/* Quick action icons */}
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.name)}&query_place_id=${result.placeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            title="Open in Google Maps"
                          >
                            <MapPin className="w-4 h-4" />
                            Maps
                          </a>
                        </div>
                      </div>

                      {/* Second line: Address + Distance */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{result.address}</span>
                        <span>•</span>
                        <span className="font-medium">{(result.distance / 1609.34).toFixed(1)} mi</span>
                      </div>

                      {/* Third line: Category + Google Primary Type + Cuisine chips */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{result.category}</Badge>
                        {result.googlePrimaryType && (
                          <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                            Google: {result.googlePrimaryType.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        {result.matchReason && (
                          <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                            Matched: {result.matchReason}
                          </Badge>
                        )}
                        {getCuisineTags(result.googleTypes).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {result.hasPhoto && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            📸 Photo
                          </Badge>
                        )}
                        {result.status !== 'OPERATIONAL' && (
                          <Badge variant="destructive" className="text-xs">
                            ⚠️ {result.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {showPreview && results.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No businesses found matching your criteria</p>
            <p className="text-sm mt-2">Try adjusting the search parameters</p>
          </CardContent>
        </Card>
      )}

      {/* Import Progress Modal */}
      <ImportProgressModal
        isOpen={showProgressModal}
        onClose={handleCloseProgressModal}
        progress={importProgress}
        onStop={handleStopImport}
        isComplete={isImportComplete}
        isCancelled={isImportCancelled}
      />
    </div>
  )
}

