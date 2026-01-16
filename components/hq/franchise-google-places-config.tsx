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
  currentConfig: GooglePlacesConfig
  onUpdate: () => void
}

// Preset radius templates
const RADIUS_PRESETS = [
  { name: 'Small Town', onboarding: 15000, import: 35000, max: 75000 },
  { name: 'Coastal (BCP)', onboarding: 35000, import: 75000, max: 150000 },
  { name: 'Metro', onboarding: 80000, import: 120000, max: 250000 },
  { name: 'Large Metro', onboarding: 120000, import: 200000, max: 400000 },
]

export function FranchiseGooglePlacesConfig({ franchiseId, city, currentConfig, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  
  const [config, setConfig] = useState<GooglePlacesConfig>(currentConfig)
  
  const handleSave = async () => {
    if (!confirm('Save Google Places configuration?')) return
    
    setIsSaving(true)
    try {
      const res = await fetch(`/api/hq/franchises/${franchiseId}/google-places`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
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
  
  const applyPreset = (preset: typeof RADIUS_PRESETS[0]) => {
    setConfig({
      ...config,
      onboarding_search_radius_m: preset.onboarding,
      import_search_radius_m: preset.import,
      import_max_radius_m: preset.max
    })
  }
  
  const hasPublicKey = !!config.google_places_public_key
  const hasServerKey = !!config.google_places_server_key
  const hasCenter = config.city_center_lat != null && config.city_center_lng != null
  const isFullyConfigured = hasPublicKey && hasServerKey && hasCenter
  
  if (!isEditing) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Google Places Configuration</h3>
          <Button
            onClick={() => setIsEditing(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            Edit Config
          </Button>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Public API Key:</span>
            <span className={hasPublicKey ? 'text-green-400' : 'text-red-400'}>
              {hasPublicKey ? '✓ Configured' : '✗ Not Set'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Server API Key:</span>
            <span className={hasServerKey ? 'text-green-400' : 'text-red-400'}>
              {hasServerKey ? '✓ Configured' : '✗ Not Set'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">City Center:</span>
            <span className={hasCenter ? 'text-green-400' : 'text-red-400'}>
              {hasCenter ? `${config.city_center_lat}, ${config.city_center_lng}` : '✗ Not Set'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Country:</span>
            <span className="text-white">{config.google_places_country || 'gb'}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Onboarding Radius:</span>
            <span className="text-white">
              {config.onboarding_search_radius_m ? `${(config.onboarding_search_radius_m / 1000).toFixed(1)}km` : '30km (default)'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Import Default Radius:</span>
            <span className="text-white">
              {config.import_search_radius_m ? `${(config.import_search_radius_m / 1000).toFixed(1)}km` : '50km (default)'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Import Max Radius:</span>
            <span className="text-white">
              {config.import_max_radius_m ? `${(config.import_max_radius_m / 1000).toFixed(1)}km` : '200km (default)'}
            </span>
          </div>
        </div>
        
        {!isFullyConfigured && (
          <div className="mt-4 bg-amber-950/30 border border-amber-800/50 rounded p-3 text-xs text-amber-200">
            ⚠️ Google Places is not fully configured. Onboarding and import features will be disabled.
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Edit Google Places Configuration</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => {
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
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* API Keys */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">API Keys</h4>
            <button
              type="button"
              onClick={() => setShowKeys(!showKeys)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {showKeys ? 'Hide' : 'Show'} Keys
            </button>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="publicKey" className="text-neutral-300">
              Public API Key (Client-Side)
            </Label>
            <Input
              id="publicKey"
              type={showKeys ? 'text' : 'password'}
              value={config.google_places_public_key || ''}
              onChange={(e) => setConfig({ ...config, google_places_public_key: e.target.value })}
              placeholder="AIza..."
              className="bg-neutral-800 border-neutral-700 text-white"
            />
            <p className="text-xs text-neutral-500">
              Used in browser. Restrict by HTTP referrers in Google Cloud Console.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="serverKey" className="text-neutral-300">
              Server API Key (Server-Side)
            </Label>
            <Input
              id="serverKey"
              type={showKeys ? 'text' : 'password'}
              value={config.google_places_server_key || ''}
              onChange={(e) => setConfig({ ...config, google_places_server_key: e.target.value })}
              placeholder="AIza..."
              className="bg-neutral-800 border-neutral-700 text-white"
            />
            <p className="text-xs text-neutral-500">
              Used for Places Details API. Restrict by IP addresses in Google Cloud Console.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="country" className="text-neutral-300">
              Country Code
            </Label>
            <Input
              id="country"
              type="text"
              value={config.google_places_country || 'gb'}
              onChange={(e) => setConfig({ ...config, google_places_country: e.target.value })}
              placeholder="gb"
              maxLength={2}
              className="bg-neutral-800 border-neutral-700 text-white"
            />
            <p className="text-xs text-neutral-500">
              ISO country code (e.g., "gb", "us", "ca")
            </p>
          </div>
        </div>
        
        {/* Geographic Center */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-white">City Center Coordinates</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat" className="text-neutral-300">
                Latitude
              </Label>
              <Input
                id="lat"
                type="number"
                step="0.0001"
                value={config.city_center_lat || ''}
                onChange={(e) => setConfig({ ...config, city_center_lat: parseFloat(e.target.value) || null })}
                placeholder="50.7192"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lng" className="text-neutral-300">
                Longitude
              </Label>
              <Input
                id="lng"
                type="number"
                step="0.0001"
                value={config.city_center_lng || ''}
                onChange={(e) => setConfig({ ...config, city_center_lng: parseFloat(e.target.value) || null })}
                placeholder="-1.8808"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>
          </div>
          
          <p className="text-xs text-neutral-500">
            Used to restrict Google Places searches to your franchise area. Find coordinates at{' '}
            <a href="https://www.latlong.net/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              latlong.net
            </a>
          </p>
        </div>
        
        {/* Radius Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Search Radii (meters)</h4>
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
            <Label htmlFor="onboardingRadius" className="text-neutral-300">
              Onboarding Radius (meters)
            </Label>
            <Input
              id="onboardingRadius"
              type="number"
              min="5000"
              max="500000"
              step="1000"
              value={config.onboarding_search_radius_m || 30000}
              onChange={(e) => setConfig({ ...config, onboarding_search_radius_m: parseInt(e.target.value) || 30000 })}
              className="bg-neutral-800 border-neutral-700 text-white"
            />
            <p className="text-xs text-neutral-500">
              Maximum distance for business signup Google Places searches. 
              {config.onboarding_search_radius_m && ` (${(config.onboarding_search_radius_m / 1000).toFixed(1)}km)`}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="importDefaultRadius" className="text-neutral-300">
              Import Default Radius (meters)
            </Label>
            <Input
              id="importDefaultRadius"
              type="number"
              min="5000"
              max="1000000"
              step="1000"
              value={config.import_search_radius_m || 50000}
              onChange={(e) => setConfig({ ...config, import_search_radius_m: parseInt(e.target.value) || 50000 })}
              className="bg-neutral-800 border-neutral-700 text-white"
            />
            <p className="text-xs text-neutral-500">
              Default radius for admin import tool. 
              {config.import_search_radius_m && ` (${(config.import_search_radius_m / 1000).toFixed(1)}km)`}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="importMaxRadius" className="text-neutral-300">
              Import Maximum Radius (meters)
            </Label>
            <Input
              id="importMaxRadius"
              type="number"
              min="10000"
              max="1000000"
              step="1000"
              value={config.import_max_radius_m || 200000}
              onChange={(e) => setConfig({ ...config, import_max_radius_m: parseInt(e.target.value) || 200000 })}
              className="bg-neutral-800 border-neutral-700 text-white"
            />
            <p className="text-xs text-neutral-500">
              Maximum slider limit in import tool (prevents excessive API usage). 
              {config.import_max_radius_m && ` (${(config.import_max_radius_m / 1000).toFixed(1)}km)`}
            </p>
          </div>
        </div>
        
        <div className="bg-blue-950/30 border border-blue-800/50 rounded p-4 text-xs text-blue-200">
          <p className="font-semibold mb-2">💡 Configuration Tips:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Get API keys from <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
            <li>Enable "Places API" and "Maps JavaScript API" for your project</li>
            <li>Restrict public key by HTTP referrers (your domains)</li>
            <li>Restrict server key by IP addresses (your server IPs)</li>
            <li>Larger radii = more API costs. Start conservative.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
