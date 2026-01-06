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
  CheckCircle2,
  DollarSign,
  Download,
  Eye,
  Building2
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Mock Google Places results
const MOCK_RESULTS = [
  {
    id: 'place-1',
    name: 'The Larder House',
    address: '123 Old Christchurch Rd, Bournemouth',
    category: 'Restaurant',
    rating: 4.6,
    reviewCount: 847,
    phoneNumber: '+44 1202 123456',
    website: 'https://thelarderhouse.com',
    photos: 12,
    openingHours: 'Mon-Sun: 12:00 PM - 10:00 PM',
    googleMapsUrl: 'https://maps.google.com/?cid=123456789',
    alreadyImported: false
  },
  {
    id: 'place-2',
    name: "Joe's Barber Shop",
    address: '456 High Street, Bournemouth',
    category: 'Barber',
    rating: 4.8,
    reviewCount: 203,
    phoneNumber: '+44 1202 654321',
    website: '',
    photos: 5,
    openingHours: 'Mon-Sat: 9:00 AM - 6:00 PM',
    googleMapsUrl: 'https://maps.google.com/?cid=987654321',
    alreadyImported: false
  },
  {
    id: 'place-3',
    name: 'The Coffee Lab',
    address: '789 Commercial Rd, Bournemouth',
    category: 'Cafe',
    rating: 4.7,
    reviewCount: 512,
    phoneNumber: '+44 1202 789012',
    website: 'https://thecoffeelab.co.uk',
    photos: 20,
    openingHours: 'Mon-Sun: 7:00 AM - 6:00 PM',
    googleMapsUrl: 'https://maps.google.com/?cid=555555555',
    alreadyImported: true // Already in database
  }
]

const CATEGORIES = [
  'Restaurant',
  'Cafe',
  'Barber',
  'Beauty Salon',
  'Gym',
  'Bar',
  'Pub',
  'Hotel',
  'Spa',
  'Retail Store'
]

export default function AdminImportPage() {
  const [location, setLocation] = useState('Bournemouth, UK')
  const [category, setCategory] = useState('Restaurant')
  const [minRating, setMinRating] = useState([4.4])
  const [maxResults, setMaxResults] = useState([50])
  const [radius, setRadius] = useState([5000]) // meters
  const [results, setResults] = useState<typeof MOCK_RESULTS>([])
  const [selectedResults, setSelectedResults] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const costPerBusiness = 0.075 // £0.075 per business
  const estimatedCost = Math.min(maxResults[0], results.length) * costPerBusiness
  const selectedCost = selectedResults.length * costPerBusiness

  const handleSearch = async () => {
    setIsSearching(true)
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setResults(MOCK_RESULTS)
    setSelectedResults([])
    setShowPreview(true)
    setIsSearching(false)
  }

  const handleImport = async () => {
    if (selectedResults.length === 0) return

    setIsImporting(true)
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Success feedback
    alert(`✅ Successfully imported ${selectedResults.length} businesses!`)
    
    // Reset
    setResults([])
    setSelectedResults([])
    setShowPreview(false)
    setIsImporting(false)
  }

  const handleSelectAll = () => {
    const importableIds = results
      .filter(r => !r.alreadyImported)
      .map(r => r.id)
    setSelectedResults(importableIds)
  }

  const handleDeselectAll = () => {
    setSelectedResults([])
  }

  const toggleSelection = (id: string) => {
    setSelectedResults(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
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
              min={0}
              max={5}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Only import businesses with at least this rating (recommended: 4.4+)
            </p>
          </div>

          {/* Radius Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Search Radius</Label>
              <Badge variant="secondary">{(radius[0] / 1000).toFixed(1)} km</Badge>
            </div>
            <Slider
              value={radius}
              onValueChange={setRadius}
              min={1000}
              max={25000}
              step={1000}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              How far from city center to search (5-10km recommended)
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
                  ~£{estimatedCost.toFixed(2)} max
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
                  key={result.id}
                  className={`border rounded-lg p-4 transition-all ${
                    result.alreadyImported 
                      ? 'opacity-50 bg-gray-50 dark:bg-gray-900' 
                      : selectedResults.includes(result.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Checkbox */}
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedResults.includes(result.id)}
                        onChange={() => toggleSelection(result.id)}
                        disabled={result.alreadyImported}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
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
                              {result.rating} ({result.reviewCount} reviews)
                            </div>
                            <span>•</span>
                            <Badge variant="outline">{result.category}</Badge>
                          </div>
                        </div>
                        {result.alreadyImported && (
                          <Badge variant="secondary">Already Imported</Badge>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{result.address}</span>
                        </div>
                        {result.phoneNumber && (
                          <div className="text-muted-foreground">
                            📞 {result.phoneNumber}
                          </div>
                        )}
                        {result.website && (
                          <div className="text-muted-foreground">
                            🌐 {result.website.replace('https://', '')}
                          </div>
                        )}
                        <div className="text-muted-foreground">
                          📸 {result.photos} photos available
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        🕐 {result.openingHours}
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
    </div>
  )
}

