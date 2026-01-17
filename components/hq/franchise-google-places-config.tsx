'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface GooglePlacesConfig {
  google_places_public_key: string | null
  google_places_server_key: string | null
  google_places_country: string | null
  city_center_lat: number | null
  city_center_lng: number | null
  onboarding_search_radius_m: number | null
  import_search_radius_m: number | null
  import_max_radius_m: number | null
}

interface Props {
  franchiseId: string
  city: string
  displayName: string
  countryName: string
  currentConfig: GooglePlacesConfig
  legacyLat: number | null
  legacyLng: number | null
  onUpdate: () => void
}

// Preset radius templates
const RADIUS_PRESETS = [
  { name: 'Small Town', onboarding: 15000, import: 35000, max: 75000 },
  { name: 'Coastal (BCP)', onboarding: 35000, import: 75000, max: 150000 },
  { name: 'Metro', onboarding: 80000, import: 120000, max: 250000 },
  { name: 'Large Metro', onboarding: 120000, import: 200000, max: 400000 },
]

export function FranchiseGooglePlacesConfig({ 
  franchiseId, 
  city, 
  displayName,
  countryName,
  currentConfig, 
  legacyLat,
  legacyLng,
  onUpdate 
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeocodingCenter, setIsGeocodingCenter] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Use a single API key field that gets split server-side
  const [apiKey, setApiKey] = useState(
    currentConfig.google_places_public_key || 
    currentConfig.google_places_server_key || 
    ''
  )
  
  // Auto-fill center from legacy if available and center is not set
  const initialCenter = {
    lat: currentConfig.city_center_lat ?? legacyLat ?? null,
    lng: currentConfig.city_center_lng ?? legacyLng ?? null
  }
  
  const [config, setConfig] = useState<GooglePlacesConfig>({
    ...currentConfig,
    city_center_lat: initialCenter.lat,
    city_center_lng: initialCenter.lng,
    onboarding_search_radius_m: currentConfig.onboarding_search_radius_m ?? 35000,
    import_search_radius_m: currentConfig.import_search_radius_m ?? 75000,
    import_max_radius_m: currentConfig.import_max_radius_m ?? 200000,
  })
  
  const handleSave = async () => {
    if (!confirm('Save Google Places configuration?')) return
    
    setIsSaving(true)
    try {
      // Send the single API key (or null if empty) which will be duplicated server-side
      const payload = {
        ...config,
        google_places_api_key: apiKey.trim() || null, // Server will split this into public/server keys
      }
      
      const res = await fetch(`/api/hq/franchises/${franchiseId}/google-places`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to save configuration')
      }
      
      alert('✅ Google Places configuration saved successfully')
      setIsEditing(false)
      onUpdate()
    } catch (err) {
      alert(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleGeocodeCenter = async () => {
    // Use entered key, or existing server/public key, or show error
    const keyToUse = apiKey.trim() || currentConfig.google_places_server_key || currentConfig.google_places_public_key
    
    if (!keyToUse) {
      alert('Please enter an API key first, or save a key before geocoding')
      return
    }
    
    setIsGeocodingCenter(true)
    try {
      const res = await fetch(`/api/hq/franchises/${franchiseId}/geocode-center`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apiKey: keyToUse
        })
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to geocode city center')
      }
      
      const data = await res.json()
      setConfig({
        ...config,
        city_center_lat: data.lat,
        city_center_lng: data.lng
      })
      
      alert(`✅ City center set to: ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`)
    } catch (err) {
      alert(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsGeocodingCenter(false)
    }
  }
  
  const applyPreset = (preset: typeof RADIUS_PRESETS[0]) => {
    setConfig({
      ...config,
      onboarding_search_radius_m: preset.onboarding,
      import_search_radius_m: preset.import,
      import_max_radius_m: preset.max
    })
  }
  
  const hasApiKey = !!apiKey || !!currentConfig.google_places_public_key || !!currentConfig.google_places_server_key
  const hasCenter = config.city_center_lat != null && config.city_center_lng != null
  const isFullyConfigured = hasApiKey && hasCenter
  
  if (!isEditing) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Google Places (Pilot)</h3>
          <Button
            onClick={() => setIsEditing(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {hasApiKey ? 'Edit Config' : 'Setup'}
          </Button>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">API Key:</span>
            <span className={hasApiKey ? 'text-green-400' : 'text-red-400'}>
              {hasApiKey ? '✓ Configured' : '✗ Not Set'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">City Center:</span>
            <span className={hasCenter ? 'text-green-400' : 'text-yellow-400'}>
              {hasCenter ? `${config.city_center_lat?.toFixed(4)}, ${config.city_center_lng?.toFixed(4)}` : '⚠ Auto-detected'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Onboarding Radius:</span>
            <span className="text-white">
              {(config.onboarding_search_radius_m! / 1000).toFixed(0)}km
            </span>
          </div>
        </div>
        
        {!isFullyConfigured && !hasApiKey && (
          <div className="mt-4 bg-blue-950/30 border border-blue-800/50 rounded p-3 text-xs text-blue-200">
            💡 Add a Google Places API key to enable onboarding autocomplete and admin import tools.
          </div>
        )}
        
        {hasApiKey && !hasCenter && (
          <div className="mt-4 bg-amber-950/30 border border-amber-800/50 rounded p-3 text-xs text-amber-200">
            ⚠️ City center not set. Using fallback coordinates. Edit config to set precise center.
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Configure Google Places (Pilot)</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setApiKey(currentConfig.google_places_public_key || currentConfig.google_places_server_key || '')
              setConfig(currentConfig)
              setIsEditing(false)
            }}
            variant="outline"
            size="sm"
            disabled={isSaving}
            className="border-neutral-700 text-neutral-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
            disabled={isSaving || !apiKey.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Single API Key */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">API Key</h4>
            <button
              type="button"
              onClick={() => setShowKeys(!showKeys)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {showKeys ? 'Hide' : 'Show'} Key
            </button>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-neutral-300">
              Google Places API Key
            </Label>
            <Input
              id="apiKey"
              type={showKeys ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="bg-neutral-800 border-neutral-700 text-white"
            />
            <p className="text-xs text-neutral-500">
              Get your API key from <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a>. 
              Enable "Places API (New)" for your project. This key will be used for both client and server requests.
            </p>
          </div>
        </div>
        
        {/* Geographic Center */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">City Center (Optional)</h4>
            <Button
              onClick={handleGeocodeCenter}
              disabled={
                isGeocodingCenter || 
                (!apiKey.trim() && !currentConfig.google_places_server_key && !currentConfig.google_places_public_key)
              }
              size="sm"
              variant="outline"
              className="border-neutral-700 text-neutral-300"
            >
              {isGeocodingCenter ? 'Geocoding...' : 'Set Center Automatically'}
            </Button>
          </div>
          
          {hasCenter ? (
            <div className="bg-neutral-800 border border-neutral-700 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-400">Current Center:</span>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, city_center_lat: null, city_center_lng: null })}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Clear
                </button>
              </div>
              <div className="text-white font-mono text-sm">
                {config.city_center_lat?.toFixed(4)}, {config.city_center_lng?.toFixed(4)}
              </div>
            </div>
          ) : legacyLat && legacyLng ? (
            <div className="bg-blue-950/30 border border-blue-800/50 rounded p-3 text-xs text-blue-200">
              💡 Using legacy coordinates: {legacyLat.toFixed(4)}, {legacyLng.toFixed(4)}. 
              Click "Set Center Automatically" to update.
            </div>
          ) : (
            <p className="text-xs text-neutral-500">
              Click "Set Center Automatically" to geocode "{displayName}, {countryName}" using Google, 
              or leave empty to use franchise default coordinates.
            </p>
          )}
        </div>
        
        {/* Advanced Settings */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="text-sm font-semibold text-white">Advanced Settings (Optional)</h4>
            <span className="text-neutral-400 text-xs">
              {showAdvanced ? '▼ Hide' : '▶ Show'}
            </span>
          </button>
          
          {showAdvanced && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Search Radius Presets:</span>
                <div className="flex gap-2">
                  {RADIUS_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="text-xs px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="onboardingRadius" className="text-neutral-300 text-xs">
                  Onboarding Radius
                </Label>
                <Input
                  id="onboardingRadius"
                  type="number"
                  min="5000"
                  max="500000"
                  step="1000"
                  value={config.onboarding_search_radius_m || 35000}
                  onChange={(e) => setConfig({ ...config, onboarding_search_radius_m: parseInt(e.target.value) || 35000 })}
                  className="bg-neutral-800 border-neutral-700 text-white text-sm"
                />
                <p className="text-xs text-neutral-500">
                  Max distance for business signup searches ({(config.onboarding_search_radius_m! / 1000).toFixed(0)}km)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="importDefaultRadius" className="text-neutral-300 text-xs">
                  Import Default Radius
                </Label>
                <Input
                  id="importDefaultRadius"
                  type="number"
                  min="5000"
                  max="1000000"
                  step="1000"
                  value={config.import_search_radius_m || 75000}
                  onChange={(e) => setConfig({ ...config, import_search_radius_m: parseInt(e.target.value) || 75000 })}
                  className="bg-neutral-800 border-neutral-700 text-white text-sm"
                />
                <p className="text-xs text-neutral-500">
                  Default for admin import tool ({(config.import_search_radius_m! / 1000).toFixed(0)}km)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="importMaxRadius" className="text-neutral-300 text-xs">
                  Import Maximum Radius
                </Label>
                <Input
                  id="importMaxRadius"
                  type="number"
                  min="10000"
                  max="1000000"
                  step="1000"
                  value={config.import_max_radius_m || 200000}
                  onChange={(e) => setConfig({ ...config, import_max_radius_m: parseInt(e.target.value) || 200000 })}
                  className="bg-neutral-800 border-neutral-700 text-white text-sm"
                />
                <p className="text-xs text-neutral-500">
                  Slider limit in import tool ({(config.import_max_radius_m! / 1000).toFixed(0)}km)
                </p>
              </div>
            </>
          )}
        </div>
        
        <div className="bg-green-950/20 border border-green-800/40 rounded p-4 text-xs text-green-200">
          <p className="font-semibold mb-2">✅ Quick Setup:</p>
          <ol className="space-y-1 ml-4 list-decimal">
            <li>Paste your Google Places API key above</li>
            <li>Click "Set Center Automatically" (or leave empty for defaults)</li>
            <li>Click "Save Configuration"</li>
            <li>Done! Onboarding will now work on localhost with ?city={city}</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
