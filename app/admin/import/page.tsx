'use client'

import { useState } from 'react'
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
  DollarSign,
  Download,
  Building2,
  XCircle
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImportProgressModal } from '@/components/admin/import-progress-modal'

interface BusinessResult {
  placeId: string
  name: string
  rating: number
  reviewCount: number
  address: string
  category: string
  businessType: string
  distance: number
  status: string
  hasPhoto: boolean
  photoName: string | null
}

const CATEGORIES = [
  'Restaurant',
  'Cafe/Coffee Shop',
  'Bar/Pub',
  'Dessert/Ice Cream',
  'Takeaway/Street Food',
  'Salon/Spa',
  'Hairdresser/Barber',
  'Tattoo/Piercing',
  'Clothing/Fashion',
  'Gift Shop',
  'Fitness/Gym',
  'Sports/Outdoors',
  'Hotel/BnB',
  'Venue/Event Space',
  'Entertainment/Attractions',
  'Professional Services',
  'Other'
]

export default function AdminImportPage() {
  const [city, setCity] = useState('bournemouth')
  const [location, setLocation] = useState('Bournemouth, UK')
  const [category, setCategory] = useState('Restaurant')
  const [minRating, setMinRating] = useState([4.4])
  const [maxResults, setMaxResults] = useState([50])
  const [radius, setRadius] = useState([5000]) // meters
  const [results, setResults] = useState<BusinessResult[]>([])
  const [selectedResults, setSelectedResults] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchCost, setSearchCost] = useState('0.00')
  const [estimatedImportCost, setEstimatedImportCost] = useState('0.00')
  
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

  // Calculate costs
  const selectedCost = (selectedResults.length * 0.053).toFixed(2)
  const maxPossibleCost = (maxResults[0] * 0.053).toFixed(2)

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
          category,
          minRating: minRating[0],
          radius: radius[0],
          maxResults: maxResults[0]
        })
      })

      const data = await response.json()

      if (!data.success) {
        setSearchError(data.error || 'Search failed')
        setResults([])
        return
      }

      setResults(data.results || [])
      setSearchCost(data.searchCost || '0.00')
      setEstimatedImportCost(data.estimatedImportCost || '0.00')
      setSelectedResults([])
      setShowPreview(true)

      console.log(`✅ Found ${data.totalFound} businesses`)

    } catch (error: any) {
      console.error('Search error:', error)
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
      const selectedBusinesses = results.filter(r => selectedResults.includes(r.placeId))
      const category = selectedBusinesses[0]?.category || 'Other'
      const businessType = selectedBusinesses[0]?.businessType || 'other'

      const response = await fetch('/api/admin/import-businesses/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          placeIds: selectedResults,
          category,
          businessType
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

      {/* Warning Notice */}
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                Important: Google Places API Costs
              </p>
              <ul className="space-y-1 text-yellow-800 dark:text-yellow-200">
                <li>• Each business costs approximately £0.075 to import (API charges)</li>
                <li>• You need a valid Google Places API key (set in Franchise Setup)</li>
                <li>• Costs are charged to YOUR Google Cloud account, not QWIKKER HQ</li>
                <li>• Preview results before importing to avoid unnecessary charges</li>
              </ul>
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
          <div className="grid md:grid-cols-2 gap-6">
            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location / City</Label>
              <Input
                id="location"
                placeholder="e.g. Bournemouth, UK"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                City or area to search for businesses
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Business Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Type of business to import
              </p>
            </div>
          </div>

          {/* Min Rating Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Minimum Rating</Label>
              <Badge variant="secondary">{minRating[0].toFixed(1)} ⭐</Badge>
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
              <Badge variant="secondary">{(radius[0] / 1609.34).toFixed(1)} miles</Badge>
            </div>
            <Slider
              value={radius}
              onValueChange={setRadius}
              min={1609}
              max={16093}
              step={805}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              How far from city center to search (3-6 miles recommended)
            </p>
          </div>

          {/* Max Results Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Maximum Results</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{maxResults[0]} businesses</Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  ~£{maxPossibleCost} max
                </Badge>
              </div>
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
              Limit the number of results (start small to test, 50-200 recommended)
            </p>
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
                Preview Results (No Charge)
              </>
            )}
          </Button>
          
          {searchError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{searchError}</p>
            </div>
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
                  Found {results.length} businesses matching your criteria
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
            {/* Selection Summary */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  {selectedResults.length} businesses selected
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Estimated cost: £{selectedCost.toFixed(2)}
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
              {results.map(result => (
                <div
                  key={result.placeId}
                  className={`border rounded-lg p-4 transition-all ${
                    selectedResults.includes(result.placeId)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <div className="flex gap-4">
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
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{result.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              {result.rating.toFixed(1)} ({result.reviewCount} reviews)
                            </div>
                            <span>•</span>
                            <Badge variant="outline">{result.category}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{result.address}</span>
                        </div>
                        <div className="text-muted-foreground">
                          📏 {(result.distance / 1609.34).toFixed(1)} miles from center
                        </div>
                        {result.hasPhoto && (
                          <div className="text-muted-foreground">
                            📸 Photo available
                          </div>
                        )}
                        <div className="text-muted-foreground">
                          {result.status === 'OPERATIONAL' ? '✅ Open' : '⚠️ ' + result.status}
                        </div>
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

